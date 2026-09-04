import Link from 'next/link';
import { Footer, Header, ProductCard } from '@/app/components';
import { getCatalog } from '@/lib/catalog';
import { productColors, productSizes } from '@/lib/product-variants';
import type { Product } from '@/app/data';

export const dynamic = 'force-dynamic';

const porPagina = 12;

type Busca = {
  categoria?: string; filtro?: string; cor?: string; tamanho?: string;
  min?: string; max?: string; ordem?: string; pagina?: string;
};

const ordenacoes: Record<string, { label: string; sort?: (a: Product, b: Product) => number }> = {
  relevancia: { label: 'Mais relevantes' },
  'preco-asc': { label: 'Menor preço', sort: (a, b) => a.price - b.price },
  'preco-desc': { label: 'Maior preço', sort: (a, b) => b.price - a.price },
  novidades: { label: 'Novidades primeiro', sort: (a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) },
  nome: { label: 'Nome (A–Z)', sort: (a, b) => a.name.localeCompare(b.name, 'pt-BR') },
};

function numero(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** Mantém os filtros ativos ao trocar de página. */
function comParametros(busca: Busca, mudancas: Partial<Busca>) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...busca, ...mudancas })) {
    if (valor) params.set(chave, String(valor));
  }
  const query = params.toString();
  return query ? `/loja?${query}` : '/loja';
}

export default async function Loja({ searchParams }: { searchParams: Promise<Busca> }) {
  const busca = await searchParams;

  let catalog: Product[];
  try {
    catalog = await getCatalog();
  } catch {
    return <><Header /><main id="conteudo" className="catalog">
      <div className="catalogTitle"><span className="eyebrow">Curadoria Renata Felix</span><h1 className="serif">A vitrine está fora do ar</h1><p>Não conseguimos carregar as peças neste momento. Tente novamente em instantes.</p></div>
      <div className="empty"><p>Se preferir, fale com a nossa equipe e escolhemos a peça com você.</p><Link href="/contato" className="button dark">Falar com a loja</Link></div>
    </main><Footer /></>;
  }

  const categorias = [...new Set(catalog.map(product => product.cat))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const cores = [...new Set(catalog.flatMap(productColors))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tamanhos = [...new Set(catalog.flatMap(productSizes))];
  const min = numero(busca.min);
  const max = numero(busca.max);

  const filtrados = catalog.filter(product => {
    if (busca.filtro === 'novidades' && !product.isNew) return false;
    if (busca.categoria && product.cat !== busca.categoria) return false;
    if (busca.cor && !productColors(product).includes(busca.cor)) return false;
    if (busca.tamanho && !productSizes(product).includes(busca.tamanho)) return false;
    if (min !== undefined && product.price < min) return false;
    if (max !== undefined && product.price > max) return false;
    return true;
  });

  const ordem = busca.ordem && ordenacoes[busca.ordem] ? busca.ordem : 'relevancia';
  const ordenado = ordenacoes[ordem].sort ? [...filtrados].sort(ordenacoes[ordem].sort) : filtrados;

  const paginas = Math.max(1, Math.ceil(ordenado.length / porPagina));
  const pagina = Math.min(Math.max(1, Number(busca.pagina) || 1), paginas);
  const itens = ordenado.slice((pagina - 1) * porPagina, pagina * porPagina);

  const titulo = busca.filtro === 'novidades' ? 'Novidades' : busca.categoria || 'Todas as peças';
  const temFiltro = Boolean(busca.cor || busca.tamanho || busca.min || busca.max || busca.categoria || busca.filtro);

  return <><Header /><main id="conteudo" className="catalog">
    <div className="catalogTitle"><span className="eyebrow">Curadoria Renata Felix</span><h1 className="serif">{titulo}</h1><p>Escolhas feitas para acompanhar a sua forma de viver.</p></div>

    <div className="catalogBar">
      <nav className="filters" aria-label="Filtros de categoria">
        <Link href={comParametros(busca, { categoria: '', filtro: '', pagina: '' })} className={!busca.categoria && busca.filtro !== 'novidades' ? 'active' : ''}>Todos</Link>
        <Link href={comParametros(busca, { categoria: '', filtro: 'novidades', pagina: '' })} className={busca.filtro === 'novidades' ? 'active' : ''}>Novidades</Link>
        {categorias.map(categoria => <Link key={categoria} href={comParametros(busca, { categoria, filtro: '', pagina: '' })} className={busca.categoria === categoria ? 'active' : ''}>{categoria}</Link>)}
      </nav>
      <span className="eyebrow">{ordenado.length} {ordenado.length === 1 ? 'peça' : 'peças'}</span>
    </div>

    <form className="catalogRefine" method="get" action="/loja">
      {busca.categoria && <input type="hidden" name="categoria" value={busca.categoria} />}
      {busca.filtro && <input type="hidden" name="filtro" value={busca.filtro} />}
      <label>Ordenar<select name="ordem" defaultValue={ordem}>{Object.entries(ordenacoes).map(([valor, { label }]) => <option key={valor} value={valor}>{label}</option>)}</select></label>
      <label>Cor<select name="cor" defaultValue={busca.cor || ''}><option value="">Todas</option>{cores.map(cor => <option key={cor} value={cor}>{cor}</option>)}</select></label>
      <label>Tamanho<select name="tamanho" defaultValue={busca.tamanho || ''}><option value="">Todos</option>{tamanhos.map(tamanho => <option key={tamanho} value={tamanho}>{tamanho}</option>)}</select></label>
      <label>Preço mín.<input name="min" type="number" min="0" step="10" inputMode="numeric" defaultValue={busca.min || ''} placeholder="R$" /></label>
      <label>Preço máx.<input name="max" type="number" min="0" step="10" inputMode="numeric" defaultValue={busca.max || ''} placeholder="R$" /></label>
      <button className="button dark" type="submit">Aplicar</button>
      {temFiltro && <Link className="textLink" href="/loja">Limpar filtros</Link>}
    </form>

    {itens.length ? <>
      <div className="grid">{itens.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}</div>
      {paginas > 1 && <nav className="pagination" aria-label="Paginação">
        {pagina > 1 && <Link className="textLink" href={comParametros(busca, { pagina: String(pagina - 1) })} rel="prev">Anterior</Link>}
        <span>Página {pagina} de {paginas}</span>
        {pagina < paginas && <Link className="textLink" href={comParametros(busca, { pagina: String(pagina + 1) })} rel="next">Próxima</Link>}
      </nav>}
    </> : <div className="empty"><p>Não encontramos peças nesta seleção.</p><Link href="/loja" className="button dark">Ver todas as peças</Link></div>}
  </main><Footer /></>;
}
