/**
 * Normaliza um texto para comparação: remove acentos, unifica separadores e
 * baixa a caixa. É o que permite encontrar "Calça" digitando "calca".
 */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Verifica se todos os termos buscados aparecem no texto informado. */
export function matchesSearch(text: string, query: string) {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeText(text);
  return terms.every(term => haystack.includes(term));
}
