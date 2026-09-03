'use client';

import { CheckCircle2, CircleAlert, Heart, Ruler, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Product, formatPrice } from '../../data';
import { useStore } from '../../store';
import { productColors, productColorTone, productSizes } from '../../../lib/product-variants';
import { colorsInStock, preferredColor, variantStock } from '../../../lib/variants';
import { pixDiscountLabel, pixUnitPrice } from '../../../lib/pricing';

const addedMessage = 'Peça adicionada à sua sacola.';

/**
 * Só a escolha de tamanho, cor e quantidade precisa rodar no navegador. O
 * conteúdo que o Google lê — nome, preço, descrição e fotos — é montado no
 * servidor pela página que renderiza este componente.
 */
export default function ProductView({ product }: { product: Product }) {
  const { add, cart, toggleFavorite, favorites } = useStore();
  const [size, setSize] = useState('');
  const [color, setColor] = useState(() => preferredColor(product, product.variants || []));
  const [selectedImage, setSelectedImage] = useState(0);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSelectedImage(0);
    setSize('');
    setColor(preferredColor(product, product.variants || []));
  }, [product.id, product.color]);

  const variants = product.variants || [];
  const gallery = product.images?.length ? product.images : [product.img];
  const soldOut = product.stock === 0;
  const sizes = productSizes(product);
  const colors = productColors(product);
  const availableColors = colorsInStock(variants);
  const selectedColor = colors.includes(color) ? color : preferredColor(product, variants);
  // O estoque é da combinação escolhida: tamanho P esgotado não é compensado
  // pelas peças que sobraram no GG.
  const availableForVariant = variantStock(variants, size, selectedColor);
  const selectedInCart = cart
    .filter(line => line.id === product.id && line.size === size && (line.color || '') === selectedColor)
    .reduce((total, line) => total + line.qty, 0);

  const buy = () => {
    if (soldOut) return setNotice('Esta peça está esgotada no momento.');
    if (!size) return setNotice('Selecione um tamanho para adicionar à sacola.');
    if (availableForVariant === 0) return setNotice(`O tamanho ${size} está esgotado na cor ${selectedColor}.`);
    if (selectedInCart >= availableForVariant) return setNotice(`Você já selecionou as ${availableForVariant} peça(s) disponíveis no tamanho ${size}.`);
    add(product.id, size, availableForVariant, selectedColor);
    setNotice(addedMessage);
    window.setTimeout(() => setNotice(''), 4800);
  };

  const addedToBag = notice === addedMessage;

  return <div className="productLayout">
    <section className="productGallery">
      <div className="mainProductImage"><img src={gallery[selectedImage]} alt={product.name} /></div>
      {gallery.length > 1 && <div className="galleryThumbs">
        {gallery.map((source, index) => <button
          className={selectedImage === index ? 'active' : ''}
          type="button"
          onClick={() => setSelectedImage(index)}
          key={source}
        ><img src={source} alt={`Ver foto ${index + 1} de ${product.name}`} /></button>)}
      </div>}
    </section>

    <aside className="buyBox">
      <div className="productTopline">
        <span className="eyebrow">{soldOut ? 'Indisponível' : product.cat}</span>
        <button className="iconButton productHeart" onClick={() => toggleFavorite(product.id)} aria-label="Favoritar peça">
          <Heart size={22} fill={favorites.includes(product.id) ? '#171717' : 'none'} />
        </button>
      </div>

      <h1 className="serif">{product.name}</h1>
      <p className="price productPrice">{formatPrice(product.price)}</p>
      <p className="pixPrice"><strong>{formatPrice(pixUnitPrice(product.price))}</strong> no PIX <small>({pixDiscountLabel} de desconto)</small></p>
      <p className="installments">ou 6x de {formatPrice(product.price / 6)} sem juros no cartão</p>
      <div className="productRule" />

      <div className="sizeTitle">
        <span className="eyebrow">Escolha o tamanho</span>
        {size && <span>{availableForVariant > 0 && availableForVariant <= 3 ? `${size} · últimas ${availableForVariant}` : size}</span>}
      </div>
      <div className="sizes">{sizes.map(item => {
        const stock = variantStock(variants, item, selectedColor);
        return <button
          disabled={soldOut || stock === 0}
          key={item}
          onClick={() => setSize(item)}
          className={`size ${size === item ? 'active' : ''} ${stock === 0 ? 'isUnavailable' : ''}`}
          title={stock === 0 ? `Tamanho ${item} esgotado na cor ${selectedColor}` : undefined}
        >{item}</button>;
      })}</div>

      <div className="sizeTitle productColorTitle"><span className="eyebrow">Escolha a cor</span><span>{selectedColor}</span></div>
      <div className="sizes productColorChoices" role="group" aria-label={`Escolha a cor de ${product.name}`}>{colors.map(item => {
        const unavailable = !availableColors.includes(item);
        return <button
          disabled={soldOut || unavailable}
          type="button"
          key={item}
          onClick={() => setColor(item)}
          className={`size productColorSwatch ${selectedColor === item ? 'active' : ''} ${unavailable ? 'isUnavailable' : ''}`}
          style={{ backgroundColor: productColorTone(item) }}
          aria-label={unavailable ? `Cor ${item} esgotada` : `Selecionar cor ${item}`}
          aria-pressed={selectedColor === item}
          title={unavailable ? `${item} esgotada` : item}
        />;
      })}</div>

      <button className="measureGuide" type="button" onClick={() => setGuide(open => !open)}>
        <Ruler size={15} /> Guia de medidas <span>{guide ? '−' : '+'}</span>
      </button>
      {guide && <div className="guide">PP: 34–36 · P: 38 · M: 40 · G: 42 · GG: 44–46.<br />As medidas são aproximadas e tomadas sobre o corpo.</div>}

      <button disabled={soldOut} className="button dark fullButton addToBag" onClick={buy}>
        <ShoppingBag size={16} />{soldOut ? 'Peça esgotada' : 'Adicionar à sacola'}
      </button>
      {notice && <div className={`bagConfirmation ${addedToBag ? 'isSuccess' : 'isWarning'}`} role="status" aria-live="polite">
        {addedToBag ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
        <span>{notice}</span>
        {addedToBag && <Link href="/carrinho">Ver sacola</Link>}
      </div>}

      <div className="productRule" />
      <div className="productDescription">
        <p>{product.desc}</p>
        <details><summary>Composição e cuidados</summary><p>Seleção de materiais pensada para acompanhar a sua rotina. Consulte a etiqueta da peça para os cuidados ideais.</p></details>
        <details><summary>Entrega e devoluções</summary><p>Envios para todo o Brasil. Você tem até 7 dias após o recebimento para solicitar uma devolução.</p></details>
      </div>
    </aside>
  </div>;
}
