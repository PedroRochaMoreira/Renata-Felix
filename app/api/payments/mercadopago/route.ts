import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { getCatalog } from '../../../../lib/catalog';
import { sendOrderStatusEmail } from '../../../../lib/email';
import { checkRateLimit, requestClientKey } from '../../../../lib/rate-limit';
import { quoteShipping } from '../../../../lib/shipping';
import { createOrder, releaseStock, reserveStock, setOrderPreference, setOrderStatus } from '../../../../lib/store';
import { defaultProductColor, productColors, productSizes } from '../../../../lib/product-variants';
import { normalizeColor, normalizeSize, variantKey, variantStock } from '../../../../lib/variants';
import { isPaymentMethod, orderTotals, unitPriceFor, type PaymentMethod } from '../../../../lib/pricing';

export const runtime = 'nodejs';

type CartItem = { id: string; size: string; color?: string; quantity: number };
type Shipping = { id: string | number; name: string; company: string; price: number; deliveryTime?: number; postalCode: string };
type PreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  cause?: { description?: string }[];
};

class PaymentInputError extends Error {
  constructor(message: string) {
    super(message);
  }
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
  if (!token)
    return NextResponse.json({ error: 'O pagamento seguro ainda não está configurado. Tente novamente mais tarde.' }, { status: 503 });

  let orderId: string | undefined;
  let reservedItems: { id: string; size: string; color?: string; quantity: number }[] = [];
  try {
    const user = await requireUser();
    if (!(await checkRateLimit(`payment:${user.id}:${requestClientKey(req)}`, 8, 10 * 60 * 1000))) {
      return NextResponse.json({ error: 'Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.' }, { status: 429 });
    }

    let body: { items?: CartItem[]; shipping?: Shipping; paymentMethod?: unknown };
    try {
      body = (await req.json()) as { items?: CartItem[]; shipping?: Shipping; paymentMethod?: unknown };
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
      const size = normalizeSize(safeString(item?.size, 32));
      const requestedColor = normalizeColor(safeString(item?.color, 60));
      const quantity = Number(item?.quantity);
      if (!id || !size || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new PaymentInputError('Há uma quantidade ou tamanho inválido na sua sacola.');
      }
      const product = catalog.find(entry => entry.id === id);
      if (!product || product.stock === 0) throw new PaymentInputError('Uma das peças da sua sacola não está mais disponível.');
      const colors = productColors(product).map(normalizeColor);
      const color = requestedColor || normalizeColor(defaultProductColor(product));
      if (!colors.includes(color)) throw new PaymentInputError(`A cor selecionada para ${product.name} não está mais disponível.`);
      if (!productSizes(product).includes(size))
        throw new PaymentInputError(`O tamanho selecionado para ${product.name} não está mais disponível.`);
      selectedItems.push({ id, size, color, quantity });
    }

    const merged = new Map<string, Required<CartItem>>();
    for (const item of selectedItems) {
      const key = `${item.id}:${variantKey(item.size, item.color)}`;
      const current = merged.get(key);
      const totalQuantity = (current?.quantity || 0) + item.quantity;
      if (totalQuantity > 20) throw new PaymentInputError('Limite de 20 unidades por peça e tamanho em cada compra.');
      merged.set(key, { ...item, quantity: totalQuantity });
    }

    // A conferência é por tamanho e cor: somar apenas por peça deixava passar
    // um pedido de um tamanho esgotado enquanto outro ainda tinha estoque.
    const quantitiesByVariant = new Map<string, number>();
    for (const item of merged.values()) {
      const key = `${item.id}:${variantKey(item.size, item.color)}`;
      quantitiesByVariant.set(key, (quantitiesByVariant.get(key) || 0) + item.quantity);
    }
    const items = [...merged.values()].map(item => {
      const product = catalog.find(entry => entry.id === item.id);
      if (!product || product.stock === 0) throw new PaymentInputError('Uma das peças da sua sacola não está mais disponível.');
      if (!Number.isFinite(product.price) || product.price <= 0)
        throw new PaymentInputError('Uma peça da sacola tem um preço inválido. Atualize a página e tente novamente.');
      const available = variantStock(product.variants || [], item.size, item.color);
      const wanted = quantitiesByVariant.get(`${item.id}:${variantKey(item.size, item.color)}`) || 0;
      if (wanted > available) {
        throw new PaymentInputError(
          available === 0
            ? `${product.name} na cor ${item.color} e tamanho ${item.size} acabou de esgotar.`
            : `${product.name} na cor ${item.color} tem apenas ${available} peça(s) no tamanho ${item.size}.`,
        );
      }
      return { id: product.id, name: product.name, size: item.size, color: item.color, quantity: item.quantity, unitPrice: product.price };
    });

    const postalCode = safeString(body.shipping.postalCode, 16).replace(/\D/g, '');
    const quotes = await quoteShipping(
      postalCode,
      items.map(item => ({ id: item.id, price: item.unitPrice, quantity: item.quantity })),
    );
    const selectedShipping = quotes.find(quote => String(quote.id) === String(body.shipping!.id));
    if (!selectedShipping || !Number.isFinite(selectedShipping.price) || selectedShipping.price < 0) {
      throw new PaymentInputError('A modalidade de entrega selecionada expirou. Calcule o frete novamente.');
    }
    const shipping = {
      name: selectedShipping.name,
      company: selectedShipping.company,
      price: selectedShipping.price,
      deliveryTime: selectedShipping.deliveryTime,
    };
    const paymentMethod: PaymentMethod = isPaymentMethod(body.paymentMethod) ? body.paymentMethod : 'OTHER';
    const totals = orderTotals(items, shipping.price, paymentMethod);
    if (!Number.isFinite(totals.total) || totals.total <= 0) throw new PaymentInputError('Não foi possível calcular o total do pedido.');

    // A reserva vem antes do pedido: é o banco que decide quem ficou com a
    // última peça, não a leitura do catálogo feita alguns instantes atrás.
    const reserved = await reserveStock(items);
    if (reserved) reservedItems = items;
    if (!reserved)
      throw new PaymentInputError(
        'Uma das peças da sua sacola acabou de ser reservada por outra cliente. Revise a sacola e tente novamente.',
      );

    const order = await createOrder(user.id, {
      items,
      shipping,
      paymentMethod,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
    });
    orderId = order.id;
    const siteUrl = baseUrl(req);
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        external_reference: order.id,
        metadata: { source: 'renata-felix', customer_email: user.email },
        items: [
          ...items.map(item => ({
            title: `${item.name} · ${item.color} · ${item.size}`,
            quantity: item.quantity,
            unit_price: unitPriceFor(item.unitPrice, paymentMethod),
            currency_id: 'BRL',
          })),
          { title: `Entrega · ${shipping.company} ${shipping.name}`, quantity: 1, unit_price: shipping.price, currency_id: 'BRL' },
        ],
        payer: { email: user.email },
        back_urls: {
          success: `${siteUrl}/checkout?status=success&order=${order.id}`,
          failure: `${siteUrl}/checkout?status=failure&order=${order.id}`,
          pending: `${siteUrl}/checkout?status=pending&order=${order.id}`,
        },
        notification_url: `${siteUrl}/api/payments/mercadopago/webhook`,
        auto_return: 'approved',
        // O preço enviado já é o do método escolhido, então a preferência
        // libera apenas esse método: sem isso a cliente poderia pagar no PIX
        // o valor cheio, ou no cartão o valor com desconto de PIX.
        payment_methods:
          paymentMethod === 'PIX'
            ? {
                installments: 1,
                excluded_payment_types: [
                  { id: 'credit_card' },
                  { id: 'debit_card' },
                  { id: 'ticket' },
                  { id: 'atm' },
                  { id: 'account_money' },
                ],
              }
            : { installments: 6, excluded_payment_types: [{ id: 'bank_transfer' }] },
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
    const status = error instanceof PaymentInputError ? 400 : message === 'Não autorizado' ? 401 : 502;
    // Cancelar o pedido já devolve a reserva. Quando a falha acontece antes de
    // o pedido existir, a devolução precisa ser feita aqui.
    if (orderId) await setOrderStatus(orderId, 'CANCELLED').catch(() => undefined);
    else if (reservedItems.length) await releaseStock(reservedItems).catch(() => undefined);
    return NextResponse.json(
      { error: status === 502 ? 'Não foi possível iniciar o pagamento no momento. Tente novamente em instantes.' : message },
      { status },
    );
  }
}
