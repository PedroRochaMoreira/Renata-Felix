import { NextResponse } from 'next/server';
import { setOrderStatus } from '../../../../../lib/store';

export async function POST(req: Request) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: true });
  try {
    const body = await req.json() as { type?: string; data?: { id?: string | number } };
    if (body.type !== 'payment' || !body.data?.id) return NextResponse.json({ ok: true });
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const payment = await response.json();
    if (!response.ok || !payment.external_reference) return NextResponse.json({ ok: true });
    const status = payment.status === 'approved' ? 'APPROVED' : payment.status === 'rejected' ? 'REJECTED' : payment.status === 'cancelled' ? 'CANCELLED' : 'PENDING';
    await setOrderStatus(String(payment.external_reference), status, String(payment.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
