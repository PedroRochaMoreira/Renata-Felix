import { Product } from './data';
import { ProductCard } from './components';

/**
 * A vitrine de destaques da home. As peças chegam prontas do servidor: antes
 * este componente as buscava por fetch no navegador, e a home era entregue sem
 * nenhum produto no HTML.
 */
export default function FeaturedIcons({ items }: { items: Product[] }) {
  return (
    <div className="grid">
      {items.map(product => (
        <ProductCard product={product} key={product.id} />
      ))}
    </div>
  );
}
