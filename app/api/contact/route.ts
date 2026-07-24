import { NextResponse } from 'next/server';
import { createContactMessage } from '../../../lib/store';
export async function POST(req: Request) { try { const body = await req.json(); createContactMessage(body); return NextResponse.json({ ok: true }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.' }, { status: 400 }); } }
