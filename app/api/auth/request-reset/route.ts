import { NextResponse } from 'next/server';
import { issuePasswordReset } from '@/lib/store';
import { escapeHtml, sendEmail } from '@/lib/email';
import { checkRateLimit, requestClientKey } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const message = 'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.';
  try {
    if (!await checkRateLimit(`password-reset:${requestClientKey(req)}`, 4, 60 * 60 * 1000)) return NextResponse.json({ message });
    const { email } = await req.json(); const reset = await issuePasswordReset(String(email || ''));
    if (reset) {
      const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
      await sendEmail({ to: reset.email, subject: 'Redefina sua senha — Renata Felix', text: `Olá, ${reset.name}. Redefina sua senha: ${base}/redefinir-senha?token=${reset.token}`, html: `<p>Olá, ${escapeHtml(reset.name)}.</p><p>Para criar uma nova senha, <a href="${base}/redefinir-senha?token=${reset.token}">clique aqui</a>.</p><p>O link expira em 30 minutos.</p>` });
    }
    return NextResponse.json({ message });
  } catch { return NextResponse.json({ message }); }
}
