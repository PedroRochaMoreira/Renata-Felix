'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Footer, Header, ProductCard } from '../components';
import { Product, products } from '../data';
import { useStore } from '../store';

export default function Favoritos() {
  const { favorites, hydrated } = useStore();
  const [catalog, setCatalog] = useState<Product[]>(products);
  useEffect(() => { fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }); }, []);
  const items = useMemo(() => catalog.filter(product => favorites.includes(product.id)), [catalog, favorites]);
  return <><Header /><main className="catalog"><div className="catalogTitle"><span className="eyebrow">Suas escolhas</span><h1 className="serif">Favoritos</h1><p>Peças salvas para você revisitar quando quiser.</p></div>{!hydrated ? <p className="info">Carregando seus favoritos...</p> : items.length ? <div className="grid">{items.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty favoritesEmpty"><p>Você ainda não salvou peças.</p><Link className="button dark" href="/loja">Explorar a loja</Link></div>}</main><Footer /></>;
}
