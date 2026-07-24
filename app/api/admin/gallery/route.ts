import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { imageStorageStatus, listProductImages } from '../../../../lib/uploads';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ images: await listProductImages(), storage: imageStorageStatus() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 403 });
  }
}
