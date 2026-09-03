/**
 * Regras de preço da loja. O desconto do PIX precisa ser calculado do mesmo
 * jeito na vitrine, no carrinho, no pedido e na cobrança: se cada camada
 * arredondar por conta própria, a cliente vê um valor e paga outro.
 */
export type PaymentMethod = 'PIX' | 'OTHER';
export type PricedItem = { unitPrice: number; quantity: number };
export type OrderTotals = { subtotal: number; discount: number; shipping: number; total: number };

export const pixDiscountRate = 0.1;
export const pixDiscountLabel = '10%';

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'PIX' || value === 'OTHER';
}

/** Arredonda para centavos, que é a menor unidade que o pagamento aceita. */
export function toCents(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/**
 * O preço unitário cobrado no PIX. É esta função, e não uma multiplicação
 * solta, que define o desconto em todo o site — inclusive no valor enviado ao
 * Mercado Pago, para que o total exibido seja exatamente o total cobrado.
 */
export function pixUnitPrice(price: number) {
  return toCents(price * (1 - pixDiscountRate));
}

export function unitPriceFor(price: number, method: PaymentMethod) {
  return method === 'PIX' ? pixUnitPrice(price) : toCents(price);
}

/**
 * Fecha a conta do pedido. O desconto incide sobre as peças, nunca sobre o
 * frete, e sai da soma dos preços já arredondados para não sobrar centavo.
 */
export function orderTotals(items: PricedItem[], shippingPrice: number, method: PaymentMethod): OrderTotals {
  const subtotal = toCents(items.reduce((sum, item) => sum + toCents(item.unitPrice) * item.quantity, 0));
  const charged = toCents(items.reduce((sum, item) => sum + unitPriceFor(item.unitPrice, method) * item.quantity, 0));
  const shipping = toCents(Math.max(0, shippingPrice));
  return { subtotal, discount: toCents(subtotal - charged), shipping, total: toCents(charged + shipping) };
}
