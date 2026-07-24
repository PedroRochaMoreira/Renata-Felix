'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '../../data';

type Order = { id: string; status: string; total: number; createdAt: string; items: { id: string; name: string; size: string; quantity: number }[] };
const labels: Record<string, string> = { PENDING: 'Aguardando pagamento', APPROVED: 'Pagamento aprovado', REJECTED: 'Pagamento recusado', CANCELLED: 'Pedido cancelado' };
export default function Pedidos() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => { fetch('/api/account').then(response => response.json()).then(data => setOrders(data.orders || [])); }, []);
  if (!orders) return <p className="info">Carregando seus pedidos...</p>;
  return <><h2 className="serif">Seus pedidos</h2>{orders.length ? <div className="ordersList">{orders.map(order => <article key={order.id}><div><span className="eyebrow">Pedido {order.id.slice(-6).toUpperCase()}</span><b>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</b></div><span className={`orderStatus ${order.status.toLowerCase()}`}>{labels[order.status] || order.status}</span><p>{order.items.map(item => `${item.name} · ${item.size} × ${item.quantity}`).join(', ')}</p><strong>{formatPrice(order.total)}</strong></article>)}</div> : <div className="empty accountEmpty"><p>Você ainda não fez nenhum pedido.</p><Link href="/loja" className="button dark">Explorar a loja</Link></div>}</>;
}
