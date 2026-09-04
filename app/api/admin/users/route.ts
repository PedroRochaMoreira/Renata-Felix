import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { promoteAdmin } from '../../../../lib/store';
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { email } = await req.json();
    return NextResponse.json({ user: await promoteAdmin(String(email || '')) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Acesso administrativo necessário.' }, { status: 403 });
  }
}
