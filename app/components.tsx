'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, Instagram, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Product, formatPrice } from './data';
import CartDrawer from './cart-drawer';
import { useToast } from './toast';
import { useStore } from './store';

const navigation = [
  { href: '/', label: 'Início' },
  { href: '/loja?filtro=novidades', label: 'Novidades' },
  { href: '/loja?categoria=Vestidos', label: 'Vestidos' },
  { href: '/loja?categoria=Alfaiataria', label: 'Alfaiataria' },
  { href: '/sobre', label: 'Sobre' },
  { href: '/contato', label: 'Fale conosco' },
];

export function Header() {
  const { cart, favorites, setCartOpen } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);
  const botaoMenu = useRef<HTMLButtonElement>(null);

  // Fecha com Esc e devolve o foco ao botão que abriu, como se espera de um menu.
  useEffect(() => {
    if (!menuOpen) return;
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      botaoMenu.current?.focus();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [menuOpen]);

  return <>
    <div className="announcement"><span>Frete cortesia acima de R$ 1.200</span><span className="announcementDot">•</span><span>10% de desconto no Pix</span></div>
    <header className="header">
      <button ref={botaoMenu} type="button" className="mobileMenuButton iconButton" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-controls="menu-mobile" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      <nav className="nav" aria-label="Navegação principal">{navigation.map(item => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
      <Link href="/" className="brand brandWithMark" aria-label="Renata Felix — página inicial"><Image src="/brand/logo-renata-felix.png" alt="" width={32} height={32} priority /><span>Renata Felix</span></Link>
      <div className="headerActions">
        <Link className="iconButton desktopAction" href="/busca" aria-label="Pesquisar"><Search size={19} /></Link>
        <Link className="iconButton desktopAction" href="/favoritos" aria-label="Favoritos"><Heart size={19} />{favorites.length > 0 && <small>{favorites.length}</small>}</Link>
        <Link className="iconButton desktopAction" href="/login" aria-label="Entrar ou acessar minha conta"><UserRound size={18} /></Link>
        <button type="button" className="iconButton" onClick={() => setCartOpen(true)} aria-label={`Abrir a sacola${cartCount > 0 ? ` com ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : ''}`}><ShoppingBag size={19} />{cartCount > 0 && <small>{cartCount}</small>}</button>
      </div>
    </header>
    <div id="menu-mobile" className={`mobileNav ${menuOpen ? 'isOpen' : ''}`} inert={!menuOpen}>
      <nav>{navigation.map(item => <Link href={item.href} key={item.href} onClick={closeMenu}>{item.label}</Link>)}<Link href="/busca" onClick={closeMenu}>Buscar</Link><Link href="/favoritos" onClick={closeMenu}>Favoritos</Link><Link href="/login" onClick={closeMenu}>Minha conta</Link></nav>
    </div>
    <CartDrawer />
  </>;
}

export function Footer() {
  return <footer className="footer">
    <div className="footerTop">
      <div className="footerBrand"><Link href="/" className="footerBrandLink" aria-label="Renata Felix — página inicial"><span className="footerWordmark">Renata Felix</span><span className="footerSignatureDetail">Store · Luziânia, GO</span></Link><p>Uma curadoria de peças para acompanhar a sua história com presença, leveza e intenção.</p><a className="socialLink" href="https://www.instagram.com/renatafelixstore/" target="_blank" rel="noreferrer"><Instagram size={16} /> @renatafelixstore</a></div>
      <div><h4>Institucional</h4><Link href="/sobre">A marca</Link><Link href="/lojas">Nossa loja</Link><Link href="/contato">Contato</Link></div>
      <div><h4>Atendimento</h4><Link href="/trocas#entrega">Entrega e prazos</Link><Link href="/trocas">Trocas e devoluções</Link><Link href="/contato">Perguntas frequentes</Link></div>
      <div><h4>Fale conosco</h4><p>Seg. a sex. · 9h às 18h</p><a href="https://www.instagram.com/renatafelixstore/" target="_blank" rel="noreferrer">@renatafelixstore</a><a href="tel:+5561994230194">(61) 99423-0194</a><Link className="footerContactLink" href="/contato">Enviar uma mensagem</Link></div>
    </div>
    <div className="footerBottom"><span>© 2026 Renata Felix. Todos os direitos reservados.</span><nav className="footerLegal" aria-label="Informações legais"><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><button type="button" onClick={() => window.dispatchEvent(new Event('rf:manage-cookies'))}>Preferências de cookies</button></nav><span>Luziânia · GO · Brasil</span></div>
  </footer>;
}

/** `priority` deve ser usado nas primeiras peças da grade: são o LCP da página. */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { favorites, toggleFavorite } = useStore();
  const soldOut = product.stock === 0;
  const label = soldOut ? 'Esgotado' : product.tag || (product.isNew ? 'Novo' : '');
  return <article className={`productCard ${soldOut ? 'isSoldOut' : ''}`}>
    <button className="iconButton fav" onClick={() => toggleFavorite(product.id)} aria-label={`${favorites.includes(product.id) ? 'Remover' : 'Adicionar'} ${product.name} dos favoritos`}><Heart size={17} fill={favorites.includes(product.id) ? '#171717' : 'none'} /></button>
    <Link className="productImage" href={`/produto/${product.id}`}><span className="imageShade" />{label && <span className="tag">{label}</span>}<Image src={product.img} alt={product.name} fill priority={priority} sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" style={{ objectFit: 'cover' }} /></Link>
    <Link href={`/produto/${product.id}`} className="productMeta"><div><p>{product.name}</p><span>{product.color}</span></div><strong className="price">{formatPrice(product.price)}</strong></Link>
  </article>;
}

export function Newsletter() {
  const { notify } = useToast();
  const [enviando, setEnviando] = useState(false);
  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') || '').trim();
    setEnviando(true);
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) return notify(data.error || 'Não foi possível cadastrar seu e-mail.', 'error');
      form.reset();
      notify('Seu e-mail foi recebido. Seja bem-vinda à nossa carta.');
    } catch {
      notify('Não foi possível conectar ao servidor. Tente novamente.', 'error');
    } finally {
      setEnviando(false);
    }
  };
  return <section className="newsletter"><div><span className="eyebrow">Carta Renata Felix</span><h2 className="serif">Um convite para estar por perto.</h2><p>Novidades, histórias e escolhas feitas com calma, direto no seu e-mail.</p></div><div><form className="emailForm" onSubmit={subscribe}><input name="email" required type="email" placeholder="Seu melhor e-mail" aria-label="Seu melhor e-mail" /><button disabled={enviando} aria-label="Cadastrar e-mail"><ArrowRight size={19} /></button></form></div></section>;
}
