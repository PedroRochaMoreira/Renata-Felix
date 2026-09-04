import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog';
import { checkRateLimit, requestClientKey } from '@/lib/rate-limit';
import { quoteShipping, ShippingInputError, ShippingUnavailableError } from '@/lib/shipping';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!await checkRateLimit(`shipping:${requestClientKey(req)}`, 12, 10 * 60 * 1000)) {
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
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new ShippingInputError('Há uma peça inválida na sua sacola.');
      merged.set(id, (merged.get(id) || 0) + quantity);
    }
    const secureItems = [...merged].map(([id, quantity]) => {
      const product = catalog.find(entry => entry.id === id);
      if (!product || product.stock === 0 || quantity > (product.stock ?? 0)) throw new ShippingInputError('Uma peça da sua sacola não está mais disponível na quantidade escolhida.');
      return { id: product.id, price: product.price, quantity };
    });
    return NextResponse.json({ quotes: await quoteShipping(String(postalCode || ''), secureItems) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Só mensagens escritas para a cliente chegam até ela. Qualquer outra falha
    // vira um aviso genérico, com o diagnóstico no log — antes o texto do erro
    // era repassado direto e expunha variáveis de ambiente na tela.
    if (error instanceof ShippingInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const detalhe = error instanceof ShippingUnavailableError ? error.detail
      : error instanceof Error ? error.message : String(error);
    console.error(`Cálculo de frete indisponível: ${detalhe}`);
    return NextResponse.json({ error: 'O cálculo de frete está indisponível no momento. Fale com a loja para combinar a entrega.' }, { status: 503 });
  }
}
