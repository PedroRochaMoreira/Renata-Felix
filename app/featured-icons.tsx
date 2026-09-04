'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Product } from './data';
import { ProductCard } from './components';

/**
 * Renderiza a seção inteira para poder sair do ar quando ainda não há peças
 * selecionadas — um cabeçalho sozinho, sem vitrine, parece um erro.
 */
export default function FeaturedIcons() {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(response => response.ok ? response.json() : null),
      fetch('/api/admin/featured').then(response => response.ok ? response.json() : null),
    ]).then(([catalog, featured]) => {
      const products: Product[] = Array.isArray(catalog?.products) ? catalog.products : [];
      const ids: string[] = Array.isArray(featured?.ids) ? featured.ids : [];
      const selected = ids.map(id => products.find(product => product.id === id)).filter((product): product is Product => Boolean(product));
      setItems(selected.length ? selected : products.filter(product => !product.isNew).slice(0, 4));
    }).catch(() => undefined);
  }, []);

  if (!items.length) return null;

  return <section className="section iconSection">
    <div className="sectionHead">
      <div><span className="eyebrow">A assinatura da loja</span><h2 className="serif">Ícones Renata Felix</h2></div>
      <Link href="/loja" className="textLink">Ver a loja <ArrowRight size={13} /></Link>
    </div>
    <div className="grid">{items.map(product => <ProductCard product={product} key={product.id} />)}</div>
  </section>;
}
