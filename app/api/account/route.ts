import { NextResponse } from 'next/server';
import { requireUser } from '../../../lib/auth';
import { issueEmailVerification, ordersForUser, publicUser, updateUserProfile, type Address } from '../../../lib/store';
import { escapeHtml, sendEmail } from '../../../lib/email';

function siteUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(req.url).origin).replace(/\/$/, '');
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(
      { user: publicUser(user), orders: await ordersForUser(user.id) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const current = await requireUser();
    const body = (await req.json()) as { name?: string; email?: string; address?: Address };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const emailChanged = Boolean(email && email !== current.email);
    const user = await updateUserProfile(current.id, body);
    let verificationEmailSent = false;

    if (emailChanged) {
      const verification = await issueEmailVerification(current.id);
      const base = siteUrl(req);
      try {
        const result = await sendEmail({
          to: verification.email,
          subject: 'Confirme seu novo e-mail — Renata Felix',
          text: `Olá, ${verification.name}. Confirme seu novo e-mail: ${base}/verificar-email?token=${verification.token}`,
          html: `<p>Olá, ${escapeHtml(verification.name)}.</p><p>Para confirmar seu novo e-mail, <a href="${base}/verificar-email?token=${verification.token}">clique aqui</a>.</p><p>O link expira em 24 horas.</p>`,
        });
        verificationEmailSent = result.sent;
      } catch {
        // A alteração do perfil continua válida mesmo se o provedor de e-mail estiver indisponível.
      }
    }

    return NextResponse.json({ user, verificationEmailSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar seus dados.';
    return NextResponse.json({ error: message }, { status: message === 'Não autorizado' ? 401 : 400 });
  }
}
