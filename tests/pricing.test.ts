import { describe, expect, it } from 'vitest';
import { orderTotals, pixDiscountRate, pixUnitPrice, toCents, unitPriceFor } from '../lib/pricing';

const itens = [
  { unitPrice: 1290, quantity: 1 },
  { unitPrice: 690.99, quantity: 3 },
];

describe('pixUnitPrice', () => {
  it('aplica o desconto anunciado', () => {
    expect(pixUnitPrice(1290)).toBe(1290 * (1 - pixDiscountRate));
    expect(pixUnitPrice(1290)).toBe(1161);
  });

  it('arredonda para centavos', () => {
    expect(pixUnitPrice(690.99)).toBe(621.89);
  });

  it('mantém o preço cheio nos demais meios de pagamento', () => {
    expect(unitPriceFor(1290, 'OTHER')).toBe(1290);
    expect(unitPriceFor(1290, 'PIX')).toBe(1161);
  });
});

describe('orderTotals', () => {
  const cartao = orderTotals(itens, 32.5, 'OTHER');
  const pix = orderTotals(itens, 32.5, 'PIX');

  it('não desconta nada fora do PIX', () => {
    expect(cartao.discount).toBe(0);
    expect(cartao.total).toBe(toCents(cartao.subtotal + 32.5));
  });

  it('fecha a conta ao centavo', () => {
    expect(toCents(pix.subtotal - pix.discount + pix.shipping)).toBe(pix.total);
  });

  it('cobra exatamente a soma dos preços com desconto', () => {
    expect(pix.total).toBe(toCents(1161 + 621.89 * 3 + 32.5));
  });

  it('não aplica desconto sobre o frete', () => {
    expect(pix.shipping).toBe(32.5);
    expect(pix.shipping).toBe(cartao.shipping);
  });

  it('deixa o PIX mais barato que o cartão', () => {
    expect(pix.total).toBeLessThan(cartao.total);
    expect(pix.subtotal).toBe(cartao.subtotal);
  });

  it('lida com sacola vazia e frete inválido', () => {
    expect(orderTotals([], 0, 'PIX')).toEqual({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
    expect(orderTotals([], -10, 'PIX').shipping).toBe(0);
  });
});
