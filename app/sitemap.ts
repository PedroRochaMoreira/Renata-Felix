import type { MetadataRoute } from 'next';
import { products } from './data';
import { inventory, listProducts, overrides } from '../lib/store';
import { siteUrl } from './site';

export const dynamic = 'force-dynamic';

async function catalogForSitemap() {
  try {
    const stock = await inventory();
    const edited = await overrides();
    return [...await listProducts(), ...products]
      .filter(product => !stock[product.id]?.deleted)
      .map(product => ({ ...product, ...edited[product.id] }));
  } catch {
    // A indisponibilidade temporária do banco não deve retirar o sitemap do ar.
    return products;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const catalog = await catalogForSitemap();

  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/loja`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/lojas`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/contato`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/trocas`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/termos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  return [...pages, ...catalog.map(product => ({
    url: `${siteUrl}/produto/${encodeURIComponent(product.id)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))];
}
