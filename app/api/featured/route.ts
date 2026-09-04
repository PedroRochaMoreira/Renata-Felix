import { NextResponse } from 'next/server';
import { featured } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** Leitura pública das peças em destaque, usada pela vitrine da home. */
export async function GET() {
  try {
    return NextResponse.json({ ids: await featured() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ids: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
