import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { issueEmailVerification } from '../../../../lib/store';
import { escapeHtml, sendEmail } from '../../../../lib/email';
import { checkRateLimit, requestClientKey } from '../../../../lib/rate-limit';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!(await checkRateLimit(`verify-email:${user.id}:${requestClientKey(req)}`, 3, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Aguarde alguns minutos antes de solicitar outro link.' }, { status: 429 });
    }
    const verification = await issueEmailVerification(user.id);
    const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(req.url).origin).replace(/\/$/, '');
    const result = await sendEmail({
      to: verification.email,
      subject: 'Confirme seu e-mail — Renata Felix',
      text: `Olá, ${verification.name}. Confirme seu e-mail: ${base}/verificar-email?token=${verification.token}`,
      html: `<p>Olá, ${escapeHtml(verification.name)}.</p><p><a href="${base}/verificar-email?token=${verification.token}">Confirme seu e-mail</a>.</p><p>O link expira em 24 horas.</p>`,
    });
    return NextResponse.json({ ok: true, emailSent: result.sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reenviar.';
    return NextResponse.json({ error: message }, { status: message === 'Não autorizado' ? 401 : 400 });
  }
}
