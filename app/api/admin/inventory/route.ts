import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { catalogImages, findCatalogProduct, productImages } from '../../../../lib/catalog';
import { deleteCatalogProduct, setStock } from '../../../../lib/store';
import { removeUnusedImages } from '../../../../lib/uploads';

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, stock } = await req.json();
    if (!id || !Number.isFinite(Number(stock))) {
      return NextResponse.json({ error: 'Dados de estoque inválidos.' }, { status: 400 });
    }
    return NextResponse.json({ inventory: await setStock(id, Number(stock)) });
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
