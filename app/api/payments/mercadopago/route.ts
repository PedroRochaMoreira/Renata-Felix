import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { sendOrderStatusEmail } from '@/lib/email';
import { checkRateLimit, requestClientKey } from '@/lib/rate-limit';
import { quoteShipping } from '@/lib/shipping';
import { createOrder, OutOfStockError, setOrderPreference, setOrderStatus } from '@/lib/store';
import { defaultProductColor, productColors, productSizes } from '@/lib/product-variants';

export const runtime = 'nodejs';

type CartItem = { id: string; size: string; color?: string; quantity: number };
type Shipping = { id: string | number; name: string; company: string; price: number; deliveryTime?: number; postalCode: string };
type PreferenceResponse = { id?: string; init_point?: string; sandbox_init_point?: string; message?: string; cause?: { description?: string }[] };

class PaymentInputError extends Error {
  constructor(message: string) { super(message); }
}

function baseUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(req.url).origin).replace(/\/$/, '');
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function paymentError(data: PreferenceResponse) {
  return data.cause?.[0]?.description || data.message || 'Não foi possível iniciar o pagamento no momento.';
}

export async function POST(req: Request) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: 'O pagamento seguro ainda não está configurado. Tente novamente mais tarde.' }, { status: 503 });

  let orderId: string | undefined;
  try {
    const user = await requireUser();
    if (!await checkRateLimit(`payment:${user.id}:${requestClientKey(req)}`, 8, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }

    let body: { items?: CartItem[]; shipping?: Shipping };
    try {
      body = await req.json() as { items?: CartItem[]; shipping?: Shipping };
    } catch {
      throw new PaymentInputError('Não foi possível ler os dados do pedido. Atualize a página e tente novamente.');
    }

    if (!Array.isArray(body.items) || !body.items.length) throw new PaymentInputError('A sacola está vazia.');
    if (body.items.length > 30) throw new PaymentInputError('A sacola possui itens demais para uma única compra.');
    if (!body.shipping || body.shipping.id === undefined || !safeString(body.shipping.postalCode, 16)) {
      throw new PaymentInputError('Escolha uma modalidade de entrega antes de pagar.');
    }

    const catalog = await getCatalog();
    const selectedItems: Required<CartItem>[] = [];
    for (const item of body.items) {
      const id = safeString(item?.id, 128);
      const size = safeString(item?.size, 32);
      const requestedColor = safeString(item?.color, 60);
      const quantity = Number(item?.quantity);
      if (!id || !size || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new PaymentInputError('Há uma quantidade ou tamanho inválido na sua sacola.');
      }
      const product = catalog.find(entry => entry.id === id);
      if (!product || product.stock === 0) throw new PaymentInputError('Uma das peças da sua sacola não está mais disponível.');
      const colors = productColors(product);
      const color = requestedColor || defaultProductColor(product);
      if (!colors.includes(color)) throw new PaymentInputError(`A cor selecionada para ${product.name} não está mais disponível.`);
      if (!productSizes(product).includes(size)) throw new PaymentInputError(`O tamanho selecionado para ${product.name} não está mais disponível.`);
      selectedItems.push({ id, size, color, quantity });
    }

    const merged = new Map<string, Required<CartItem>>();
    for (const item of selectedItems) {
      const key = `${item.id}:${item.size}:${item.color}`;
      const current = merged.get(key);
      const totalQuantity = (current?.quantity || 0) + item.quantity;
      if (totalQuantity > 20) throw new PaymentInputError('Limite de 20 unidades por peça e tamanho em cada compra.');
      merged.set(key, { ...item, quantity: totalQuantity });
    }

    const quantitiesByProduct = new Map<string, number>();
    for (const item of merged.values()) quantitiesByProduct.set(item.id, (quantitiesByProduct.get(item.id) || 0) + item.quantity);
    const items = [...merged.values()].map(item => {
      const product = catalog.find(entry => entry.id === item.id);
      if (!product || product.stock === 0) throw new PaymentInputError('Uma das peças da sua sacola não está mais disponível.');
      if (!Number.isFinite(product.price) || product.price <= 0) throw new PaymentInputError('Uma peça da sacola tem um preço inválido. Atualize a página e tente novamente.');
      if ((quantitiesByProduct.get(item.id) || 0) > (product.stock ?? 0)) throw new PaymentInputError(`${product.name} não possui essa quantidade disponível.`);
      return { id: product.id, name: product.name, size: item.size, color: item.color, quantity: item.quantity, unitPrice: product.price };
    });

    const postalCode = safeString(body.shipping.postalCode, 16).replace(/\D/g, '');
    const quotes = await quoteShipping(postalCode, items.map(item => ({ id: item.id, price: item.unitPrice, quantity: item.quantity })));
    const selectedShipping = quotes.find(quote => String(quote.id) === String(body.shipping!.id));
    if (!selectedShipping || !Number.isFinite(selectedShipping.price) || selectedShipping.price < 0) {
      throw new PaymentInputError('A modalidade de entrega selecionada expirou. Calcule o frete novamente.');
    }
    const shipping = { name: selectedShipping.name, company: selectedShipping.company, price: selectedShipping.price, deliveryTime: selectedShipping.deliveryTime };
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + shipping.price;
    if (!Number.isFinite(total) || total <= 0) throw new PaymentInputError('Não foi possível calcular o total do pedido.');

    const order = await createOrder(user.id, { items, shipping, total });
    orderId = order.id;
    const siteUrl = baseUrl(req);
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        external_reference: order.id,
        metadata: { source: 'renata-felix', customer_email: user.email },
        items: [
          ...items.map(item => ({ title: `${item.name} · ${item.color} · ${item.size}`, quantity: item.quantity, unit_price: item.unitPrice, currency_id: 'BRL' })),
          { title: `Entrega · ${shipping.company} ${shipping.name}`, quantity: 1, unit_price: shipping.price, currency_id: 'BRL' },
        ],
        payer: { email: user.email },
        back_urls: {
          success: `${siteUrl}/checkout?status=success&order=${order.id}`,
          failure: `${siteUrl}/checkout?status=failure&order=${order.id}`,
          pending: `${siteUrl}/checkout?status=pending&order=${order.id}`,
        },
        notification_url: `${siteUrl}/api/payments/mercadopago/webhook`,
        // O link morre bem antes de a reserva de estoque ser devolvida
        // (60 min, ver reservationMinutes em lib/store.ts), para que ninguém
        // pague por uma peça que a loja já recolocou na vitrine.
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        auto_return: 'approved',
        payment_methods: { installments: 6 },
      }),
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as PreferenceResponse;
    if (!response.ok || !data.id || !(data.init_point || data.sandbox_init_point)) {
      await setOrderStatus(order.id, 'CANCELLED');
      return NextResponse.json({ error: paymentError(data) }, { status: response.status >= 500 ? 502 : 400 });
    }
    const saved = await setOrderPreference(order.id, data.id);
    if (!saved) {
      await setOrderStatus(order.id, 'CANCELLED');
      return NextResponse.json({ error: 'Não foi possível preparar seu pedido. Tente novamente.' }, { status: 502 });
    }

    // A indisponibilidade do serviço de e-mail nunca bloqueia o checkout.
    try {
      await sendOrderStatusEmail({ to: user.email, name: user.name, order, baseUrl: siteUrl });
    } catch {
      console.error(`Não foi possível enviar a confirmação do pedido ${order.id}.`);
    }
    return NextResponse.json({ checkoutUrl: data.init_point || data.sandbox_init_point, orderId: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível conectar ao Mercado Pago.';
    const status = error instanceof PaymentInputError || error instanceof OutOfStockError ? 400 : message === 'Não autorizado' ? 401 : 502;
    if (orderId) await setOrderStatus(orderId, 'CANCELLED').catch(() => undefined);
    return NextResponse.json({ error: status === 502 ? 'Não foi possível iniciar o pagamento no momento. Tente novamente em instantes.' : message }, { status });
  }
}
