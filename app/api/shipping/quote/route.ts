import { NextResponse } from 'next/server';
import { getCatalog } from '../../../../lib/catalog';
import { quoteShipping } from '../../../../lib/shipping';

export async function POST(req: Request) {
  try {
    const { postalCode, items } = await req.json() as { postalCode?: string; items?: { id: string; quantity: number }[] };
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'A sacola está vazia.' }, { status: 400 });
    const catalog = getCatalog();
    const secureItems = items.map(item => {
      const product = catalog.find(entry => entry.id === item.id);
      if (!product || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) throw new Error('Há uma peça inválida na sua sacola.');
      return { id: product.id, price: product.price, quantity: Number(item.quantity) };
    });
    return NextResponse.json({ quotes: await quoteShipping(String(postalCode || ''), secureItems) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível calcular o frete.';
    return NextResponse.json({ error: message }, { status: message.includes('Configure') ? 503 : 400 });
  }
}
