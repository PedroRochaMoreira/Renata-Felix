'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, CircleAlert, Heart, Ruler, ShoppingBag, X, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatPrice, type Product } from '@/app/data';
import { useStore } from '@/app/store';
import { defaultProductColor, productColors, productColorTone, productSizes } from '@/lib/product-variants';

/**
 * Recebe a peça já resolvida no servidor: o HTML entregue ao navegador e ao
 * Google contém nome, preço, fotos e descrição. Aqui fica só a interação.
 */
export default function ProductDetail({ product }: { product: Product }) {
  const gallery = product.images?.length ? product.images : [product.img];
  const sizes = productSizes(product);
  const colors = productColors(product);
  const soldOut = product.stock === 0;

  const [size, setSize] = useState('');
  const [color, setColor] = useState(defaultProductColor(product));
  const [selectedImage, setSelectedImage] = useState(0);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState('');
  const [zoom, setZoom] = useState(false);
  const { add, cart, toggleFavorite, favorites } = useStore();

  useEffect(() => { setSelectedImage(0); setSize(''); setColor(defaultProductColor(product)); }, [product]);

  // Ver o tecido de perto é decisivo em moda; o zoom fecha com Esc e com seta troca a foto.
  useEffect(() => {
    if (!zoom) return;
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(false);
      if (event.key === 'ArrowRight') setSelectedImage(atual => (atual + 1) % gallery.length);
      if (event.key === 'ArrowLeft') setSelectedImage(atual => (atual - 1 + gallery.length) % gallery.length);
    };
    document.addEventListener('keydown', aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', aoTeclar); document.body.style.overflow = anterior; };
  }, [zoom, gallery.length]);

  const selectedColor = colors.includes(color) ? color : defaultProductColor(product);
  const selectedInCart = cart.filter(line => line.id === product.id).reduce((total, line) => total + line.qty, 0);
  const remaining = product.stock ?? 0;
  const addedToBag = notice === 'Peça adicionada à sua sacola.';

  const buy = () => {
    if (soldOut) return setNotice('Esta peça está esgotada no momento.');
    if (!size) return setNotice('Selecione um tamanho para adicionar à sacola.');
    if (selectedInCart >= (product.stock ?? 99)) return setNotice('Você já selecionou a quantidade disponível desta peça.');
    add(product.id, size, product.stock ?? 99, selectedColor);
    setNotice('Peça adicionada à sua sacola.');
    window.setTimeout(() => setNotice(''), 4800);
  };

  return <div className="productLayout">
    <section className="productGallery">
      <button type="button" className="mainProductImage" onClick={() => setZoom(true)} aria-label={`Ampliar a foto de ${product.name}`}>
        <Image src={gallery[selectedImage]} alt={product.name} fill priority sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
        <span className="zoomHint" aria-hidden="true"><ZoomIn size={16} /></span>
      </button>
      {gallery.length > 1 && <div className="galleryThumbs">{gallery.map((source, index) => (
        <button className={selectedImage === index ? 'active' : ''} type="button" onClick={() => setSelectedImage(index)} key={source} aria-label={`Ver foto ${index + 1} de ${product.name}`} aria-pressed={selectedImage === index}>
          <Image src={source} alt="" width={160} height={200} sizes="160px" />
        </button>
      ))}</div>}
    </section>

    <aside className="buyBox">
      <div className="productTopline">
        <span className="eyebrow">{soldOut ? 'Indisponível' : product.cat}</span>
        <button className="iconButton productHeart" onClick={() => toggleFavorite(product.id)} aria-label={`${favorites.includes(product.id) ? 'Remover' : 'Adicionar'} ${product.name} dos favoritos`}>
          <Heart size={22} fill={favorites.includes(product.id) ? '#171717' : 'none'} />
        </button>
      </div>
      <h1 className="serif">{product.name}</h1>
      <p className="price productPrice">{formatPrice(product.price)}</p>
      <p className="installments">ou 6x de {formatPrice(product.price / 6)} sem juros · {formatPrice(product.price * 0.9)} no Pix</p>
      {!soldOut && remaining > 0 && remaining <= 3 && (
        <p className="stockWarning" role="status">{remaining === 1 ? 'Última peça disponível.' : `Últimas ${remaining} peças disponíveis.`}</p>
      )}

      <div className="productRule" />

      <div className="sizeTitle"><span className="eyebrow">Escolha o tamanho</span>{size && <span>{size}</span>}</div>
      <div className="sizes">{sizes.map(item => (
        <button disabled={soldOut} key={item} type="button" onClick={() => setSize(item)} className={`size ${size === item ? 'active' : ''}`} aria-pressed={size === item}>{item}</button>
      ))}</div>

      <div className="sizeTitle productColorTitle"><span className="eyebrow">Escolha a cor</span><span>{selectedColor}</span></div>
      <div className="sizes productColorChoices" role="group" aria-label={`Escolha a cor de ${product.name}`}>{colors.map(item => (
        <button disabled={soldOut} type="button" key={item} onClick={() => setColor(item)} className={`size productColorSwatch ${selectedColor === item ? 'active' : ''}`} style={{ backgroundColor: productColorTone(item) }} aria-label={`Selecionar cor ${item}`} aria-pressed={selectedColor === item} title={item}>
          <span className="visuallyHidden">{item}</span>
        </button>
      ))}</div>

      <button className="measureGuide" type="button" onClick={() => setGuide(open => !open)} aria-expanded={guide}>
        <Ruler size={15} /> Guia de medidas <span aria-hidden="true">{guide ? '−' : '+'}</span>
      </button>
      {guide && <div className="guide">PP: 34–36 · P: 38 · M: 40 · G: 42 · GG: 44–46.<br />As medidas são aproximadas e tomadas sobre o corpo.</div>}

      <button disabled={soldOut} className="button dark fullButton addToBag" onClick={buy}>
        <ShoppingBag size={16} />{soldOut ? 'Peça esgotada' : 'Adicionar à sacola'}
      </button>
      {notice && <div className={`bagConfirmation ${addedToBag ? 'isSuccess' : 'isWarning'}`} role="status" aria-live="polite">
        {addedToBag ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}<span>{notice}</span>
        {addedToBag && <Link href="/carrinho">Ver sacola</Link>}
      </div>}

      <div className="productRule" />
      <div className="productDescription">
        <p>{product.desc}</p>
        <details><summary>Composição e cuidados</summary><p>Seleção de materiais pensada para acompanhar a sua rotina. Consulte a etiqueta da peça para os cuidados ideais.</p></details>
        <details><summary>Entrega e devoluções</summary><p>Envios para todo o Brasil. Você tem até 7 dias após o recebimento para solicitar uma devolução.</p></details>
      </div>
    </aside>

    {zoom && <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Fotos de ${product.name}`}>
      <button type="button" className="lightboxVeil" onClick={() => setZoom(false)} aria-label="Fechar a ampliação" />
      <figure>
        <Image src={gallery[selectedImage]} alt={product.name} width={1400} height={1750} sizes="(max-width: 900px) 100vw, 80vw" style={{ width: 'auto', height: '100%', objectFit: 'contain' }} />
      </figure>
      {gallery.length > 1 && <div className="lightboxThumbs">{gallery.map((source, index) => (
        <button type="button" key={source} className={selectedImage === index ? 'active' : ''} onClick={() => setSelectedImage(index)} aria-label={`Ver foto ${index + 1}`} aria-pressed={selectedImage === index}>
          <Image src={source} alt="" width={90} height={112} sizes="90px" />
        </button>
      ))}</div>}
      <button type="button" className="lightboxClose iconButton" onClick={() => setZoom(false)} aria-label="Fechar a ampliação"><X size={20} /></button>
    </div>}
  </div>;
}
