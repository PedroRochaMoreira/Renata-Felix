import { NextResponse } from 'next/server';
import { subscribe } from '../../../lib/store';
export async function POST(req: Request) { try { const { email } = await req.json(); subscribe(String(email || '')); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível cadastrar seu e-mail.' }, { status: 400 }); } }
