import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * `script-src` ainda precisa de 'unsafe-inline' por causa dos scripts que o
 * Next injeta para hidratação e do JSON-LD do layout. Uma CSP com nonce exige
 * middleware e tornaria dinâmica toda página hoje estática — fica como próximo
 * passo. As demais diretivas já valem por si: bloqueiam plugins, reescrita de
 * <base>, envio de formulário para fora e enquadramento do site.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  // O globals.css importa as fontes Manrope, Playfair Display e DM Mono.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.blob.vercel-storage.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Consulta de CEP no checkout.
  "connect-src 'self' https://viacep.com.br",
  // Mapa da página /lojas.
  'frame-src https://www.google.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Fotos enviadas pelo painel administrativo.
      { protocol: 'https', hostname: '*.blob.vercel-storage.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
