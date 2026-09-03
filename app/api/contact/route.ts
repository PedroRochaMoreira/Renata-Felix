import { NextResponse } from 'next/server';
import { createContactMessage } from '../../../lib/store';
import { escapeHtml, sendEmail } from '../../../lib/email';
import { checkRateLimit, requestClientKey } from '../../../lib/rate-limit';

export async function POST(req: Request) {
  try {
    if (!await checkRateLimit(`contact:${requestClientKey(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Recebemos muitas mensagens deste endereço. Aguarde alguns minutos para tentar novamente.' },
        { status: 429 },
      );
    }
    const body = (await req.json()) as { name?: string; email?: string; subject?: string; message?: string };
    await createContactMessage({
      name: String(body.name || ''),
      email: String(body.email || ''),
      subject: String(body.subject || ''),
      message: String(body.message || ''),
    });
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (adminEmail) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `Novo contato: ${String(body.subject || '').trim()}`,
          text: `Nome: ${String(body.name || '').trim()}\nE-mail: ${String(body.email || '').trim()}\n\n${String(body.message || '').trim()}`,
          html: `<p><strong>Nome:</strong> ${escapeHtml(String(body.name || '').trim())}<br/><strong>E-mail:</strong> ${escapeHtml(String(body.email || '').trim())}</p><p>${escapeHtml(String(body.message || '').trim()).replace(/\n/g, '<br/>')}</p>`,
        });
      } catch {
        // A mensagem já foi preservada no banco mesmo se o e-mail não estiver disponível.
      }
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.' }, { status: 400 });
  }
}
