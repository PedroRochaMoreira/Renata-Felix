import type { MetadataRoute } from 'next';
import { siteDescription, siteName } from './site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} — Moda feminina em Luziânia`,
    short_name: siteName,
    description: siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#fffdfa',
    theme_color: '#fffdfa',
    lang: 'pt-BR',
    categories: ['shopping', 'lifestyle'],
    icons: [{ src: '/brand/logo-renata-felix.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
