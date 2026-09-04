'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Falha ao renderizar a página:', error);
  }, [error]);

  return (
    <main className="empty pageError" id="conteudo">
      <span className="eyebrow">Algo saiu do lugar</span>
      <h1 className="serif">Não conseguimos carregar esta página.</h1>
      <p>Pode ter sido uma instabilidade momentânea. Tente de novo em instantes.</p>
      <div className="pageErrorActions">
        <button className="button dark" onClick={reset}>
          Tentar novamente
        </button>
        <Link href="/" className="textLink">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
