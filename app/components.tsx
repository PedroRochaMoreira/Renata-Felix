'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, Instagram, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Product, formatPrice } from './data';
import { useStore } from './store';

const navigation = [
  { href: '/', label: 'Início' },
  { href: '/loja?filtro=novidades', label: 'Novidades' },
  { href: '/loja?categoria=Vestidos', label: 'Vestidos' },
  { href: '/loja?categoria=Alfaiataria', label: 'Alfaiataria' },
  { href: '/sobre', label: 'Sobre' },
];

export function Header() {
  const { cart, favorites } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  return <>
    <div className="announcement"><span>Frete cortesia acima de R$ 1.200</span><span className="announcementDot">•</span><span>10% de desconto no Pix</span></div>
    <header className="header">
      <button className="mobileMenuButton iconButton" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      <nav className="nav" aria-label="Navegação principal">{navigation.map(item => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
      <Link href="/" className="brand brandWithMark" aria-label="Renata Felix — página inicial"><Image src="/brand/logo-renata-felix.png" alt="" width={32} height={32} priority /><span>Renata Felix</span></Link>
      <div className="headerActions">
        <Link className="iconButton desktopAction" href="/busca" aria-label="Pesquisar"><Search size={19} /></Link>
        <Link className="iconButton desktopAction" href="/favoritos" aria-label="Favoritos"><Heart size={19} />{favorites.length > 0 && <small>{favorites.length}</small>}</Link>
        <Link className="iconButton desktopAction" href="/login" aria-label="Entrar ou acessar minha conta"><UserRound size={18} /></Link>
        <Link className="iconButton" href="/carrinho" aria-label="Sacola"><ShoppingBag size={19} />{cartCount > 0 && <small>{cartCount}</small>}</Link>
      </div>
    </header>
    <div className={`mobileNav ${menuOpen ? 'isOpen' : ''}`} aria-hidden={!menuOpen}>
      <nav>{navigation.map(item => <Link href={item.href} key={item.href} onClick={closeMenu}>{item.label}</Link>)}<Link href="/busca" onClick={closeMenu}>Buscar</Link><Link href="/favoritos" onClick={closeMenu}>Favoritos</Link><Link href="/login" onClick={closeMenu}>Minha conta</Link></nav>
    </div>
  </>;
}

export function Footer() {
  return <footer className="footer">
    <div className="footerTop">
      <div className="footerBrand"><Link href="/" className="brand brandWithMark"><Image src="/brand/logo-renata-felix.png" alt="" width={38} height={38} /><span>Renata Felix</span></Link><p>Uma curadoria de peças para acompanhar a sua história com presença, leveza e intenção.</p><a className="socialLink" href="https://www.instagram.com/renatafelixstore/" target="_blank" rel="noreferrer"><Instagram size={16} /> @renatafelixstore</a></div>
      <div><h4>Institucional</h4><Link href="/sobre">A marca</Link><Link href="/lojas">Nossa loja</Link><Link href="/contato">Contato</Link></div>
      <div><h4>Atendimento</h4><Link href="/contato">Entrega e prazos</Link><Link href="/contato">Trocas e devoluções</Link><Link href="/contato">Perguntas frequentes</Link></div>
      <div><h4>Fale conosco</h4><p>Seg. a sex. · 9h às 18h</p><a href="https://www.instagram.com/renatafelixstore/" target="_blank" rel="noreferrer">@renatafelixstore</a><a href="tel:+5561994230194">(61) 99423-0194</a></div>
    </div>
    <div className="footerBottom"><span>© 2026 Renata Felix. Todos os direitos reservados.</span><span>Luziânia · GO · Brasil</span></div>
  </footer>;
}

export function ProductCard({ product }: { product: Product }) {
  const { favorites, toggleFavorite } = useStore();
  const soldOut = product.stock === 0;
  const label = soldOut ? 'Esgotado' : product.tag || (product.isNew ? 'Novo' : '');
  return <article className={`productCard ${soldOut ? 'isSoldOut' : ''}`}>
    <button className="iconButton fav" onClick={() => toggleFavorite(product.id)} aria-label={`${favorites.includes(product.id) ? 'Remover' : 'Adicionar'} ${product.name} dos favoritos`}><Heart size={17} fill={favorites.includes(product.id) ? '#171717' : 'none'} /></button>
    <Link className="productImage" href={`/produto/${product.id}`}><span className="imageShade" />{label && <span className="tag">{label}</span>}<img src={product.img} alt={product.name} loading="lazy" /></Link>
    <Link href={`/produto/${product.id}`} className="productMeta"><div><p>{product.name}</p><span>{product.color}</span></div><strong className="price">{formatPrice(product.price)}</strong></Link>
  </article>;
}

export function Newsletter() {
  const [status, setStatus] = useState('');
  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') || '').trim();
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) return setStatus(data.error || 'Não foi possível cadastrar seu e-mail.');
      form.reset();
      setStatus('Seu e-mail foi recebido. Seja bem-vinda à nossa carta.');
    } catch { setStatus('Não foi possível conectar ao servidor. Tente novamente.'); }
  };
  return <section className="newsletter"><div><span className="eyebrow">Carta Renata Felix</span><h2 className="serif">Um convite para estar por perto.</h2><p>Novidades, histórias e escolhas feitas com calma, direto no seu e-mail.</p></div><div><form className="emailForm" onSubmit={subscribe}><input name="email" required type="email" placeholder="Seu melhor e-mail" aria-label="Seu melhor e-mail" /><button aria-label="Cadastrar e-mail"><ArrowRight size={19} /></button></form>{status && <p className="newsletterStatus">{status}</p>}</div></section>;
}
