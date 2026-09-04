import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Header, ProductCard } from '../components';
import { formatPrice } from '../data';
import { getCatalog } from '../../lib/catalog';
import { productColorTone } from '../../lib/product-variants';
import { filterProducts, parseOrder, shopFacets, shopHref, shopOrders, sortProducts, type ShopSearch } from '../../lib/shop-filters';

export const metadata: Metadata = {
  title: 'Loja',
  description: 'Todas as peças da curadoria Renata Felix: vestidos, alfaiataria, camisas, tricots, saias e casacos.',
  alternates: { canonical: '/loja' },
  openGraph: { url: '/loja' },
};

export const dynamic = 'force-dynamic';

export default async function Loja({ searchParams }: { searchParams: Promise<ShopSearch> }) {
  const search = await searchParams;
  const catalog = await getCatalog();
  const facets = shopFacets(catalog);
  const order = parseOrder(search.ordem);
  const items = sortProducts(filterProducts(catalog, search), order);
  const title = search.filtro === 'novidades' ? 'Novidades' : search.categoria || 'Todas as peças';
  const hasFilters = Boolean(search.categoria || search.filtro || search.tamanho || search.cor || search.precoMax);

  // Faixas de preço construídas a partir do catálogo real, para não oferecer
  // um corte que nenhuma peça alcança.
  const priceSteps = [0.25, 0.5, 0.75]
    .map(part => Math.ceil((facets.maxPrice * part) / 50) * 50)
    .filter((value, index, all) => value > 0 && all.indexOf(value) === index);

  return (
    <>
      <Header />
      <main className="catalog">
        <div className="catalogTitle">
          <span className="eyebrow">Curadoria Renata Felix</span>
          <h1 className="serif">{title}</h1>
          <p>Escolhas feitas para acompanhar a sua forma de viver.</p>
        </div>

        <div className="catalogBar">
          <nav className="filters" aria-label="Filtros de categoria">
            <Link
              href={shopHref(search, { categoria: '', filtro: '' })}
              className={!search.categoria && search.filtro !== 'novidades' ? 'active' : ''}
            >
              Todos
            </Link>
            <Link href={shopHref(search, { filtro: 'novidades', categoria: '' })} className={search.filtro === 'novidades' ? 'active' : ''}>
              Novidades
            </Link>
            {facets.categories.map(category => (
              <Link
                href={shopHref(search, { categoria: category, filtro: '' })}
                className={search.categoria === category ? 'active' : ''}
                key={category}
              >
                {category}
              </Link>
            ))}
          </nav>
          <span className="eyebrow">
            {items.length} {items.length === 1 ? 'peça' : 'peças'}
          </span>
        </div>

        <div className="refineBar">
          {facets.sizes.length > 0 && (
            <div className="refineGroup">
              <span className="eyebrow">Tamanho</span>
              <div className="refineOptions">
                {facets.sizes.map(size => (
                  <Link
                    key={size}
                    href={shopHref(search, { tamanho: search.tamanho === size ? '' : size })}
                    className={`refineChip ${search.tamanho === size ? 'active' : ''}`}
                    aria-pressed={search.tamanho === size}
                  >
                    {size}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {facets.colors.length > 0 && (
            <div className="refineGroup">
              <span className="eyebrow">Cor</span>
              <div className="refineOptions">
                {facets.colors.map(color => (
                  <Link
                    key={color}
                    href={shopHref(search, { cor: search.cor === color ? '' : color })}
                    className={`refineChip refineColor ${search.cor === color ? 'active' : ''}`}
                    aria-pressed={search.cor === color}
                    title={color}
                  >
                    <i style={{ backgroundColor: productColorTone(color) }} aria-hidden="true" />
                    {color}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {priceSteps.length > 0 && (
            <div className="refineGroup">
              <span className="eyebrow">Até</span>
              <div className="refineOptions">
                {priceSteps.map(value => (
                  <Link
                    key={value}
                    href={shopHref(search, { precoMax: search.precoMax === String(value) ? '' : String(value) })}
                    className={`refineChip ${search.precoMax === String(value) ? 'active' : ''}`}
                    aria-pressed={search.precoMax === String(value)}
                  >
                    {formatPrice(value)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="refineGroup refineOrder">
            <span className="eyebrow">Ordenar</span>
            <div className="refineOptions">
              {shopOrders.map(option => (
                <Link
                  key={option.value}
                  href={shopHref(search, { ordem: option.value })}
                  className={`refineChip ${order === option.value ? 'active' : ''}`}
                  aria-pressed={order === option.value}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          {hasFilters && (
            <Link href="/loja" className="textLink refineClear">
              Limpar filtros
            </Link>
          )}
        </div>

        {items.length ? (
          <div className="grid">
            {items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>Não encontramos peças nesta seleção.</p>
            <Link href="/loja" className="button dark">
              Ver todas as peças
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
