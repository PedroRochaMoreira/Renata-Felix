import { describe, expect, it } from 'vitest';
import { matchesSearch, normalizeText } from '../lib/text';

describe('normalizeText', () => {
  it('remove acentos e unifica separadores', () => {
    expect(normalizeText('Calça')).toBe('calca');
    expect(normalizeText('  Off-White  ')).toBe('off white');
  });
});

describe('matchesSearch', () => {
  const peca = 'Calça Lina Alfaiataria Chocolate';

  it('encontra mesmo sem acento e sem respeitar a caixa', () => {
    expect(matchesSearch(peca, 'calca')).toBe(true);
    expect(matchesSearch(peca, 'CALÇA')).toBe(true);
  });

  it('exige todos os termos digitados', () => {
    expect(matchesSearch('Vestido Celine Vestidos Preto', 'vestido preto')).toBe(true);
    expect(matchesSearch('Vestido Celine Vestidos Preto', 'vestido azul')).toBe(false);
  });

  it('trata busca vazia como sem filtro', () => {
    expect(matchesSearch(peca, '   ')).toBe(true);
  });
});
