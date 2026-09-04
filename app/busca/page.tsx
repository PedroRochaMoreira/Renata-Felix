'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Footer, Header, ProductCard } from '../components';
import type { Product } from '../data';

export default function Busca() {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<Product[]>([]);
  useEffect(() => { fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }); }, []);
  const items = useMemo(() => catalog.filter(product => `${product.name} ${product.cat} ${product.color}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [catalog, query]);
  return <><Header /><main className="searchPage"><div className="pageHeading"><span className="eyebrow">Encontre sua peça</span><h1 className="serif">O que você procura?</h1></div><div className="searchInputWrap"><Search size={21} /><input autoFocus className="searchField" value={query} onChange={event => setQuery(event.target.value)} placeholder="Vestidos, cores, alfaiataria..." /></div>{query && <><p className="searchCount">{items.length} {items.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</p>{items.length ? <div className="grid">{items.map(product => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty"><p>Nenhuma peça encontrada para “{query}”.</p></div>}</>}</main><Footer /></>;
}
