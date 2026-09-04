import './globals.css';
import type { Metadata, Viewport } from 'next';
import { DM_Mono, Manrope, Playfair_Display } from 'next/font/google';
import CookieConsent from './cookie-consent';
import { StoreProvider } from './store';
import { siteDescription, siteName, siteUrl } from './site';

/**
 * As fontes eram carregadas por @import dentro do CSS, o pior caminho: o
 * navegador só descobria que precisava delas depois de baixar e interpretar a
 * folha inteira, e aí abria conexão com outro domínio. Servidas daqui, elas
 * viajam junto com o site e não provocam salto de layout ao trocar.
 */
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

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
    <html lang="pt-BR" className={`${manrope.variable} ${playfair.variable} ${dmMono.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
        <CookieConsent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      </body>
    </html>
  );
}
