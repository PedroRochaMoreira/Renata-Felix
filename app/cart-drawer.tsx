'use client';

import Link from 'next/link';
import { ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatPrice, type Product } from './data';
import { useStore } from './store';

/**
 * Confirma visualmente o que entrou na sacola sem tirar a cliente da página em
 * que ela estava — o caminho antigo obrigava a navegar até /carrinho.
 */
export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen } = useStore();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const painel = useRef<HTMLDivElement>(null);

  // O catálogo só é buscado quando a sacola abre pela primeira vez.
  useEffect(() => {
    if (!cartOpen || catalog.length) return;
    fetch('/api/catalog').then(response => response.ok ? response.json() : null)
      .then(data => { if (Array.isArray(data?.products)) setCatalog(data.products); })
      .catch(() => undefined);
  }, [cartOpen, catalog.length]);

  useEffect(() => {
    if (!cartOpen) return;
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') setCartOpen(false); };
    document.addEventListener('keydown', fechar);
    painel.current?.focus();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fechar); document.body.style.overflow = overflowAnterior; };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  const linhas = cart.map(line => ({ line, product: catalog.find(item => item.id === line.id) }));
  const subtotal = linhas.reduce((total, item) => total + (item.product?.price || 0) * item.line.qty, 0);
  const quantidade = cart.reduce((total, item) => total + item.qty, 0);

  return <div className="cartDrawerRoot">
    <button type="button" className="cartDrawerVeil" onClick={() => setCartOpen(false)} aria-label="Fechar a sacola" />
    <div className="cartDrawer" role="dialog" aria-modal="true" aria-label="Sua sacola" tabIndex={-1} ref={painel}>
      <header className="cartDrawerHead">
        <span className="eyebrow"><ShoppingBag size={14} /> Sua sacola · {quantidade} {quantidade === 1 ? 'item' : 'itens'}</span>
        <button type="button" className="iconButton" onClick={() => setCartOpen(false)} aria-label="Fechar a sacola"><X size={18} /></button>
      </header>

      {linhas.length ? <>
        <div className="cartDrawerItems">{linhas.map(({ line, product }) => (
          <article key={`${line.id}-${line.size}-${line.color || 'unico'}`}>
            {product ? <img src={product.img} alt="" width={72} height={90} /> : <span className="cartDrawerThumbEmpty" aria-hidden="true" />}
            <div>
              <b>{product?.name || 'Peça da sacola'}</b>
              <small>{[line.color, line.size].filter(Boolean).join(' · ')} × {line.qty}</small>
            </div>
            <strong>{product ? formatPrice(product.price * line.qty) : '—'}</strong>
          </article>
        ))}</div>
        <footer className="cartDrawerFoot">
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <small>Frete calculado na próxima etapa.</small>
          <Link href="/carrinho" className="button dark fullButton" onClick={() => setCartOpen(false)}>Ver sacola e calcular frete</Link>
          <button type="button" className="textLink" onClick={() => setCartOpen(false)}>Continuar comprando</button>
        </footer>
      </> : <div className="cartDrawerEmpty">
        <p>Sua sacola está vazia.</p>
        <Link href="/loja" className="button dark" onClick={() => setCartOpen(false)}>Explorar a loja</Link>
      </div>}
    </div>
  </div>;
}
