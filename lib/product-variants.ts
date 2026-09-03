import { normalizeText } from './text';

/**
 * The catalog currently keeps the primary colour in `color`.  A comma, slash
 * or pipe separated value is also understood as the list of colours offered
 * for that same product.  This keeps existing products working while allowing
 * a product to expose real, explicit colour choices without borrowing colours
 * from other pieces in the catalog.
 */
export const defaultProductSizes = ['PP', 'P', 'M', 'G', 'GG'];

const commonColorTones: Record<string, string> = {
  preto: '#191716', black: '#191716',
  branco: '#faf8f3', white: '#faf8f3',
  'off white': '#eee8dc', offwhite: '#eee8dc', creme: '#e8ddc8', marfim: '#eee4cf', ivory: '#eee4cf',
  areia: '#c7b49a', bege: '#d5c0a1', nude: '#c69d82',
  caramelo: '#a6673d', camel: '#a6673d',
  chocolate: '#5a392c', marrom: '#6d4938', brown: '#6d4938',
  terracota: '#a9543d', terracotta: '#a9543d',
  vinho: '#6d2437', bordo: '#6d2437', bordeaux: '#6d2437', burgundy: '#6d2437',
  vermelho: '#a83b35', red: '#a83b35', coral: '#db765d', rosa: '#d68b9d', pink: '#d76a94',
  azul: '#315b8d', blue: '#315b8d', 'azul marinho': '#1e2e4d', navy: '#1e2e4d', 'azul claro': '#91b3ca',
  verde: '#496f55', green: '#496f55', 'verde militar': '#596347', militar: '#596347', oliva: '#73734b', olive: '#73734b',
  amarelo: '#e3b94f', yellow: '#e3b94f', laranja: '#d97840', orange: '#d97840',
  roxo: '#72537b', purple: '#72537b', lilas: '#a28ab0', lavanda: '#b7a6ca', lavender: '#b7a6ca',
  cinza: '#8c8b89', grey: '#8c8b89', gray: '#8c8b89', prata: '#b8b9b7', silver: '#b8b9b7',
  dourado: '#b69360', gold: '#b69360', denim: '#506d87', jeans: '#506d87',
};

export function productSizes(product: { sizes?: string[] }) {
  const sizes = product.sizes?.map(size => size.trim().toUpperCase()).filter(Boolean) || [];
  return sizes.length ? [...new Set(sizes)] : defaultProductSizes;
}

export function productColors(product: { color: string }) {
  const colors = product.color
    .split(/\s*[,/|]\s*/)
    .map(color => color.trim())
    .filter(Boolean);

  return colors.length ? [...new Set(colors)] : ['Sem cor informada'];
}

export function defaultProductColor(product: { color: string }) {
  return productColors(product)[0];
}

/** Returns a safe CSS tone for the product colour shown to the customer. */
export function productColorTone(color: string) {
  const raw = color.trim();
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(raw)) return raw;
  return commonColorTones[normalizeText(raw)] || '#9b9288';
}
