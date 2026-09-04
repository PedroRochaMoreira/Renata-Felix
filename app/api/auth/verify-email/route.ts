import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/store';
export async function POST(req: Request) { try { const { token } = await req.json(); return NextResponse.json({ user: await verifyEmailToken(String(token || '')) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível confirmar o e-mail.' }, { status: 400 }); } }
