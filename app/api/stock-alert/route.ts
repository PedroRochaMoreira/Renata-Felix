import { NextResponse } from 'next/server';
import { findCatalogProduct } from '../../../lib/catalog';
import { checkRateLimit, requestClientKey } from '../../../lib/rate-limit';
import { createStockAlert } from '../../../lib/store';
import { normalizeColor, normalizeSize, variantStock } from '../../../lib/variants';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!(await checkRateLimit(`stock-alert:${requestClientKey(req)}`, 10, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Aguarde alguns minutos antes de pedir outro aviso.' }, { status: 429 });
    }

    const body = (await req.json()) as { id?: string; size?: string; color?: string; email?: string };
    const id = String(body.id || '')
      .trim()
      .slice(0, 128);
    const size = normalizeSize(String(body.size || '').slice(0, 32));
    const color = normalizeColor(String(body.color || '').slice(0, 60));

    const product = await findCatalogProduct(id);
    if (!product) return NextResponse.json({ error: 'Peça não encontrada.' }, { status: 404 });
    if (variantStock(product.variants || [], size, color) > 0) {
      return NextResponse.json(
        { error: 'Esta combinação já está disponível. Atualize a página para adicionar à sacola.' },
        { status: 409 },
      );
    }

    await createStockAlert(id, size, color, String(body.email || ''));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível registrar o aviso.' }, { status: 400 });
  }
}
