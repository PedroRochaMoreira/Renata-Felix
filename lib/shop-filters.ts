import type { Product } from '../app/data';
import { productColors, productSizes } from './product-variants';
import { colorsInStock, variantStock } from './variants';

/**
 * Os filtros da loja. Ficam separados da página para poderem ser testados sem
 * subir o Next, e para que a ordem e a leitura dos parâmetros sejam as mesmas
 * na listagem e na contagem exibida.
 */
export type ShopSearch = {
  categoria?: string;
  filtro?: string;
  tamanho?: string;
  cor?: string;
  precoMax?: string;
  ordem?: string;
};

export type ShopOrder = 'recentes' | 'menor-preco' | 'maior-preco' | 'nome';

export const shopOrders: { value: ShopOrder; label: string }[] = [
  { value: 'recentes', label: 'Novidades primeiro' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'maior-preco', label: 'Maior preço' },
  { value: 'nome', label: 'Nome' },
];

export function parseOrder(value: string | undefined): ShopOrder {
  return shopOrders.some(order => order.value === value) ? (value as ShopOrder) : 'recentes';
}

/** Um tamanho só conta como disponível se houver peça dele na cor pedida. */
function matchesSize(product: Product, size: string, color: string) {
  const variants = product.variants || [];
  if (!variants.length) return productSizes(product).includes(size);
  if (color) return variantStock(variants, size, color) > 0;
  return variants.some(variant => variant.size === size && variant.stock > 0);
}

function matchesColor(product: Product, color: string) {
  const variants = product.variants || [];
  if (!variants.length) return productColors(product).includes(color);
  return colorsInStock(variants).includes(color);
}

export function filterProducts(catalog: Product[], search: ShopSearch) {
  const size = (search.tamanho || '').trim().toUpperCase();
  const color = (search.cor || '').trim();
  const maxPrice = Number(search.precoMax);

  return catalog.filter(product => {
    if (search.filtro === 'novidades' && !product.isNew) return false;
    if (search.categoria && product.cat !== search.categoria) return false;
    if (color && !matchesColor(product, color)) return false;
    if (size && !matchesSize(product, size, color)) return false;
    if (Number.isFinite(maxPrice) && maxPrice > 0 && product.price > maxPrice) return false;
    return true;
  });
}

export function sortProducts(products: Product[], order: ShopOrder) {
  const sorted = [...products];
  if (order === 'menor-preco') return sorted.sort((a, b) => a.price - b.price);
  if (order === 'maior-preco') return sorted.sort((a, b) => b.price - a.price);
  if (order === 'nome') return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return sorted.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
}

/** As opções que fazem sentido oferecer para o catálogo atual. */
export function shopFacets(catalog: Product[]) {
  const categories = new Set<string>();
  const sizes = new Set<string>();
  const colors = new Set<string>();
  let maxPrice = 0;

  for (const product of catalog) {
    categories.add(product.cat);
    maxPrice = Math.max(maxPrice, product.price);
    const variants = product.variants || [];
    if (variants.length) {
      for (const variant of variants) {
        if (variant.stock > 0) {
          sizes.add(variant.size);
          colors.add(variant.color);
        }
      }
    } else {
      productSizes(product).forEach(size => sizes.add(size));
      productColors(product).forEach(color => colors.add(color));
    }
  }

  const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
  return {
    categories: [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    sizes: [...sizes].sort((a, b) => {
      const left = sizeOrder.indexOf(a);
      const right = sizeOrder.indexOf(b);
      if (left >= 0 && right >= 0) return left - right;
      if (left >= 0) return -1;
      if (right >= 0) return 1;
      return a.localeCompare(b, 'pt-BR');
    }),
    colors: [...colors].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    maxPrice: Math.ceil(maxPrice / 100) * 100,
  };
}

/** Monta o link de um filtro preservando os demais e limpando os vazios. */
export function shopHref(search: ShopSearch, changes: Partial<ShopSearch>) {
  const next = { ...search, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && String(value).trim()) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/loja?${query}` : '/loja';
}
