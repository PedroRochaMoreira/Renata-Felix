import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { imageStorageStatus, listProductImages, removeProductImage } from '@/lib/uploads';

const denied = () => NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 403 });

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ images: await listProductImages(), storage: imageStorageStatus() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return denied(); }
}

/**
 * Apaga uma foto do armazenamento. Uma imagem ainda usada por alguma peça é
 * recusada: sem isso o painel deixaria produtos publicados sem foto.
 */
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { url } = await req.json() as { url?: string };
    const image = typeof url === 'string' ? url.trim() : '';
    if (!image) return NextResponse.json({ error: 'Foto não informada.' }, { status: 400 });

    const emUso = (await getCatalog()).find(product => product.img === image || product.images?.includes(image));
    if (emUso) return NextResponse.json({ error: `Esta foto está em uso por “${emUso.name}”. Troque a foto da peça antes de apagar.` }, { status: 409 });

    await removeProductImage(image);
    return NextResponse.json({ ok: true, images: await listProductImages() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível apagar a foto.';
    return message === 'Não autorizado' ? denied() : NextResponse.json({ error: message }, { status: 400 });
  }
}
