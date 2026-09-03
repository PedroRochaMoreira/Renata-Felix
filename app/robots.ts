import type { MetadataRoute } from 'next';
import { siteUrl } from './site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/busca', '/carrinho', '/checkout', '/conta', '/favoritos', '/login'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
