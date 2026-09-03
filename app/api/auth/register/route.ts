import { NextResponse } from 'next/server';
import { createUser, issueEmailVerification, makeSession, publicUser } from '../../../../lib/store';
import { escapeHtml, sendEmail } from '../../../../lib/email';
import { checkRateLimit, requestClientKey } from '../../../../lib/rate-limit';

export async function POST(req: Request) {
  try {
    if (!await checkRateLimit(`register:${requestClientKey(req)}`, 5, 60 * 60 * 1000))
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos para criar uma conta.' }, { status: 429 });
    const { name, email, password } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Preencha todos os dados.' }, { status: 400 });
    const user = await createUser(String(name), String(email), String(password));
    const verification = await issueEmailVerification(user.id);
    const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
    await sendEmail({
      to: verification.email,
      subject: 'Confirme seu e-mail — Renata Felix',
      text: `Olá, ${verification.name}. Confirme seu e-mail: ${base}/verificar-email?token=${verification.token}`,
      html: `<p>Olá, ${escapeHtml(verification.name)}.</p><p>Para confirmar seu e-mail e proteger sua conta, <a href="${base}/verificar-email?token=${verification.token}">clique aqui</a>.</p><p>O link expira em 24 horas.</p>`,
    });
    const res = NextResponse.json({
      user: publicUser(user),
      verificationEmailSent: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    });
    res.cookies.set('rf_session', await makeSession(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível criar a conta.' }, { status: 400 });
  }
}
