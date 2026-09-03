import Link from 'next/link';
import { Footer, Header, ProductCard } from '../components';
import { getCatalog } from '../../lib/catalog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loja',
  description: 'Todas as peças da curadoria Renata Felix: vestidos, alfaiataria, camisas, tricots, saias e casacos.',
  alternates: { canonical: '/loja' },
  openGraph: { url: '/loja' },
};

export const dynamic = 'force-dynamic';

export default async function Loja({ searchParams }: { searchParams: Promise<{ categoria?: string; filtro?: string }> }) {
  const search = await searchParams;
  const catalog = await getCatalog();
  const categories = Array.from(new Set(catalog.map(product => product.cat))).sort();
  const items = search.filtro === 'novidades' ? catalog.filter(product => product.isNew) : search.categoria ? catalog.filter(product => product.cat === search.categoria) : catalog;
  const title = search.filtro === 'novidades' ? 'Novidades' : search.categoria || 'Todas as peças';

  return <><Header /><main className="catalog"><div className="catalogTitle"><span className="eyebrow">Curadoria Renata Felix</span><h1 className="serif">{title}</h1><p>Escolhas feitas para acompanhar a sua forma de viver.</p></div><div className="catalogBar"><nav className="filters" aria-label="Filtros de categoria"><Link href="/loja" className={!search.categoria && search.filtro !== 'novidades' ? 'active' : ''}>Todos</Link><Link href="/loja?filtro=novidades" className={search.filtro === 'novidades' ? 'active' : ''}>Novidades</Link>{categories.map(category => <Link href={`/loja?categoria=${encodeURIComponent(category)}`} className={search.categoria === category ? 'active' : ''} key={category}>{category}</Link>)}</nav><span className="eyebrow">{items.length} {items.length === 1 ? 'peça' : 'peças'}</span></div>{items.length ? <div className="grid">{items.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty"><p>Não encontramos peças nesta seleção.</p><Link href="/loja" className="button dark">Ver todas as peças</Link></div>}</main><Footer /></>;
}
