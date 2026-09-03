import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fale conosco',
  description: 'Tire dúvidas sobre peças, tamanhos, entrega ou pedidos com a equipe da Renata Felix.',
  alternates: { canonical: '/contato' },
  openGraph: { url: '/contato' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
