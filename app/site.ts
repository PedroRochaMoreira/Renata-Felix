const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim();
const completeUrl = configuredUrl
  ? configuredUrl.startsWith('http')
    ? configuredUrl
    : `https://${configuredUrl}`
  : 'https://renatafelix.com.br';

export const siteUrl = completeUrl.replace(/\/$/, '');

export const siteName = 'Renata Felix';
export const siteDescription = 'Curadoria de moda feminina contemporânea em Luziânia, Goiás.';
