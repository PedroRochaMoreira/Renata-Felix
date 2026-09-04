import type { MetadataRoute } from 'next';
import { getCatalog } from '../lib/catalog';
import { siteUrl } from './site';

export const dynamic = 'force-dynamic';

async function catalogForSitemap() {
  try {
    return await getCatalog();
  } catch {
    // A indisponibilidade temporária do banco não deve retirar as páginas
    // institucionais do sitemap; as peças voltam na próxima geração.
    return [];
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
