import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sacola',
  description: 'Revise as peças escolhidas antes de finalizar a compra.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
