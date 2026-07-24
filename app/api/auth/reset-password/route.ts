import { NextResponse } from 'next/server';
import { resetPassword } from '../../../../lib/store';
import { checkRateLimit, requestClientKey } from '../../../../lib/rate-limit';
export async function POST(req: Request) { try { if (!checkRateLimit(`reset-confirm:${requestClientKey(req)}`, 6, 60 * 60 * 1000)) return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 }); const { token, password } = await req.json(); await resetPassword(String(token || ''), String(password || '')); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível redefinir a senha.' }, { status: 400 }); } }
