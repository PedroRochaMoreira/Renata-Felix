/**
 * Falha de configuração da loja ou do provedor. A cliente vê apenas a mensagem
 * genérica; o motivo real vai para o log do servidor, nunca para a tela — nome
 * de variável de ambiente não é assunto de quem está comprando.
 */
export class ShippingUnavailableError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super('O cálculo de frete está indisponível no momento. Fale com a loja para combinar a entrega.');
    this.detail = detail;
  }
}

/** Problema que a própria cliente resolve: CEP inválido, sacola vazia. */
export class ShippingInputError extends Error {}

export type ShipmentItem = { id: string; price: number; quantity: number };
export type ShippingQuote = { id: string | number; name: string; company: string; price: number; deliveryTime: number };
type RawQuote = { id: string | number; name?: string; company?: { name?: string }; custom_price?: unknown; price?: unknown; custom_delivery_time?: unknown; delivery_time?: unknown; error?: unknown };

function isRawQuote(value: unknown): value is RawQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as RawQuote;
  return (typeof quote.id === 'string' || typeof quote.id === 'number') && !quote.error;
}

export async function quoteShipping(postalCode: string, items: ShipmentItem[]): Promise<ShippingQuote[]> {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  const origin = String(process.env.MELHOR_ENVIO_ORIGIN_CEP || '').replace(/\D/g, '');
  const destination = String(postalCode || '').replace(/\D/g, '');
  if (!token || !origin) throw new ShippingUnavailableError('MELHOR_ENVIO_TOKEN e/ou MELHOR_ENVIO_ORIGIN_CEP não configurados.');
  if (origin.length !== 8) throw new ShippingUnavailableError(`MELHOR_ENVIO_ORIGIN_CEP inválido: esperados 8 dígitos, recebidos ${origin.length}.`);
  if (destination.length !== 8) throw new ShippingInputError('Informe um CEP válido com 8 dígitos.');
  if (!items.length) throw new ShippingInputError('A sacola está vazia.');
  if (items.some(item => !item.id || !Number.isFinite(item.price) || item.price <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1)) throw new ShippingInputError('Há itens inválidos para calcular o frete.');

  const base = process.env.MELHOR_ENVIO_SANDBOX === 'true' ? 'https://sandbox.melhorenvio.com.br' : 'https://www.melhorenvio.com.br';
  const response = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': process.env.MELHOR_ENVIO_USER_AGENT || 'Renata Felix Store (contato@renatafelix.com.br)',
    },
    body: JSON.stringify({
      from: { postal_code: origin }, to: { postal_code: destination },
      products: items.map(item => ({ id: item.id, width: 30, height: 8, length: 35, weight: 0.5, insurance_value: Number(item.price), quantity: Number(item.quantity) })),
      options: { receipt: false, own_hand: false },
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as { message?: string } | unknown[];
  if (!response.ok) throw new ShippingUnavailableError(`Melhor Envio respondeu ${response.status}: ${(data as { message?: string }).message || 'sem detalhe'}`);
  return (Array.isArray(data) ? data : [])
    .filter(isRawQuote)
    .map(quote => ({
      id: quote.id,
      name: quote.name || 'Entrega',
      company: quote.company?.name || 'Entrega',
      price: Number(quote.custom_price ?? quote.price),
      deliveryTime: Number(quote.custom_delivery_time ?? quote.delivery_time),
    }))
    .filter(quote => Number.isFinite(quote.price) && quote.price >= 0 && Number.isFinite(quote.deliveryTime) && quote.deliveryTime >= 0);
}
