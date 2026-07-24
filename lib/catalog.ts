import { products, type Product } from '../app/data';
import { inventory, listProducts, overrides } from './store';

function validImages(images: unknown, fallback: string) {
  const list = Array.isArray(images) ? images : [];
  const valid = list.filter((image): image is string => typeof image === 'string' && image.trim().length > 0 && image !== 'null' && image !== 'undefined');
  return valid.length ? [...new Set(valid)] : [fallback];
}

export function getCatalog(): Product[] {
  const stock = inventory();
  const edited = overrides();

  return [...listProducts(), ...products]
    .filter(product => !stock[product.id]?.deleted)
    .map(product => {
      const merged = { ...product, ...edited[product.id] } as Product;
      const images = validImages(merged.images, merged.img);
      return { ...merged, img: images[0], images, stock: stock[product.id]?.stock ?? merged.stock ?? 10 };
    });
}

export function findCatalogProduct(id: string) {
  return getCatalog().find(product => product.id === id);
}
