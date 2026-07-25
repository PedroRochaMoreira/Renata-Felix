'use client';

import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock3, Truck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatPrice } from '../../data';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type Order = {
  id: string;
  status: Status;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: { id: string; name: string; size: string; color?: string; quantity: number; unitPrice?: number }[];
  shipping?: { name: string; company: string; price: number; deliveryTime?: number };
};

const labels: Record<Status, string> = { PENDING: 'Aguardando pagamento', APPROVED: 'Pagamento aprovado', REJECTED: 'Pagamento recusado', CANCELLED: 'Pedido cancelado' };
const icons: Record<Status, typeof Clock3> = { PENDING: Clock3, APPROVED: CheckCircle2, REJECTED: XCircle, CANCELLED: XCircle };
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));

export default function Pedidos() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/account')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar seus pedidos.');
        if (active) setOrders(data.orders || []);
      })
      .catch(reason => { if (active) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar seus pedidos.'); setOrders([]); } });
    return () => { active = false; };
  }, []);

  if (!orders) return <p className="info">Carregando seus pedidos...</p>;
  return <><h2 className="serif">Seus pedidos</h2><p className="info">Acompanhe cada etapa da sua compra por aqui.</p>{error && <p className="notice">{error}</p>}{orders.length ? <div className="ordersList">{orders.map(order => {
    const Icon = icons[order.status];
    return <article key={order.id}><div><span className="eyebrow">Pedido #{order.id.slice(-6).toUpperCase()}</span><b><CalendarDays size={13} /> {date(order.createdAt)}</b></div><span className={`orderStatus ${order.status.toLowerCase()}`}><Icon size={12} /> {labels[order.status]}</span><p>{order.items.map(item => `${item.name}${item.color ? ` · ${item.color}` : ''} · ${item.size} × ${item.quantity}`).join(', ')}</p><div className="orderDelivery">{order.shipping ? <><Truck size={14} /><span>{order.shipping.company} · {order.shipping.name}{order.shipping.deliveryTime ? ` · até ${order.shipping.deliveryTime} dias úteis` : ''}</span></> : <span>Entrega será confirmada após o pagamento.</span>}</div><strong>{formatPrice(order.total)}</strong></article>;
  })}</div> : <div className="empty accountEmpty"><p>Você ainda não fez nenhum pedido.</p><Link href="/loja" className="button dark">Explorar a loja</Link></div>}</>;
}
