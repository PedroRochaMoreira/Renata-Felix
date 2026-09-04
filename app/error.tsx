'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return <main id="conteudo" className="statusPage">
    <span className="eyebrow">Algo saiu do lugar</span>
    <h1 className="serif">Não conseguimos carregar esta página.</h1>
    <p>O problema foi registrado e já estamos vendo. Você pode tentar de novo ou voltar para a loja.</p>
    <div className="statusPageActions">
      <button type="button" className="button dark" onClick={reset}><RefreshCw size={15} /> Tentar novamente</button>
      <Link href="/loja" className="textLink">Voltar para a loja</Link>
    </div>
    {error.digest && <small className="statusPageCode">Código: {error.digest}</small>}
  </main>;
}
