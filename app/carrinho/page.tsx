'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, Truck } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Footer, Header } from '../components';
import { formatPrice, type Product } from '../data';
import { ShippingOption, useStore } from '../store';
import { productColors, productColorTone, productSizes } from '../../lib/product-variants';

export default function Carrinho() {
  const { cart, remove, setQuantity, setVariant, shipping, setShipping, hydrated } = useStore();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [cep, setCep] = useState('');
  const [quotes, setQuotes] = useState<ShippingOption[]>([]);
  const [shippingError, setShippingError] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => { fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }).catch(() => undefined).finally(() => setCatalogReady(true)); }, []);
  const lines = useMemo(() => cart.map(line => ({ line, product: catalog.find(product => product.id === line.id) })).filter((item): item is { line: typeof cart[number]; product: Product } => Boolean(item.product)), [cart, catalog]);
  const subtotal = lines.reduce((total, item) => total + item.product.price * item.line.qty, 0);
  const total = subtotal + (shipping?.price || 0);
  const changeQuantity = (id: string, size: string, color: string, quantity: number, stock: number) => { setQuantity(id, size, quantity, stock, color); setShipping(null); };
  const changeVariant = (id: string, size: string, color: string, nextSize: string, nextColor: string, stock: number) => { setVariant(id, size, color, nextSize, nextColor, stock); setShipping(null); };

  async function quote(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setShippingError('');
    setShipping(null);
    try {
      const response = await fetch('/api/shipping/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postalCode: cep, items: lines.map(item => ({ id: item.product.id, quantity: item.line.qty })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setQuotes(data.quotes || []);
      if (!data.quotes?.length) setShippingError('Nenhuma modalidade disponível para este CEP.');
    } catch (error) {
      setShippingError(error instanceof Error ? error.message : 'Não foi possível calcular o frete.');
    } finally {
      setLoading(false);
    }
  }

  // Sem o catálogo carregado não dá para saber se a sacola está mesmo vazia.
  if (!hydrated || !catalogReady) return <><Header /><main className="cartPage loadingPage">Carregando sua sacola...</main><Footer /></>;
  return <><Header /><main className="cartPage"><div className="pageHeading"><span className="eyebrow">Sua seleção</span><h1 className="serif">Sacola</h1><p>{lines.length ? 'Revise suas escolhas antes de finalizar.' : 'Sua próxima escolha especial começa aqui.'}</p></div>{!lines.length ? <div className="empty"><p>Sua sacola está vazia.</p><Link href="/loja" className="button dark">Explorar a loja</Link></div> : <div className="cartLayout"><div className="cartContent"><div className="cartItems">{lines.map(({ line, product }) => {
    const sizes = productSizes(product);
    const colors = productColors(product);
    const selectedColor = colors.includes(line.color || '') ? line.color || '' : colors[0];
    const productQuantity = cart.filter(item => item.id === product.id).reduce((total, item) => total + item.qty, 0);
    const stock = product.stock ?? 99;
    const lineColor = line.color || '';
    return <article className="cartItem" key={`${line.id}-${line.size}-${lineColor || 'default'}`}><img src={product.img} alt={product.name} /><div className="cartItemInfo"><span className="eyebrow">{product.cat}</span><h2 className="serif">{product.name}</h2><div className="cartVariants" aria-label={`Variações de ${product.name}`}><div className="cartVariant"><span className="eyebrow">Tamanho</span><div className="sizes cartVariantChoices" role="group" aria-label={`Escolha o tamanho de ${product.name}`}>{sizes.map(item => <button type="button" disabled={stock === 0} key={item} onClick={() => changeVariant(line.id, line.size, lineColor, item, selectedColor, stock)} className={`size ${line.size === item ? 'active' : ''}`} aria-pressed={line.size === item}>{item}</button>)}</div></div><div className="cartVariant"><span className="eyebrow">Cor</span><div className="sizes cartVariantChoices cartColorChoices" role="group" aria-label={`Escolha a cor de ${product.name}`}>{colors.length > 1 ? colors.map(item => <button type="button" disabled={stock === 0} key={item} onClick={() => changeVariant(line.id, line.size, lineColor, line.size, item, stock)} className={`size cartColorSwatch ${selectedColor === item ? 'active' : ''}`} style={{ backgroundColor: productColorTone(item) }} aria-label={`Selecionar cor ${item}`} aria-pressed={selectedColor === item} title={item} />) : <span className="size active cartVariantStatic cartColorSwatch" role="img" aria-label={`Cor ${selectedColor}`} title={selectedColor} style={{ backgroundColor: productColorTone(selectedColor) }} />}</div></div></div><div className="quantityControl"><button type="button" onClick={() => changeQuantity(line.id, line.size, lineColor, line.qty - 1, stock)} aria-label="Diminuir quantidade"><Minus size={14} /></button><span>{line.qty}</span><button type="button" disabled={productQuantity >= stock} onClick={() => changeQuantity(line.id, line.size, lineColor, line.qty + 1, stock)} aria-label="Aumentar quantidade"><Plus size={14} /></button></div></div><div className="cartItemSide"><strong className="price">{formatPrice(product.price * line.qty)}</strong><button className="removeProduct" onClick={() => { remove(line.id, line.size, lineColor); setShipping(null); }}><Trash2 size={15} /><span>Remover</span></button></div></article>;
  })}</div><section className="shippingBox"><div className="shippingTitle"><div><span className="eyebrow">Entrega</span><h2 className="serif">Calcule seu frete</h2></div><Truck size={22} /></div><form onSubmit={quote}><input value={cep} onChange={event => setCep(event.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" placeholder="Digite seu CEP" required /><button className="button dark" disabled={loading}>{loading ? 'Calculando...' : 'Calcular'}</button></form>{shippingError && <p className="notice">{shippingError}</p>}{quotes.map(item => <label className={`shippingOption ${String(shipping?.id) === String(item.id) ? 'active' : ''}`} key={item.id}><input type="radio" name="shipping" checked={String(shipping?.id) === String(item.id)} onChange={() => setShipping({ ...item, postalCode: cep })} /><span><b>{item.company} · {item.name}</b><small>Entrega em até {item.deliveryTime} dia(s) úteis</small></span><strong>{formatPrice(item.price)}</strong></label>)}</section></div><aside className="summary"><span className="eyebrow">Resumo do pedido</span><p><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p><p><span>Entrega</span><span>{shipping ? formatPrice(shipping.price) : 'A calcular'}</span></p><hr /><p className="summaryTotal"><b>Total</b><b>{formatPrice(total)}</b></p>{shipping ? <Link href="/checkout" className="button dark fullButton">Finalizar compra</Link> : <p className="summaryHint">Calcule e escolha uma modalidade de entrega para continuar.</p>}</aside></div>}</main><Footer /></>;
}
