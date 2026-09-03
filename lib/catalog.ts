import { products, type Product } from '../app/data';
import { allVariants, inventory, listProducts, overrides } from './store';
import { buildVariants, reconcileVariants, totalStock } from './variants';

function validImages(images: unknown, fallback: string) {
  const list = Array.isArray(images) ? images : [];
  const valid = list.filter(
    (image): image is string => typeof image === 'string' && image.trim().length > 0 && image !== 'null' && image !== 'undefined',
  );
  return valid.length ? [...new Set(valid)] : [fallback];
}

/**
 * A vitrine pública continua disponível com a curadoria base se o banco tiver
 * uma indisponibilidade transitória. Operações administrativas continuam a
 * falhar de modo explícito para não gravar dados em armazenamento efêmero.
 */
export async function getCatalog(): Promise<Product[]> {
  try {
    const [stock, edited, customProducts, grades] = await Promise.all([inventory(), overrides(), listProducts(), allVariants()]);
    return [...customProducts, ...products]
      .filter(product => !stock[product.id]?.deleted)
      .map(product => {
        const merged = { ...product, ...edited[product.id] } as Product;
        const images = validImages(merged.images, merged.img);
        const saved = grades[product.id];
        // O estoque verdadeiro é o da grade de tamanho e cor. O número por peça
        // continua exposto porque a vitrine só precisa saber se ainda há algo.
        const variants = saved?.length
          ? reconcileVariants(merged, saved)
          : buildVariants(merged, stock[product.id]?.stock ?? merged.stock ?? 10);
        return { ...merged, img: images[0], images, variants, stock: totalStock(variants) };
      });
  } catch {
    return products.map(product => {
      const variants = buildVariants(product, product.stock ?? 10);
      return { ...product, images: validImages(product.images, product.img), variants, stock: totalStock(variants) };
    });
  }
}

export async function findCatalogProduct(id: string) {
  return (await getCatalog()).find(product => product.id === id);
}

/** Todas as fotos em uso pelo catálogo, para não apagar uma foto compartilhada. */
export async function catalogImages() {
  const catalog = await getCatalog();
  return new Set(catalog.flatMap(product => (product.images?.length ? product.images : [product.img])).filter(Boolean));
}

/** As fotos de uma peça, sem repetições e sem valores vazios. */
export function productImages(product: { img: string; images?: string[] }) {
  return [...new Set((product.images?.length ? product.images : [product.img]).filter(Boolean))];
}
