'use client';

import { BellRing, CheckCircle2, CircleAlert, Heart, Ruler, ShoppingBag, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Product, formatPrice } from '../../data';
import { useStore } from '../../store';
import { productColors, productColorTone, productSizes } from '../../../lib/product-variants';
import { colorsInStock, preferredColor, variantStock } from '../../../lib/variants';
import { pixDiscountLabel, pixUnitPrice } from '../../../lib/pricing';

const addedMessage = 'Peça adicionada à sua sacola.';

const measureColumns = [
  { key: 'bust', label: 'Busto' },
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Quadril' },
  { key: 'length', label: 'Compr.' },
] as const;

/**
 * Só a escolha de tamanho, cor e quantidade precisa rodar no navegador. O
 * conteúdo que o Google lê — nome, preço, descrição e fotos — é montado no
 * servidor pela página que renderiza este componente.
 *
 * A página monta este componente com uma `key` por peça, então trocar de
 * produto o remonta e o estado inicial já nasce certo, sem efeito de reset.
 */
export default function ProductView({ product }: { product: Product }) {
  const { add, cart, toggleFavorite, favorites } = useStore();
  const [size, setSize] = useState('');
  const [color, setColor] = useState(() => preferredColor(product, product.variants || []));
  const [selectedImage, setSelectedImage] = useState(0);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSending, setAlertSending] = useState(false);
  const [zoom, setZoom] = useState(false);

  // Em moda a textura e o caimento vendem, então a foto precisa ampliar. Esc
  // fecha e a rolagem da página trava enquanto a ampliação está aberta.
  useEffect(() => {
    if (!zoom) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [zoom]);

  const variants = product.variants || [];
  // As medidas seguem a ordem dos tamanhos que a peça oferece, e não a ordem em
  // que foram cadastradas.
  const measurements = (product.measurements || [])
    .slice()
    .sort((a, b) => productSizes(product).indexOf(a.size) - productSizes(product).indexOf(b.size));
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
    if (selectedInCart >= availableForVariant)
      return setNotice(`Você já selecionou as ${availableForVariant} peça(s) disponíveis no tamanho ${size}.`);
    add(product.id, size, availableForVariant, selectedColor);
    setNotice(addedMessage);
    window.setTimeout(() => setNotice(''), 4800);
  };

  // Quando a combinação escolhida está esgotada, a peça deixa de ser uma venda
  // perdida e vira uma lista de espera.
  const waitingList = Boolean(size) && availableForVariant === 0;

  async function requestAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') || '').trim();
    setAlertSending(true);
    setAlertMessage('');
    try {
      const response = await fetch('/api/stock-alert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: product.id, size, color: selectedColor, email }),
      });
      const data = await response.json();
      setAlertMessage(
        response.ok ? 'Pronto. Avisaremos você assim que esta peça voltar.' : data.error || 'Não foi possível registrar o aviso.',
      );
    } catch {
      setAlertMessage('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setAlertSending(false);
    }
  }

  const addedToBag = notice === addedMessage;

  return (
    <div className="productLayout">
      <section className="productGallery">
        <button type="button" className="mainProductImage" onClick={() => setZoom(true)} aria-label={`Ampliar a foto de ${product.name}`}>
          <Image src={gallery[selectedImage]} alt={product.name} fill sizes="(max-width: 900px) 100vw, 55vw" priority />
          <span className="zoomHint" aria-hidden="true">
            <ZoomIn size={16} />
          </span>
        </button>
        {gallery.length > 1 && (
          <div className="galleryThumbs">
            {gallery.map((source, index) => (
              <button
                className={selectedImage === index ? 'active' : ''}
                type="button"
                onClick={() => setSelectedImage(index)}
                key={source}
              >
                <Image src={source} alt={`Ver foto ${index + 1} de ${product.name}`} width={90} height={112} />
              </button>
            ))}
          </div>
        )}
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
        <p className="pixPrice">
          <strong>{formatPrice(pixUnitPrice(product.price))}</strong> no PIX <small>({pixDiscountLabel} de desconto)</small>
        </p>
        <p className="installments">ou 6x de {formatPrice(product.price / 6)} sem juros no cartão</p>
        <div className="productRule" />

        <div className="sizeTitle">
          <span className="eyebrow">Escolha o tamanho</span>
          {size && <span>{availableForVariant > 0 && availableForVariant <= 3 ? `${size} · últimas ${availableForVariant}` : size}</span>}
        </div>
        <div className="sizes">
          {sizes.map(item => {
            const stock = variantStock(variants, item, selectedColor);
            return (
              <button
                disabled={soldOut || stock === 0}
                key={item}
                onClick={() => setSize(item)}
                className={`size ${size === item ? 'active' : ''} ${stock === 0 ? 'isUnavailable' : ''}`}
                title={stock === 0 ? `Tamanho ${item} esgotado na cor ${selectedColor}` : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="sizeTitle productColorTitle">
          <span className="eyebrow">Escolha a cor</span>
          <span>{selectedColor}</span>
        </div>
        <div className="sizes productColorChoices" role="group" aria-label={`Escolha a cor de ${product.name}`}>
          {colors.map(item => {
            const unavailable = !availableColors.includes(item);
            return (
              <button
                disabled={soldOut || unavailable}
                type="button"
                key={item}
                onClick={() => setColor(item)}
                className={`size productColorSwatch ${selectedColor === item ? 'active' : ''} ${unavailable ? 'isUnavailable' : ''}`}
                style={{ backgroundColor: productColorTone(item) }}
                aria-label={unavailable ? `Cor ${item} esgotada` : `Selecionar cor ${item}`}
                aria-pressed={selectedColor === item}
                title={unavailable ? `${item} esgotada` : item}
              />
            );
          })}
        </div>

        <button className="measureGuide" type="button" onClick={() => setGuide(open => !open)}>
          <Ruler size={15} /> Guia de medidas <span>{guide ? '−' : '+'}</span>
        </button>
        {guide &&
          (measurements.length ? (
            <div className="guide">
              <table className="measureTable">
                <caption>Medidas desta peça, em centímetros.</caption>
                <thead>
                  <tr>
                    <th scope="col">Tam.</th>
                    {measureColumns.map(column => (
                      <th scope="col" key={column.key}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map(row => (
                    <tr key={row.size}>
                      <th scope="row">{row.size}</th>
                      {measureColumns.map(column => (
                        <td key={column.key}>{row[column.key] ? `${row[column.key]} cm` : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Medidas da peça, tomadas com ela plana. Uma variação de até 2 cm é normal no acabamento artesanal.</p>
            </div>
          ) : (
            <div className="guide">
              PP: 34–36 · P: 38 · M: 40 · G: 42 · GG: 44–46.
              <br />
              Esta peça ainda não tem medidas próprias cadastradas, então a referência acima é a do manequim.
            </div>
          ))}

        <button disabled={soldOut} className="button dark fullButton addToBag" onClick={buy}>
          <ShoppingBag size={16} />
          {soldOut ? 'Peça esgotada' : 'Adicionar à sacola'}
        </button>
        {waitingList && (
          <form className="stockAlert" onSubmit={requestAlert}>
            <p className="stockAlertTitle">
              <BellRing size={15} /> Avise-me quando o {size} voltar{colors.length > 1 ? ` na cor ${selectedColor}` : ''}
            </p>
            <div className="stockAlertRow">
              <input name="email" type="email" required placeholder="Seu e-mail" aria-label="Seu e-mail para o aviso" />
              <button className="button dark" disabled={alertSending}>
                {alertSending ? 'Enviando...' : 'Quero ser avisada'}
              </button>
            </div>
            {alertMessage && (
              <p className="stockAlertMessage" role="status">
                {alertMessage}
              </p>
            )}
          </form>
        )}
        {notice && (
          <div className={`bagConfirmation ${addedToBag ? 'isSuccess' : 'isWarning'}`} role="status" aria-live="polite">
            {addedToBag ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
            <span>{notice}</span>
            {addedToBag && <Link href="/carrinho">Ver sacola</Link>}
          </div>
        )}

        <div className="productRule" />
        <div className="productDescription">
          <p>{product.desc}</p>
          <details>
            <summary>Composição e cuidados</summary>
            <p>Seleção de materiais pensada para acompanhar a sua rotina. Consulte a etiqueta da peça para os cuidados ideais.</p>
          </details>
          <details>
            <summary>Entrega e devoluções</summary>
            <p>Envios para todo o Brasil. Você tem até 7 dias após o recebimento para solicitar uma devolução.</p>
          </details>
        </div>
      </aside>

      {zoom && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada de ${product.name}`}
          onClick={() => setZoom(false)}
        >
          <button type="button" className="lightboxClose" onClick={() => setZoom(false)} aria-label="Fechar a foto ampliada" autoFocus>
            <X size={22} />
          </button>
          <Image
            src={gallery[selectedImage]}
            alt={product.name}
            width={1200}
            height={1600}
            className="lightboxImage"
            onClick={event => event.stopPropagation()}
          />
          {gallery.length > 1 && (
            <div className="lightboxThumbs" onClick={event => event.stopPropagation()}>
              {gallery.map((source, index) => (
                <button
                  type="button"
                  key={source}
                  className={selectedImage === index ? 'active' : ''}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Ver foto ${index + 1}`}
                >
                  <Image src={source} alt="" width={64} height={80} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
