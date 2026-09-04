import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ products: await getCatalog() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Melhor a vitrine avisar que está indisponível do que devolver peças que
    // o checkout não conseguiria honrar.
    return NextResponse.json({ error: 'A vitrine está indisponível no momento. Tente novamente em instantes.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
