import type { ReactNode } from 'react';
import { Footer, Header } from './components';

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalDocument({ eyebrow, title, updatedAt, children }: LegalDocumentProps) {
  return (
    <>
      <Header />
      <main id="conteudo" tabIndex={-1} className="legalPage">
        <header className="legalHero">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="serif">{title}</h1>
          <p>Transparência é parte da nossa forma de cuidar da sua experiência.</p>
          <span className="legalUpdated">Atualizado em {updatedAt}</span>
        </header>
        <article className="legalContent">{children}</article>
      </main>
      <Footer />
    </>
  );
}
