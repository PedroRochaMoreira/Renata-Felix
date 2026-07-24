import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { getCatalog } from '../../../../lib/catalog';
import { quoteShipping } from '../../../../lib/shipping';
import { createOrder, setOrderPreference } from '../../../../lib/store';

type CartItem = { id: string; size: string; quantity: number };
type Shipping = { id: string | number; name: string; company: string; price: number; deliveryTime?: number; postalCode: string };

export async function POST(req: Request) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'Configure MERCADO_PAGO_ACCESS_TOKEN no .env para ativar os pagamentos.' }, { status: 503 });

  try {
    const user = await requireUser();
    const body = await req.json() as { items?: CartItem[]; shipping?: Shipping };
    if (!Array.isArray(body.items) || !body.items.length) return NextResponse.json({ error: 'A sacola está vazia.' }, { status: 400 });
    if (!body.shipping || body.shipping.id === undefined || !body.shipping.postalCode) return NextResponse.json({ error: 'Escolha uma modalidade de entrega antes de pagar.' }, { status: 400 });

    const catalog = getCatalog();
    const merged = new Map<string, CartItem>();
    for (const item of body.items) {
      if (!item || typeof item.id !== 'string' || typeof item.size !== 'string' || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) return NextResponse.json({ error: 'Há uma quantidade inválida na sacola.' }, { status: 400 });
      const key = `${item.id}:${item.size}`;
      const current = merged.get(key);
      merged.set(key, { ...item, quantity: (current?.quantity || 0) + Number(item.quantity) });
    }
    const items = [...merged.values()].map(item => {
      const product = catalog.find(entry => entry.id === item.id);
      if (!product || product.stock === 0) throw new Error('Uma das peças da sua sacola não está mais disponível.');
      if (item.quantity > (product.stock ?? 0)) throw new Error(`${product.name} não possui essa quantidade disponível.`);
      const sizes = product.sizes?.length ? product.sizes : ['PP', 'P', 'M', 'G', 'GG'];
      if (!sizes.includes(item.size)) throw new Error(`O tamanho selecionado para ${product.name} não está mais disponível.`);
      return { id: product.id, name: product.name, size: item.size, quantity: item.quantity, unitPrice: product.price };
    });
    const quotes = await quoteShipping(body.shipping.postalCode, items.map(item => ({ id: item.id, price: item.unitPrice, quantity: item.quantity })));
    const selectedShipping = quotes.find(quote => String(quote.id) === String(body.shipping!.id));
    if (!selectedShipping) return NextResponse.json({ error: 'A modalidade de entrega selecionada expirou. Calcule o frete novamente.' }, { status: 400 });
    const shipping = { name: selectedShipping.name, company: selectedShipping.company, price: selectedShipping.price, deliveryTime: selectedShipping.deliveryTime };
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + shipping.price;
    const order = createOrder(user.id, { items, shipping, total });
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_reference: order.id,
        items: [
          ...items.map(item => ({ title: `${item.name} · ${item.size}`, quantity: item.quantity, unit_price: item.unitPrice, currency_id: 'BRL' })),
          { title: `Entrega · ${shipping.company} ${shipping.name}`, quantity: 1, unit_price: shipping.price, currency_id: 'BRL' },
        ],
        payer: { email: user.email },
        back_urls: { success: `${base}/checkout?status=success&order=${order.id}`, failure: `${base}/checkout?status=failure&order=${order.id}`, pending: `${base}/checkout?status=pending&order=${order.id}` },
        notification_url: `${base}/api/payments/mercadopago/webhook`,
        auto_return: 'approved',
        payment_methods: { installments: 6 },
      }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.message || 'Não foi possível iniciar o pagamento.' }, { status: 400 });
    setOrderPreference(order.id, data.id);
    return NextResponse.json({ checkoutUrl: data.init_point, orderId: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível conectar ao Mercado Pago.';
    return NextResponse.json({ error: message }, { status: message === 'Não autorizado' ? 401 : 502 });
  }
}
