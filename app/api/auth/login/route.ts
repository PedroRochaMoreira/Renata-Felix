import { NextResponse } from 'next/server';
import { makeSession, publicUser, validateUser } from '@/lib/store';
import { checkRateLimit, requestClientKey } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const key = `login:${requestClientKey(req)}`;
    if (!await checkRateLimit(key, 10, 15 * 60 * 1000)) return NextResponse.json({ error: 'Muitas tentativas de acesso. Tente novamente em alguns minutos.' }, { status: 429 });
    const { email, password } = await req.json(); const user = await validateUser(email, password);
    if (!user) return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
    const res = NextResponse.json({ user: publicUser(user) });
    res.cookies.set('rf_session', await makeSession(user.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 14 });
    return res;
  } catch { return NextResponse.json({ error: 'Não foi possível iniciar a sessão.' }, { status: 400 }); }
}
