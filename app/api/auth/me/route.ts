import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { publicUser } from '@/lib/store';
export async function GET() { const user = await currentUser(); return NextResponse.json({ user: user ? publicUser(user) : null }); }
