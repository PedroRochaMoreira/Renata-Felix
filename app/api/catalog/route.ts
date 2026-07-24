import { NextResponse } from 'next/server';
import { getCatalog } from '../../../lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ products: await getCatalog() }, { headers: { 'Cache-Control': 'no-store' } });
}
