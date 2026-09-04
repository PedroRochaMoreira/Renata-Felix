import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recuperar senha',
  description: 'Receba um link para criar uma nova senha da sua conta.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
