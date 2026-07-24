import { NextResponse } from 'next/server';
import { getCatalog } from '../../../../lib/catalog';
import { checkRateLimit, requestClientKey } from '../../../../lib/rate-limit';
import { quoteShipping } from '../../../../lib/shipping';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(`shipping:${requestClientKey(req)}`, 12, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitas consultas de frete. Aguarde alguns minutos antes de tentar novamente.' }, { status: 429 });
    }
    const { postalCode, items } = await req.json() as { postalCode?: string; items?: { id: string; quantity: number }[] };
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'A sacola está vazia.' }, { status: 400 });
    if (items.length > 30) return NextResponse.json({ error: 'Há itens demais na sacola para calcular o frete.' }, { status: 400 });
    const catalog = await getCatalog();
    const merged = new Map<string, number>();
    for (const item of items) {
      const id = typeof item?.id === 'string' ? item.id.trim().slice(0, 128) : '';
      const quantity = Number(item?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Há uma peça inválida na sua sacola.');
      merged.set(id, (merged.get(id) || 0) + quantity);
    }
    const secureItems = [...merged].map(([id, quantity]) => {
      const product = catalog.find(entry => entry.id === id);
      if (!product || product.stock === 0 || quantity > (product.stock ?? 0)) throw new Error('Uma peça da sua sacola não está mais disponível na quantidade escolhida.');
      return { id: product.id, price: product.price, quantity };
    });
    return NextResponse.json({ quotes: await quoteShipping(String(postalCode || ''), secureItems) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível calcular o frete.';
    return NextResponse.json({ error: message }, { status: message.includes('Configure') ? 503 : 400 });
  }
}
