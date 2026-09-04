import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/store';

export async function POST() {
  await deleteSession((await cookies()).get('rf_session')?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('rf_session', '', { path: '/', maxAge: 0 });
  return res;
}
