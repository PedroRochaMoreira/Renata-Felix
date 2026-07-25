/**
 * The catalog currently keeps the primary colour in `color`.  A comma, slash
 * or pipe separated value is also understood as the list of colours offered
 * for that same product.  This keeps existing products working while allowing
 * a product to expose real, explicit colour choices without borrowing colours
 * from other pieces in the catalog.
 */
export const defaultProductSizes = ['PP', 'P', 'M', 'G', 'GG'];

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
