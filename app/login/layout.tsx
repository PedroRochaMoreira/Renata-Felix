import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar ou criar conta',
  description: 'Acesse sua conta Renata Felix para acompanhar pedidos e favoritos.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
