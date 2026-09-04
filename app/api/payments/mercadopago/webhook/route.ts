import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { sendOrderStatusEmail, type OrderEmailStatus } from '@/lib/email';
import { setOrderStatus } from '@/lib/store';

export const runtime = 'nodejs';

type WebhookBody = { type?: string; action?: string; data?: { id?: string | number } };
type Payment = {
  id?: string | number;
  status?: string;
  external_reference?: string;
  payer?: { email?: string };
  metadata?: Record<string, unknown>;
};

const notifiedPayments = new Map<string, number>();

function firstString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function paymentStatus(value: unknown): OrderEmailStatus | null {
  if (value === 'approved') return 'APPROVED';
  if (value === 'rejected') return 'REJECTED';
  if (value === 'cancelled') return 'CANCELLED';
  if (value === 'pending' || value === 'in_process' || value === 'authorized') return 'PENDING';
  return null;
}

function signatureParts(signature: string) {
  return Object.fromEntries(signature.split(',').map(part => {
    const [key, ...value] = part.trim().split('=');
    return [key, value.join('=')];
  }));
}

/**
 * Sem segredo configurado a rota aceitava qualquer POST. Em produção isso passa
 * a ser recusado: um webhook não autenticado decide o status de pedidos.
 * Em desenvolvimento continua liberado para não travar testes locais.
 */
function isValidSignature(req: Request, paymentId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return true;
    console.error('MERCADO_PAGO_WEBHOOK_SECRET não configurado: notificações de pagamento estão sendo recusadas.');
    return false;
  }
  const signature = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id');
  if (!signature || !requestId) return false;
  const { ts, v1 } = signatureParts(signature);
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[a-f0-9]+$/i.test(v1)) return false;
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const actual = Buffer.from(v1, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function shouldNotify(paymentId: string, status: OrderEmailStatus) {
  const key = `${paymentId}:${status}`;
  const now = Date.now();
  for (const [entry, createdAt] of notifiedPayments) if (now - createdAt > 24 * 60 * 60 * 1000 || notifiedPayments.size > 500) notifiedPayments.delete(entry);
  if (notifiedPayments.has(key)) return false;
  return true;
}

function markNotified(paymentId: string, status: OrderEmailStatus) {
  notifiedPayments.set(`${paymentId}:${status}`, Date.now());
}

export async function POST(req: Request) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, error: 'Pagamento não configurado.' }, { status: 503 });

  try {
    let body: WebhookBody = {};
    try {
      body = await req.json() as WebhookBody;
    } catch {
      // O formato antigo do Mercado Pago pode enviar os campos pela URL.
    }
    const url = new URL(req.url);
    const topic = firstString(body.type) || firstString(body.action).split('.')[0] || firstString(url.searchParams.get('type')) || firstString(url.searchParams.get('topic'));
    const paymentId = String(body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '').trim();
    if (topic && topic !== 'payment') return NextResponse.json({ ok: true, ignored: true });
    if (!/^\d{4,32}$/.test(paymentId)) return NextResponse.json({ ok: true, ignored: true });
    if (!isValidSignature(req, paymentId)) return NextResponse.json({ ok: false, error: 'Assinatura do webhook inválida.' }, { status: 401 });

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    const payment = (await response.json().catch(() => ({}))) as Payment;
    if (!response.ok) return NextResponse.json({ ok: false, error: 'Não foi possível confirmar o pagamento.' }, { status: 502 });
    if (String(payment.id ?? '') !== paymentId) return NextResponse.json({ ok: true, ignored: true });

    const orderId = firstString(payment.external_reference);
    const status = paymentStatus(payment.status);
    if (!status || !/^rf-[a-f0-9]{16}$/i.test(orderId)) return NextResponse.json({ ok: true, ignored: true });
    // O pedido já nasce como pendente; ignorar retornos pendentes impede regressão de um status final.
    if (status === 'PENDING') return NextResponse.json({ ok: true, pending: true });

    const order = await setOrderStatus(orderId, status, paymentId);
    if (!order || order.status !== status) return NextResponse.json({ ok: true, ignored: true });

    const metadataEmail = firstString(payment.metadata?.customer_email);
    const customerEmail = metadataEmail || firstString(payment.payer?.email);
    if (customerEmail && shouldNotify(paymentId, status)) {
      try {
        const result = await sendOrderStatusEmail({
          to: customerEmail,
          order,
          baseUrl: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(req.url).origin).replace(/\/$/, ''),
        });
        if (result.sent) markNotified(paymentId, status);
      } catch {
        console.error(`Não foi possível enviar a atualização do pedido ${orderId}.`);
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Responder 5xx faz o Mercado Pago tentar novamente em falhas transitórias.
    return NextResponse.json({ ok: false, error: 'Erro transitório ao processar a notificação.' }, { status: 502 });
  }
}
