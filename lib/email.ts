import { Resend } from 'resend';

type Email = { to: string; subject: string; html: string; text: string };
export type OrderEmailStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type OrderEmailDetails = {
  id: string;
  status: OrderEmailStatus;
  discount?: number;
  paymentMethod?: 'PIX' | 'OTHER';
  total: number;
  items?: { name: string; size: string; color?: string; quantity: number }[];
  shipping?: { name: string; company: string; price: number; deliveryTime?: number };
};
const from = process.env.EMAIL_FROM;
const client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(message: Email) {
  if (!client || !from) return { sent: false, reason: 'not-configured' as const };
  const result = await client.emails.send({ from, ...message });
  if (result.error) throw new Error(result.error.message);
  return { sent: true, id: result.data?.id };
}

export function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char)); }

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
}

function statusCopy(status: OrderEmailStatus) {
  if (status === 'APPROVED') return { subject: 'Pagamento aprovado', title: 'Pagamento aprovado.', body: 'Recebemos a confirmação do seu pagamento. Agora vamos preparar sua peça com todo cuidado.' };
  if (status === 'REJECTED') return { subject: 'Não foi possível aprovar o pagamento', title: 'Pagamento não aprovado.', body: 'O pagamento não foi aprovado pelo provedor. Você pode tentar novamente pelo seu pedido.' };
  if (status === 'CANCELLED') return { subject: 'Pagamento cancelado', title: 'Pagamento cancelado.', body: 'O pagamento deste pedido foi cancelado. Se precisar de ajuda, fale com a nossa equipe.' };
  return { subject: 'Pedido recebido', title: 'Seu pedido foi recebido.', body: 'Reservamos seu pedido e estamos aguardando a confirmação do pagamento.' };
}

/** Envia uma atualização de pedido sem acoplar o fluxo de compra ao provedor de e-mail. */
export async function sendOrderStatusEmail(input: { to: string; name?: string; order: OrderEmailDetails; baseUrl: string }) {
  const recipient = input.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) return { sent: false, reason: 'invalid-recipient' as const };
  const copy = statusCopy(input.order.status);
  const customerName = input.name?.trim() || 'cliente';
  const accountUrl = `${input.baseUrl.replace(/\/$/, '')}/conta/pedidos`;
  const lines = (input.order.items || []).map(item => `${item.name}${item.color ? ` · ${item.color}` : ''} · ${item.size} × ${item.quantity}`).join('\n');
  const safeLines = (input.order.items || []).map(item => `<li>${escapeHtml(item.name)}${item.color ? ` · ${escapeHtml(item.color)}` : ''} · ${escapeHtml(item.size)} × ${item.quantity}</li>`).join('');
  const delivery = input.order.shipping ? `${input.order.shipping.company} · ${input.order.shipping.name}` : '';
  const discount = input.order.discount && input.order.discount > 0 ? `Desconto PIX: -${money(input.order.discount)}` : '';
  const safeDelivery = input.order.shipping ? `${escapeHtml(input.order.shipping.company)} · ${escapeHtml(input.order.shipping.name)}` : '';

  return sendEmail({
    to: recipient,
    subject: `${copy.subject} — pedido ${input.order.id}`,
    text: `Olá, ${customerName}.\n\n${copy.title} ${copy.body}\n\nPedido: ${input.order.id}${discount ? `\n${discount}` : ''}\nTotal: ${money(input.order.total)}${delivery ? `\nEntrega: ${delivery}` : ''}${lines ? `\n\nItens:\n${lines}` : ''}\n\nAcompanhe seu pedido: ${accountUrl}`,
    html: `<p>Olá, ${escapeHtml(customerName)}.</p><h2>${copy.title}</h2><p>${copy.body}</p><p><strong>Pedido:</strong> ${escapeHtml(input.order.id)}${discount ? `<br/><strong>Desconto PIX:</strong> -${money(input.order.discount || 0)}` : ''}<br/><strong>Total:</strong> ${money(input.order.total)}${safeDelivery ? `<br/><strong>Entrega:</strong> ${safeDelivery}` : ''}</p>${safeLines ? `<p><strong>Itens</strong></p><ul>${safeLines}</ul>` : ''}<p><a href="${escapeHtml(accountUrl)}">Acompanhar pedido</a></p>`,
  });
}
