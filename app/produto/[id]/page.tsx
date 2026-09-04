import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductView from './product-view';
import { Footer, Header, ProductCard } from '../../components';
import { siteName, siteUrl } from '../../site';
import { findCatalogProduct, getCatalog, productImages } from '../../../lib/catalog';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

function absoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

function shortDescription(text: string) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 155 ? `${clean.slice(0, 152).trimEnd()}...` : clean;
}

/**
 * Cada peça passa a ter título, descrição e imagem próprios. Antes todas
 * herdavam o mesmo texto do layout, o que deixava as páginas de produto
 * indistinguíveis para buscadores e em links compartilhados.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await findCatalogProduct(id);
  if (!product) return { title: 'Peça não encontrada' };

  const description = shortDescription(product.desc);
  const images = productImages(product).map(absoluteUrl);
  const url = `${siteUrl}/produto/${encodeURIComponent(product.id)}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName,
      url,
      title: `${product.name} — ${siteName}`,
      description,
      images: images.map(image => ({ url: image, alt: product.name })),
    },
    twitter: { card: 'summary_large_image', title: `${product.name} — ${siteName}`, description, images },
  };
}

export default async function ProdutoPage({ params }: PageProps) {
  const { id } = await params;
  const product = await findCatalogProduct(id);
  if (!product) notFound();

  const catalog = await getCatalog();
  const related = catalog.filter(item => item.id !== product.id && item.cat === product.cat && item.stock !== 0).slice(0, 4);
  const url = `${siteUrl}/produto/${encodeURIComponent(product.id)}`;

  // O schema de produto é o que permite ao Google mostrar preço e
  // disponibilidade direto no resultado da busca.
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: shortDescription(product.desc),
    image: productImages(product).map(absoluteUrl),
    sku: product.id,
    category: product.cat,
    color: product.color,
    brand: { '@type': 'Brand', name: siteName },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: siteName },
    },
  };

  return (
    <>
      <Header />
      <main id="conteudo" tabIndex={-1} className="productPage">
        <nav className="breadcrumbs" aria-label="Caminho da página">
          <Link href="/">Início</Link>
          <ChevronRight size={12} />
          <Link href="/loja">Loja</Link>
          <ChevronRight size={12} />
          <Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`}>{product.cat}</Link>
          <ChevronRight size={12} />
          <span>{product.name}</span>
        </nav>

        <ProductView product={product} key={product.id} />

        {related.length > 0 && (
          <section className="section related">
            <div className="sectionHead">
              <div>
                <span className="eyebrow">Para continuar a história</span>
                <h2 className="serif">Você também pode gostar</h2>
              </div>
              <Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`} className="textLink">
                Ver {product.cat}
              </Link>
            </div>
            <div className="grid">
              {related.map(item => (
                <ProductCard product={item} key={item.id} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    </>
  );
}
