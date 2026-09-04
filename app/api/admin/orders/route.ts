import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listOrdersWithCustomers, setOrderStatus, type OrderStatus } from '@/lib/store';

export const dynamic = 'force-dynamic';

const statuses: OrderStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ orders: await listOrdersWithCustomers() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Acesso administrativo necessário.';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json() as { id?: string; status?: string };
    if (!body.id || !statuses.includes(body.status as OrderStatus)) {
      return NextResponse.json({ error: 'Pedido ou status inválido.' }, { status: 400 });
    }
    const order = await setOrderStatus(body.id, body.status as OrderStatus);
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.';
    return NextResponse.json({ error: message }, { status: message === 'Não autorizado' ? 403 : 400 });
  }
}
