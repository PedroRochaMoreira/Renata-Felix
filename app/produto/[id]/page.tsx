'use client';

import { CheckCircle2, ChevronRight, CircleAlert, Heart, Ruler, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Footer, Header, ProductCard } from '../../components';
import { Product, formatPrice, products } from '../../data';
import { useStore } from '../../store';
import { productColors, productColorTone, productSizes } from '../../../lib/product-variants';
import { colorsInStock, preferredColor, variantStock } from '../../../lib/variants';
import { pixDiscountLabel, pixUnitPrice } from '../../../lib/pricing';

export default function Produto() {
  const { id } = useParams<{ id: string }>();
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState('');
  const { add, cart, toggleFavorite, favorites } = useStore();

  useEffect(() => { fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }).finally(() => setReady(true)); }, []);
  const product = catalog.find(item => item.id === id);
  const gallery = useMemo(() => product ? (product.images?.length ? product.images : [product.img]) : [], [product]);
  useEffect(() => setSelectedImage(0), [id]);
  useEffect(() => { if (product) setColor(preferredColor(product, product.variants || [])); }, [product?.id, product?.color]);

  if (!product && !ready) return <><Header /><main className="productPage loadingPage">Carregando peça...</main><Footer /></>;
  if (!product) return notFound();

  const variants = product.variants || [];
  const soldOut = product.stock === 0;
  const sizes = productSizes(product);
  const colors = productColors(product);
  const availableColors = colorsInStock(variants);
  const selectedColor = colors.includes(color) ? color : preferredColor(product, variants);
  // O estoque é da combinação escolhida: tamanho P esgotado não é compensado
  // pelas peças que sobraram no GG.
  const availableForVariant = variantStock(variants, size, selectedColor);
  const selectedInCart = cart.filter(line => line.id === product.id && line.size === size && (line.color || '') === selectedColor).reduce((total, line) => total + line.qty, 0);
  const related = catalog.filter(item => item.id !== product.id && item.cat === product.cat && item.stock !== 0).slice(0, 4);
  const buy = () => {
    if (soldOut) return setNotice('Esta peça está esgotada no momento.');
    if (!size) return setNotice('Selecione um tamanho para adicionar à sacola.');
    if (availableForVariant === 0) return setNotice(`O tamanho ${size} está esgotado na cor ${selectedColor}.`);
    if (selectedInCart >= availableForVariant) return setNotice(`Você já selecionou as ${availableForVariant} peça(s) disponíveis no tamanho ${size}.`);
    add(product.id, size, availableForVariant, selectedColor);
    setNotice('Peça adicionada à sua sacola.');
    window.setTimeout(() => setNotice(''), 4800);
  };

  const addedToBag = notice === 'Peça adicionada à sua sacola.';

  return <><Header /><main className="productPage"><nav className="breadcrumbs" aria-label="Caminho da página"><Link href="/">Início</Link><ChevronRight size={12} /><Link href="/loja">Loja</Link><ChevronRight size={12} /><Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`}>{product.cat}</Link><ChevronRight size={12} /><span>{product.name}</span></nav><div className="productLayout"><section className="productGallery"><div className="mainProductImage"><img src={gallery[selectedImage]} alt={product.name} /></div>{gallery.length > 1 && <div className="galleryThumbs">{gallery.map((source, index) => <button className={selectedImage === index ? 'active' : ''} type="button" onClick={() => setSelectedImage(index)} key={source}><img src={source} alt={`Ver foto ${index + 1} de ${product.name}`} /></button>)}</div>}</section><aside className="buyBox"><div className="productTopline"><span className="eyebrow">{soldOut ? 'Indisponível' : product.cat}</span><button className="iconButton productHeart" onClick={() => toggleFavorite(product.id)} aria-label="Favoritar peça"><Heart size={22} fill={favorites.includes(product.id) ? '#171717' : 'none'} /></button></div><h1 className="serif">{product.name}</h1><p className="price productPrice">{formatPrice(product.price)}</p><p className="pixPrice"><strong>{formatPrice(pixUnitPrice(product.price))}</strong> no PIX <small>({pixDiscountLabel} de desconto)</small></p><p className="installments">ou 6x de {formatPrice(product.price / 6)} sem juros no cartão</p><div className="productRule" /><div className="sizeTitle"><span className="eyebrow">Escolha o tamanho</span>{size && <span>{availableForVariant > 0 && availableForVariant <= 3 ? `${size} · últimas ${availableForVariant}` : size}</span>}</div><div className="sizes">{sizes.map(item => { const stock = variantStock(variants, item, selectedColor); return <button disabled={soldOut || stock === 0} key={item} onClick={() => setSize(item)} className={`size ${size === item ? 'active' : ''} ${stock === 0 ? 'isUnavailable' : ''}`} title={stock === 0 ? `Tamanho ${item} esgotado na cor ${selectedColor}` : undefined}>{item}</button>; })}</div><div className="sizeTitle productColorTitle"><span className="eyebrow">Escolha a cor</span><span>{selectedColor}</span></div><div className="sizes productColorChoices" role="group" aria-label={`Escolha a cor de ${product.name}`}>{colors.map(item => { const unavailable = !availableColors.includes(item); return <button disabled={soldOut || unavailable} type="button" key={item} onClick={() => setColor(item)} className={`size productColorSwatch ${selectedColor === item ? 'active' : ''} ${unavailable ? 'isUnavailable' : ''}`} style={{ backgroundColor: productColorTone(item) }} aria-label={unavailable ? `Cor ${item} esgotada` : `Selecionar cor ${item}`} aria-pressed={selectedColor === item} title={unavailable ? `${item} esgotada` : item} />; })}</div><button className="measureGuide" type="button" onClick={() => setGuide(open => !open)}><Ruler size={15} /> Guia de medidas <span>{guide ? '−' : '+'}</span></button>{guide && <div className="guide">PP: 34–36 · P: 38 · M: 40 · G: 42 · GG: 44–46.<br />As medidas são aproximadas e tomadas sobre o corpo.</div>}<button disabled={soldOut} className="button dark fullButton addToBag" onClick={buy}><ShoppingBag size={16} />{soldOut ? 'Peça esgotada' : 'Adicionar à sacola'}</button>{notice && <div className={`bagConfirmation ${addedToBag ? 'isSuccess' : 'isWarning'}`} role="status" aria-live="polite">{addedToBag ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}<span>{notice}</span>{addedToBag && <Link href="/carrinho">Ver sacola</Link>}</div>}<div className="productRule" /><div className="productDescription"><p>{product.desc}</p><details><summary>Composição e cuidados</summary><p>Seleção de materiais pensada para acompanhar a sua rotina. Consulte a etiqueta da peça para os cuidados ideais.</p></details><details><summary>Entrega e devoluções</summary><p>Envios para todo o Brasil. Você tem até 7 dias após o recebimento para solicitar uma devolução.</p></details></div></aside></div>{related.length > 0 && <section className="section related"><div className="sectionHead"><div><span className="eyebrow">Para continuar a história</span><h2 className="serif">Você também pode gostar</h2></div><Link href={`/loja?categoria=${encodeURIComponent(product.cat)}`} className="textLink">Ver {product.cat}</Link></div><div className="grid">{related.map(item => <ProductCard product={item} key={item.id} />)}</div></section>}</main><Footer /></>;
}
