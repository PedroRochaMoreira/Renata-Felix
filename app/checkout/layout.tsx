import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finalizar pedido',
  description: 'Conclua sua compra com pagamento seguro pelo Mercado Pago.',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
