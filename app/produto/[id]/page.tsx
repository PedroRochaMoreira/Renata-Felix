import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ChevronRight } from 'lucide-react';
import { Footer, Header, ProductCard } from '@/app/components';
import { getCatalog } from '@/lib/catalog';
import { siteName, siteUrl } from '@/app/site';
import ProductDetail from './product-detail';

export const dynamic = 'force-dynamic';

/** `cache` evita uma segunda ida ao banco entre generateMetadata e a página. */
const catalogo = cache(async () => {
  try { return await getCatalog(); } catch { return []; }
});

async function findProduct(id: string) {
  return (await catalogo()).find(product => product.id === decodeURIComponent(id));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await findProduct((await params).id);
  if (!product) return { title: 'Peça não encontrada' };

  const url = `${siteUrl}/produto/${encodeURIComponent(product.id)}`;
  const description = `${product.desc} ${product.cat} em ${product.color}, na curadoria ${siteName}.`.slice(0, 300);
  const images = (product.images?.length ? product.images : [product.img]).slice(0, 4);

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: `${product.name} — ${siteName}`, description, images, locale: 'pt_BR', siteName },
    twitter: { card: 'summary_large_image', title: `${product.name} — ${siteName}`, description, images },
  };
}

export default async function Produto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await findProduct(id);
  if (!product) notFound();

  const catalog = await catalogo();
  const related = catalog.filter(item => item.id !== product.id && item.cat === product.cat && item.stock !== 0).slice(0, 4);
  const url = `${siteUrl}/produto/${encodeURIComponent(product.id)}`;

  // Sem estes dados estruturados o Google não reconhece preço nem disponibilidade.
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: product.name,
        description: product.desc,
        image: (product.images?.length ? product.images : [product.img]),
        sku: product.id,
        category: product.cat,
        color: product.color,
        brand: { '@type': 'Brand', name: siteName },
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'BRL',
          price: product.price.toFixed(2),
          itemCondition: 'https://schema.org/NewCondition',
          availability: (product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Loja', item: `${siteUrl}/loja` },
          { '@type': 'ListItem', position: 3, name: product.cat, item: `${siteUrl}/loja?categoria=${encodeURIComponent(product.cat)}` },
          { '@type': 'ListItem', position: 4, name: product.name, item: url },
        ],
      },
    ],
  };

  return <>
    <Header />
    <main id="conteudo" className="productPage">
      <nav className="breadcrumbs" aria-label="Caminho da página">
        <Link href="/">Início</Link><ChevronRight size={12} />
        <Link href="/loja">Loja</Link><ChevronRight size={12} />
        <Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`}>{product.cat}</Link><ChevronRight size={12} />
        <span>{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      {related.length > 0 && <section className="section related">
        <div className="sectionHead">
          <div><span className="eyebrow">Para continuar a história</span><h2 className="serif">Você também pode gostar</h2></div>
          <Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`} className="textLink">Ver {product.cat}</Link>
        </div>
        <div className="grid">{related.map(item => <ProductCard product={item} key={item.id} />)}</div>
      </section>}
    </main>
    <Footer />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  </>;
}
