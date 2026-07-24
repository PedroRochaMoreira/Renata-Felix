'use client';

import { ChevronRight, Heart, Ruler, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Footer, Header, ProductCard } from '../../components';
import { Product, formatPrice, products } from '../../data';
import { useStore } from '../../store';

const defaultSizes = ['PP', 'P', 'M', 'G', 'GG'];

export default function Produto() {
  const { id } = useParams<{ id: string }>();
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState('');
  const { add, cart, toggleFavorite, favorites } = useStore();

  useEffect(() => { fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }).finally(() => setReady(true)); }, []);
  const product = catalog.find(item => item.id === id);
  const gallery = useMemo(() => product ? (product.images?.length ? product.images : [product.img]) : [], [product]);
  useEffect(() => setSelectedImage(0), [id]);

  if (!product && !ready) return <><Header /><main className="productPage loadingPage">Carregando peça...</main><Footer /></>;
  if (!product) return notFound();

  const soldOut = product.stock === 0;
  const sizes = product.sizes?.length ? product.sizes : defaultSizes;
  const selectedInCart = cart.find(line => line.id === product.id && line.size === size)?.qty || 0;
  const related = catalog.filter(item => item.id !== product.id && item.cat === product.cat && item.stock !== 0).slice(0, 4);
  const buy = () => {
    if (soldOut) return setNotice('Esta peça está esgotada no momento.');
    if (!size) return setNotice('Selecione um tamanho para adicionar à sacola.');
    if (selectedInCart >= (product.stock ?? 99)) return setNotice('Você já selecionou a quantidade disponível desta peça.');
    add(product.id, size, product.stock ?? 99);
    setNotice('Peça adicionada à sua sacola.');
    window.setTimeout(() => setNotice(''), 2800);
  };

  return <><Header /><main className="productPage"><nav className="breadcrumbs" aria-label="Caminho da página"><Link href="/">Início</Link><ChevronRight size={12} /><Link href="/loja">Loja</Link><ChevronRight size={12} /><Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`}>{product.cat}</Link><ChevronRight size={12} /><span>{product.name}</span></nav><div className="productLayout"><section className="productGallery"><div className="mainProductImage"><img src={gallery[selectedImage]} alt={product.name} /></div>{gallery.length > 1 && <div className="galleryThumbs">{gallery.map((source, index) => <button className={selectedImage === index ? 'active' : ''} type="button" onClick={() => setSelectedImage(index)} key={source}><img src={source} alt={`Ver foto ${index + 1} de ${product.name}`} /></button>)}</div>}</section><aside className="buyBox"><div className="productTopline"><span className="eyebrow">{soldOut ? 'Indisponível' : product.cat}</span><button className="iconButton productHeart" onClick={() => toggleFavorite(product.id)} aria-label="Favoritar peça"><Heart size={22} fill={favorites.includes(product.id) ? '#171717' : 'none'} /></button></div><h1 className="serif">{product.name}</h1><p className="price productPrice">{formatPrice(product.price)}</p><p className="installments">ou 6x de {formatPrice(product.price / 6)} sem juros</p><div className="productRule" /><div className="sizeTitle"><span className="eyebrow">Escolha o tamanho</span>{size && <span>{size}</span>}</div><div className="sizes">{sizes.map(item => <button disabled={soldOut} key={item} onClick={() => setSize(item)} className={`size ${size === item ? 'active' : ''}`}>{item}</button>)}</div><button className="measureGuide" type="button" onClick={() => setGuide(open => !open)}><Ruler size={15} /> Guia de medidas <span>{guide ? '−' : '+'}</span></button>{guide && <div className="guide">PP: 34–36 · P: 38 · M: 40 · G: 42 · GG: 44–46.<br />As medidas são aproximadas e tomadas sobre o corpo.</div>}<button disabled={soldOut} className="button dark fullButton addToBag" onClick={buy}><ShoppingBag size={16} />{soldOut ? 'Peça esgotada' : 'Adicionar à sacola'}</button>{notice && <p className="notice">{notice}</p>}<div className="productRule" /><div className="productDescription"><p>{product.desc}</p><details><summary>Composição e cuidados</summary><p>Seleção de materiais pensada para acompanhar a sua rotina. Consulte a etiqueta da peça para os cuidados ideais.</p></details><details><summary>Entrega e devoluções</summary><p>Envios para todo o Brasil. Você tem até 7 dias após o recebimento para solicitar uma devolução.</p></details></div></aside></div>{related.length > 0 && <section className="section related"><div className="sectionHead"><div><span className="eyebrow">Para continuar a história</span><h2 className="serif">Você também pode gostar</h2></div><Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`} className="textLink">Ver {product.cat}</Link></div><div className="grid">{related.map(item => <ProductCard product={item} key={item.id} />)}</div></section>}</main><Footer /></>;
}
