import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Header, ProductCard } from '@/app/components';
import { getCatalog } from '@/lib/catalog';
import SearchField from './search-field';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Buscar peças',
  description: 'Encontre vestidos, alfaiataria e essenciais na curadoria Renata Felix.',
  robots: { index: false, follow: true },
};

const semAcento = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = ((await searchParams).q || '').trim();

  let itens: Awaited<ReturnType<typeof getCatalog>> = [];
  let indisponivel = false;
  if (query) {
    try {
      const termo = semAcento(query);
      itens = (await getCatalog()).filter(product => semAcento(`${product.name} ${product.cat} ${product.color} ${product.desc}`).includes(termo));
    } catch { indisponivel = true; }
  }

  return <><Header /><main id="conteudo" className="searchPage">
    <div className="pageHeading"><span className="eyebrow">Encontre sua peça</span><h1 className="serif">O que você procura?</h1></div>
    <SearchField initialQuery={query} />
    {query && (indisponivel
      ? <div className="empty"><p>A busca está indisponível no momento. Tente novamente em instantes.</p></div>
      : <>
        <p className="searchCount">{itens.length} {itens.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}</p>
        {itens.length
          ? <div className="grid">{itens.map(product => <ProductCard product={product} key={product.id} />)}</div>
          : <div className="empty"><p>Nenhuma peça encontrada para “{query}”.</p><Link href="/loja" className="button dark">Ver todas as peças</Link></div>}
      </>)}
  </main><Footer /></>;
}
