'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ClipboardList, Clock3, PackageCheck, RefreshCcw, Truck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Footer, Header } from '../../components';
import { formatPrice } from '../../data';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type Order = {
  id: string;
  status: Status;
  total: number;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; email: string } | null;
  items: { id: string; name: string; size: string; quantity: number; unitPrice: number }[];
  shipping?: { name: string; company: string; price: number; deliveryTime?: number };
};

const statusCopy: Record<Status, string> = {
  PENDING: 'Aguardando pagamento',
  APPROVED: 'Pagamento aprovado',
  REJECTED: 'Pagamento recusado',
  CANCELLED: 'Pedido cancelado',
};

const statusIcon: Record<Status, typeof Clock3> = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: XCircle,
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function PedidosAdmin() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os pedidos.');
      setOrders(data.orders || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.');
      setOrders([]);
    }
  };

  useEffect(() => { void load(); }, []);
  const visibleOrders = useMemo(() => (orders || []).filter(order => filter === 'ALL' || order.status === filter), [orders, filter]);
  const counts = useMemo(() => ({
    all: orders?.length || 0,
    pending: orders?.filter(order => order.status === 'PENDING').length || 0,
    approved: orders?.filter(order => order.status === 'APPROVED').length || 0,
  }), [orders]);

  async function changeStatus(order: Order, status: Status) {
    if (order.status === status || order.status === 'APPROVED') return;
    if (status === 'APPROVED' && !window.confirm('Confirmar este pagamento? O estoque das peças será baixado uma única vez.')) return;
    if (status === 'CANCELLED' && !window.confirm('Cancelar este pedido?')) return;
    setUpdating(order.id);
    setMessage('');
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: order.id, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o pedido.');
      setOrders(current => (current || []).map(item => item.id === order.id ? { ...item, ...data.order } : item));
      setMessage('Status do pedido atualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setUpdating(null);
    }
  }

  return <><Header /><main className="ordersAdminPage">
    <Link className="textLink" href="/admin"><ArrowLeft size={14} /> Voltar ao painel</Link>
    <div className="ordersAdminHeading"><div><span className="eyebrow"><ClipboardList size={13} /> Operação da loja</span><h1 className="serif">Pedidos</h1><p>Acompanhe pagamentos, clientes e entregas em um só lugar.</p></div><button className="button dark" onClick={() => void load()} disabled={orders === null}><RefreshCcw size={15} /> Atualizar</button></div>
    <div className="orderStats"><button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}><span>Todos</span><b>{counts.all}</b></button><button className={filter === 'PENDING' ? 'active' : ''} onClick={() => setFilter('PENDING')}><span>Aguardando</span><b>{counts.pending}</b></button><button className={filter === 'APPROVED' ? 'active' : ''} onClick={() => setFilter('APPROVED')}><span>Aprovados</span><b>{counts.approved}</b></button></div>
    {message && <p className="notice adminNotice">{message}</p>}
    {orders === null ? <div className="ordersLoading">Carregando pedidos...</div> : visibleOrders.length ? <div className="adminOrdersList">{visibleOrders.map(order => {
      const Icon = statusIcon[order.status];
      return <article key={order.id} className="adminOrderCard">
        <header><div><span className="eyebrow">Pedido #{order.id.slice(-6).toUpperCase()}</span><h2>{order.customer?.name || 'Cliente não encontrada'}</h2><a href={`mailto:${order.customer?.email || ''}`}>{order.customer?.email || 'Sem e-mail disponível'}</a></div><div className="adminOrderStatus"><span className={`orderStatus ${order.status.toLowerCase()}`}><Icon size={13} /> {statusCopy[order.status]}</span><small>Criado em {dateTime(order.createdAt)}</small></div></header>
        <div className="adminOrderBody"><section><span className="eyebrow">Peças</span><ul>{order.items.map(item => <li key={`${item.id}-${item.size}`}><span>{item.name} <small>· {item.size} × {item.quantity}</small></span><strong>{formatPrice(item.unitPrice * item.quantity)}</strong></li>)}</ul></section><section><span className="eyebrow"><Truck size={12} /> Entrega</span>{order.shipping ? <p><b>{order.shipping.company} · {order.shipping.name}</b><span>{formatPrice(order.shipping.price)}{order.shipping.deliveryTime ? ` · até ${order.shipping.deliveryTime} dias úteis` : ''}</span></p> : <p><span>Entrega não informada.</span></p>}</section><section className="adminOrderTotal"><span className="eyebrow">Total</span><strong>{formatPrice(order.total)}</strong><small>Atualizado em {dateTime(order.updatedAt)}</small></section></div>
        <footer><label>Atualizar status<select value={order.status} disabled={updating === order.id || order.status === 'APPROVED'} onChange={event => void changeStatus(order, event.target.value as Status)}>{(Object.keys(statusCopy) as Status[]).map(status => <option key={status} value={status}>{statusCopy[status]}</option>)}</select></label>{order.status === 'PENDING' && <button className="button dark" disabled={updating === order.id} onClick={() => void changeStatus(order, 'APPROVED')}><PackageCheck size={15} /> Confirmar pagamento</button>}{order.status === 'APPROVED' && <span className="orderLocked"><CheckCircle2 size={14} /> Estoque já atualizado</span>}</footer>
      </article>;
    })}</div> : <div className="empty ordersEmpty"><ClipboardList size={32} /><h2 className="serif">Nenhum pedido nesta seleção.</h2><p>Os pedidos realizados pela loja aparecerão aqui assim que forem iniciados.</p></div>}
  </main><Footer /></>;
}
