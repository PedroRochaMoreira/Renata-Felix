'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Mantém a consulta na URL para que a busca possa ser compartilhada e
 * retomada pelo botão voltar. O debounce evita uma navegação por tecla.
 */
export default function SearchField({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) { primeiraRenderizacao.current = false; return; }
    const timer = window.setTimeout(() => {
      const termo = query.trim();
      router.replace(termo ? `/busca?q=${encodeURIComponent(termo)}` : '/busca', { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, router]);

  return <div className="searchInputWrap">
    <Search size={21} aria-hidden="true" />
    <input
      autoFocus
      className="searchField"
      type="search"
      value={query}
      onChange={event => setQuery(event.target.value)}
      placeholder="Vestidos, cores, alfaiataria..."
      aria-label="Buscar peças"
    />
  </div>;
}
