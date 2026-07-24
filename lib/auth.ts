import { cookies } from 'next/headers';
import { userFromToken } from './store';

export async function currentUser() { return await userFromToken((await cookies()).get('rf_session')?.value); }
export async function requireUser() { const user = await currentUser(); if (!user) throw new Error('Não autorizado'); return user; }
export async function requireAdmin() { const user = await requireUser(); if (user.role !== 'ADMIN') throw new Error('Não autorizado'); return user; }
