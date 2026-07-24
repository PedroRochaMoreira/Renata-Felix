import { NextResponse } from 'next/server';
import { requireUser } from '../../../lib/auth';
import { ordersForUser, publicUser, updateUserProfile, type Address } from '../../../lib/store';

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ user: publicUser(user), orders: ordersForUser(user.id) });
  } catch {
    return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json() as { name?: string; email?: string; address?: Address };
    return NextResponse.json({ user: updateUserProfile(user.id, body) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível atualizar seus dados.' }, { status: 400 });
  }
}
