import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { catalogImages, findCatalogProduct, productImages } from '../../../../lib/catalog';
import { deleteCatalogProduct, setStock, setVariantStock } from '../../../../lib/store';
import { removeUnusedImages } from '../../../../lib/uploads';

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, size, color, stock } = (await req.json()) as { id?: string; size?: string; color?: string; stock?: unknown };
    if (!id || !Number.isFinite(Number(stock)) || Number(stock) < 0) {
      return NextResponse.json({ error: 'Dados de estoque inválidos.' }, { status: 400 });
    }

    // Com tamanho e cor o ajuste é da variante; sem eles, o valor é repartido
    // entre a grade inteira, que é o ajuste rápido do painel.
    if (typeof size === 'string' && size.trim() && typeof color === 'string' && color.trim()) {
      const variants = await setVariantStock(id, size, color, Number(stock));
      return NextResponse.json({ variants });
    }

    const product = await findCatalogProduct(id);
    return NextResponse.json({ inventory: await setStock(id, Number(stock), product) });
  } catch {
    return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 403 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Produto não informado.' }, { status: 400 });

    const removed = await findCatalogProduct(String(id));
    await deleteCatalogProduct(id);

    // A falha ao limpar o armazenamento nunca desfaz a exclusão da peça.
    if (removed) {
      try {
        await removeUnusedImages(productImages(removed), await catalogImages());
      } catch {
        console.error(`Não foi possível limpar as fotos da peça ${id}.`);
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 403 });
  }
}
