import { NextResponse } from 'next/server';
import { getCatalog } from '../../../../lib/catalog';
import { checkRateLimit, requestClientKey } from '../../../../lib/rate-limit';
import { quoteShipping } from '../../../../lib/shipping';
import { normalizeColor, normalizeSize, variantKey, variantStock } from '../../../../lib/variants';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!await checkRateLimit(`shipping:${requestClientKey(req)}`, 12, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Muitas consultas de frete. Aguarde alguns minutos antes de tentar novamente.' }, { status: 429 });
    }
    const { postalCode, items } = (await req.json()) as {
      postalCode?: string;
      items?: { id: string; size?: string; color?: string; quantity: number }[];
    };
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'A sacola está vazia.' }, { status: 400 });
    if (items.length > 30) return NextResponse.json({ error: 'Há itens demais na sacola para calcular o frete.' }, { status: 400 });
    const catalog = await getCatalog();

    // O frete é cotado pelo que a cliente consegue realmente comprar, então a
    // disponibilidade é conferida por tamanho e cor, não pela peça inteira.
    const byVariant = new Map<string, { id: string; size: string; color: string; quantity: number }>();
    for (const item of items) {
      const id = typeof item?.id === 'string' ? item.id.trim().slice(0, 128) : '';
      const size = normalizeSize(typeof item?.size === 'string' ? item.size.slice(0, 32) : '');
      const color = normalizeColor(typeof item?.color === 'string' ? item.color.slice(0, 60) : '');
      const quantity = Number(item?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('Há uma peça inválida na sua sacola.');
      const key = `${id}:${variantKey(size, color)}`;
      const current = byVariant.get(key);
      byVariant.set(key, { id, size, color, quantity: (current?.quantity || 0) + quantity });
    }

    const byProduct = new Map<string, number>();
    for (const item of byVariant.values()) {
      const product = catalog.find(entry => entry.id === item.id);
      if (!product || product.stock === 0) throw new Error('Uma peça da sua sacola não está mais disponível na quantidade escolhida.');
      // Sem tamanho informado a conferência recai sobre o total da peça, o que
      // mantém sacolas salvas antes da grade de variantes funcionando.
      const available = item.size ? variantStock(product.variants || [], item.size, item.color) : (product.stock ?? 0);
      if (item.quantity > available) throw new Error('Uma peça da sua sacola não está mais disponível na quantidade escolhida.');
      byProduct.set(item.id, (byProduct.get(item.id) || 0) + item.quantity);
    }

    const secureItems = [...byProduct].map(([id, quantity]) => {
      const product = catalog.find(entry => entry.id === id)!;
      return { id: product.id, price: product.price, quantity };
    });
    return NextResponse.json(
      { quotes: await quoteShipping(String(postalCode || ''), secureItems) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível calcular o frete.';
    return NextResponse.json({ error: message }, { status: message.includes('Configure') ? 503 : 400 });
  }
}
