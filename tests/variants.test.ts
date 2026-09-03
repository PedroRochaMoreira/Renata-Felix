import { describe, expect, it } from 'vitest';
import {
  buildVariants,
  colorsInStock,
  distributeStock,
  preferredColor,
  reconcileVariants,
  sizesInStock,
  totalStock,
  variantStock,
} from '../lib/variants';

describe('distributeStock', () => {
  it('reparte o total sem inventar nem perder peças', () => {
    expect(distributeStock(10, 3)).toEqual([4, 3, 3]);
    expect(distributeStock(10, 3).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('dá prioridade às primeiras combinações quando falta para todas', () => {
    expect(distributeStock(2, 5)).toEqual([1, 1, 0, 0, 0]);
  });

  it('trata zero, negativo e ausência de combinações', () => {
    expect(distributeStock(0, 3)).toEqual([0, 0, 0]);
    expect(distributeStock(-5, 2)).toEqual([0, 0]);
    expect(distributeStock(10, 0)).toEqual([]);
  });
});

describe('buildVariants', () => {
  it('cruza cores e tamanhos preservando o total', () => {
    const grade = buildVariants({ color: 'Preto, Vinho', sizes: ['P', 'M'] }, 10);
    expect(grade).toHaveLength(4);
    expect(totalStock(grade)).toBe(10);
    expect(grade).toEqual([
      { size: 'P', color: 'Preto', stock: 3 },
      { size: 'M', color: 'Preto', stock: 3 },
      { size: 'P', color: 'Vinho', stock: 2 },
      { size: 'M', color: 'Vinho', stock: 2 },
    ]);
  });

  it('usa a grade padrão de tamanhos quando a peça não informa nenhum', () => {
    const grade = buildVariants({ color: 'Preto' }, 5);
    expect(grade.map(variant => variant.size)).toEqual(['PP', 'P', 'M', 'G', 'GG']);
  });
});

describe('variantStock', () => {
  const grade = [
    { size: 'P', color: 'Preto', stock: 0 },
    { size: 'M', color: 'Preto', stock: 4 },
  ];

  it('não empresta o estoque de um tamanho para outro', () => {
    expect(variantStock(grade, 'P', 'Preto')).toBe(0);
    expect(variantStock(grade, 'M', 'Preto')).toBe(4);
    expect(totalStock(grade)).toBe(4);
  });

  it('ignora caixa e combinação inexistente', () => {
    expect(variantStock(grade, 'm', 'Preto')).toBe(4);
    expect(variantStock(grade, 'GG', 'Preto')).toBe(0);
    expect(variantStock(grade, 'M', 'Vinho')).toBe(0);
  });

  it('lista apenas o que está disponível', () => {
    expect(sizesInStock(grade, 'Preto')).toEqual(['M']);
    expect(colorsInStock(grade)).toEqual(['Preto']);
  });
});

describe('reconcileVariants', () => {
  const antes = [
    { size: 'P', color: 'Preto', stock: 5 },
    { size: 'M', color: 'Preto', stock: 2 },
  ];

  it('mantém o estoque das combinações que continuam existindo', () => {
    expect(reconcileVariants({ color: 'Preto', sizes: ['P', 'M', 'G'] }, antes)).toEqual([
      { size: 'P', color: 'Preto', stock: 5 },
      { size: 'M', color: 'Preto', stock: 2 },
      { size: 'G', color: 'Preto', stock: 0 },
    ]);
  });

  it('descarta combinações que a peça deixou de oferecer', () => {
    expect(reconcileVariants({ color: 'Preto', sizes: ['P'] }, antes)).toEqual([{ size: 'P', color: 'Preto', stock: 5 }]);
  });

  it('zera o estoque ao trocar a cor da peça', () => {
    expect(reconcileVariants({ color: 'Vinho', sizes: ['P'] }, antes)).toEqual([{ size: 'P', color: 'Vinho', stock: 0 }]);
  });
});

describe('preferredColor', () => {
  it('abre a peça numa cor que ainda tem estoque', () => {
    const grade = [
      { size: 'P', color: 'Preto', stock: 0 },
      { size: 'P', color: 'Vinho', stock: 3 },
    ];
    expect(preferredColor({ color: 'Preto, Vinho' }, grade)).toBe('Vinho');
  });

  it('recai na primeira cor quando tudo está esgotado', () => {
    const grade = [{ size: 'P', color: 'Preto', stock: 0 }];
    expect(preferredColor({ color: 'Preto, Vinho' }, grade)).toBe('Preto');
  });
});
