import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { featured, setFeatured } from '../../../../lib/store';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ ids: await featured() }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { ids } = await req.json();
    await setFeatured(Array.isArray(ids) ? ids : []);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Acesso administrativo necessário.' }, { status: 403 });
  }
}
