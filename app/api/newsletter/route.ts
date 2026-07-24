import { NextResponse } from 'next/server';
import { subscribe } from '../../../lib/store';
import { sendEmail } from '../../../lib/email';
import { checkRateLimit, requestClientKey } from '../../../lib/rate-limit';

export async function POST(req: Request) {
  try {
    if (!checkRateLimit(`newsletter:${requestClientKey(req)}`, 8, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Aguarde alguns minutos antes de fazer outro cadastro.' }, { status: 429 });
    }
    const { email } = await req.json();
    const recipient = String(email || '').trim().toLowerCase();
    await subscribe(recipient);
    try {
      await sendEmail({
        to: recipient,
        subject: 'Bem-vinda à Carta Renata Felix',
        text: 'Obrigada por se aproximar da Renata Felix. Em breve você receberá nossas novidades e escolhas especiais.',
        html: '<p>Obrigada por se aproximar da <strong>Renata Felix</strong>.</p><p>Em breve você receberá nossas novidades e escolhas especiais.</p>',
      });
    } catch {
      // O cadastro continua salvo quando o provedor de e-mail estiver indisponível.
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível cadastrar seu e-mail.' }, { status: 400 });
  }
}
