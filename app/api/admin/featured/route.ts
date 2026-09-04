import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { featured, setFeatured } from '@/lib/store';

export const dynamic = 'force-dynamic';

const denied = () => NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 403 });

// A leitura pública vive em /api/featured; aqui tudo exige sessão de administrador.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ ids: await featured() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return denied(); }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { ids } = await req.json();
    await setFeatured(Array.isArray(ids) ? ids : []);
    return NextResponse.json({ ok: true });
  } catch { return denied(); }
}
