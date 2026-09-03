import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confirmar e-mail',
  description: 'Confirmação do endereço de e-mail da sua conta Renata Felix.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
