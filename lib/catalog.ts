import { seedProducts, type Product } from '@/app/data';
import { inventory, listProducts, overrides } from './store';

/**
 * A vitrine de demonstração de `app/data.ts` não é vendável: os preços e o
 * estoque são fictícios. Ela só entra no catálogo quando a loja pede
 * explicitamente, para preencher a vitrine antes do primeiro cadastro real.
 */
const useSeedCatalog = process.env.RF_SEED_CATALOG === 'true';

function validImages(images: unknown, fallback: string) {
  const list = Array.isArray(images) ? images : [];
  const valid = list.filter((image): image is string => typeof image === 'string' && image.trim().length > 0 && image !== 'null' && image !== 'undefined');
  return valid.length ? [...new Set(valid)] : [fallback];
}

/**
 * Propaga a falha quando o banco está indisponível. Uma vitrine que avisa que
 * está fora do ar é preferível a uma que anuncia peças com preço e estoque
 * inventados — e que o checkout aceitaria vender.
 */
export async function getCatalog(): Promise<Product[]> {
  const [stock, edited, customProducts] = await Promise.all([inventory(), overrides(), listProducts()]);
  // As peças de demonstração não têm estoque real; recebem um valor fictício
  // para que a vitrine de exemplo não apareça inteira como esgotada.
  const base = useSeedCatalog ? [...customProducts, ...seedProducts.map(product => ({ ...product, stock: product.stock ?? 10 }))] : customProducts;
  return base.filter(product => !stock[product.id]?.deleted).map(product => {
    const merged = { ...product, ...edited[product.id] } as Product;
    const images = validImages(merged.images, merged.img);
    // Sem estoque conhecido a peça aparece esgotada, nunca disponível por engano.
    return { ...merged, img: images[0], images, stock: stock[product.id]?.stock ?? merged.stock ?? 0 };
  });
}

export async function findCatalogProduct(id: string) {
  return (await getCatalog()).find(product => product.id === id);
}
