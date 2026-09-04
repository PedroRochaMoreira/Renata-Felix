import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favoritos',
  description: 'As peças que você salvou para revisitar depois.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
