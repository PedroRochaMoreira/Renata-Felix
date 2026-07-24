import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { favoritesForUser, setFavoritesForUser } from '../../../../lib/store';
export async function GET() { try { const user = await requireUser(); return NextResponse.json({ favorites: await favoritesForUser(user.id) }); } catch { return NextResponse.json({ favorites: [] }, { status: 401 }); } }
export async function PUT(req: Request) { try { const user = await requireUser(); const { favorites } = await req.json(); if (!Array.isArray(favorites)) throw new Error('Dados inválidos.'); return NextResponse.json({ favorites: await setFavoritesForUser(user.id, favorites) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Entre na sua conta para continuar.' }, { status: 401 }); } }
