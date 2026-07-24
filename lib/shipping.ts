export type ShipmentItem = { id: string; price: number; quantity: number };
export type ShippingQuote = { id: string | number; name: string; company: string; price: number; deliveryTime: number };

export async function quoteShipping(postalCode: string, items: ShipmentItem[]): Promise<ShippingQuote[]> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const origin = String(process.env.MELHOR_ENVIO_ORIGIN_CEP || '').replace(/\D/g, '');
  const destination = String(postalCode || '').replace(/\D/g, '');
  if (!token || !origin) throw new Error('Configure MELHOR_ENVIO_TOKEN e MELHOR_ENVIO_ORIGIN_CEP no .env para ativar o cálculo de frete.');
  if (destination.length !== 8) throw new Error('Informe um CEP válido com 8 dígitos.');
  if (!items.length) throw new Error('A sacola está vazia.');
  const base = process.env.MELHOR_ENVIO_SANDBOX === 'true' ? 'https://sandbox.melhorenvio.com.br' : 'https://www.melhorenvio.com.br';
  const response = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': process.env.MELHOR_ENVIO_USER_AGENT || 'Renata Felix Store (contato@renatafelix.com.br)' },
    body: JSON.stringify({ from: { postal_code: origin }, to: { postal_code: destination }, products: items.map(item => ({ id: item.id, width: 30, height: 8, length: 35, weight: .5, insurance_value: Number(item.price), quantity: Number(item.quantity) })), options: { receipt: false, own_hand: false } }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Não foi possível calcular o frete.');
  return (Array.isArray(data) ? data : []).filter(quote => !quote.error).map(quote => ({ id: quote.id, name: quote.name, company: quote.company?.name || 'Entrega', price: Number(quote.custom_price || quote.price), deliveryTime: Number(quote.custom_delivery_time || quote.delivery_time) }));
}
