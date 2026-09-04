import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buscar peças',
  description: 'Encontre a peça que você procura na curadoria Renata Felix.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
