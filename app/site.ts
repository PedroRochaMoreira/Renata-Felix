/**
 * `VERCEL_URL` é o endereço do deploy e muda a cada publicação — usá-lo no
 * sitemap, no canonical ou em links de e-mail cria URLs que morrem na próxima
 * versão. A preferência é sempre por um domínio estável.
 */
const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  || process.env.VERCEL_URL?.trim();

const completeUrl = configuredUrl
  ? (configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`)
  : 'http://localhost:3000';

export const siteUrl = completeUrl.replace(/\/$/, '');

export const siteName = 'Renata Felix';
export const siteDescription = 'Curadoria de moda feminina contemporânea em Luziânia, Goiás.';
