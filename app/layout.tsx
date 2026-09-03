import './globals.css';
import type { Metadata, Viewport } from 'next';
import CookieConsent from './cookie-consent';
import { StoreProvider } from './store';
import { siteDescription, siteName, siteUrl } from './site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Renata Felix — Moda feminina em Luziânia',
    template: '%s | Renata Felix',
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ['Renata Felix', 'moda feminina', 'roupas femininas', 'Luziânia', 'Goiás', 'vestidos', 'alfaiataria'],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: 'fashion',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName,
    title: 'Renata Felix — Moda feminina em Luziânia',
    description: siteDescription,
    images: [{ url: '/brand/fachada-renata-felix.png', width: 1290, height: 1086, alt: 'Fachada da Renata Felix Store' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Renata Felix — Moda feminina em Luziânia',
    description: siteDescription,
    images: ['/brand/fachada-renata-felix.png'],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#fffdfa',
  colorScheme: 'light',
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'ClothingStore',
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  image: `${siteUrl}/brand/fachada-renata-felix.png`,
  logo: `${siteUrl}/brand/logo-renata-felix.png`,
  telephone: '+55 61 99423-0194',
  sameAs: ['https://www.instagram.com/renatafelixstore/'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'R. José Alencar, Qd. 77, Lt. 12',
    addressLocality: 'Luziânia',
    addressRegion: 'GO',
    postalCode: '72804-030',
    addressCountry: 'BR',
  },
  areaServed: 'BR',
  priceRange: '$$',
  slogan: 'Curadoria de moda feminina contemporânea.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider>{children}</StoreProvider>
        <CookieConsent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      </body>
    </html>
  );
}
