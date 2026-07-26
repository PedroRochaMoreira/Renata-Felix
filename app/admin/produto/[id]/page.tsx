'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Footer, Header } from '../../../components';
import { Product } from '../../../data';
import { productColors, productColorTone } from '../../../../lib/product-variants';

const baseCategories = ['Vestidos', 'Alfaiataria', 'Camisas', 'Tricots', 'Saias', 'Casacos', 'Conjuntos'];
const baseColors = ['Preto', 'Off white', 'Areia', 'Chocolate', 'Caramelo', 'Azul-marinho'];

function ColorPreview({ value }: { value: string }) {
  const colors = value.trim() ? productColors({ color: value }) : [];
  if (!colors.length) return <p className="adminColorPreviewEmpty">Digite uma cor para conferir sua tonalidade.</p>;

  return <div className="adminColorPreview" aria-label={`Prévia das cores: ${colors.join(', ')}`}>
    {colors.map(item => <span className="adminColorChip" key={item}>
      <i className="adminColorTone" style={{ backgroundColor: productColorTone(item) }} aria-hidden="true" />
      {item}
    </span>)}
  </div>;
}

export default function EditarProduto() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [catalogItems, setCatalogItems] = useState<Product[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(response => response.json()),
      fetch('/api/catalog').then(response => response.json()),
      fetch('/api/admin/gallery').then(response => response.json()),
    ]).then(([auth, catalog, media]) => {
      if (auth.user?.role !== 'ADMIN') return router.replace('/login');
      const items = Array.isArray(catalog.products) ? catalog.products as Product[] : [];
      const found = items.find(item => item.id === id);
      if (!found) return router.replace('/admin');
      setCatalogItems(items);
      setProduct(found);
      setCategory(found.cat);
      setColor(found.color);
      setCustomColor('');
      setImages(found.images?.length ? found.images : [found.img]);
      setGallery(media.images || []);
    }).catch(() => router.replace('/admin'));
  }, [id, router]);

  const categories = useMemo(() => Array.from(new Set([...baseCategories, ...catalogItems.map(item => item.cat), category])).filter(Boolean).sort(), [catalogItems, category]);
  const colors = useMemo(() => Array.from(new Set([...baseColors, ...catalogItems.map(item => item.color), color])).filter(Boolean).sort(), [catalogItems, color]);
  const colorPreview = color === 'Outro' ? customColor : color;
  const removeImage = (src: string) => setImages(current => current.filter(image => image !== src));
  const addGalleryImage = (src: string) => src && setImages(current => current.includes(src) ? current : [...current, src]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const cat = category === 'Outro' ? String(form.get('customCategory') || '').trim() : category;
    const selectedColor = color === 'Outro' ? String(form.get('customColor') || '').trim() : color;

    if (!cat || !selectedColor) return setMessage('Informe a nova categoria ou cor.');

    form.set('cat', cat);
    form.set('color', selectedColor);
    form.set('id', id);
    form.set('existingImages', JSON.stringify(images));
    form.set('isNew', String(form.get('isNew') === 'on'));

    try {
      const response = await fetch('/api/admin/products', { method: 'PATCH', body: form });
      const data = await response.json().catch(() => ({ error: 'Não foi possível receber a resposta do servidor.' }));
      if (!response.ok) return setMessage(data.error || 'Não foi possível salvar.');
      setMessage('Alterações salvas com sucesso.');
      setProduct(data.product);
      setCatalogItems(current => current.map(item => item.id === data.product.id ? data.product : item));
      setColor(data.product.color);
      setCustomColor('');
      setImages(data.product.images || [data.product.img]);
    } catch {
      setMessage('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  if (!product) return <><Header /><main className="editorPage">Carregando peça...</main><Footer /></>;

  return <>
    <Header />
    <main className="editorPage">
      <Link className="textLink" href="/admin">← Voltar ao painel</Link>
      <div className="editorHeading"><span className="eyebrow">Controle de estoque</span><h1 className="serif">Editar {product.name}</h1><p>Atualize todos os dados da peça e mantenha uma galeria de até oito fotos.</p></div>
      <form className="editorLayout" onSubmit={submit}>
        <section className="editorForm">
          <label>Nome<input name="name" defaultValue={product.name} required /></label>
          <label>Preço (R$)<input name="price" type="number" min="0.01" step="0.01" defaultValue={product.price} required /></label>
          <label>Estoque<input name="stock" type="number" min="0" defaultValue={product.stock ?? 10} required /></label>
          <label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}<option>Outro</option></select></label>
          {category === 'Outro' && <label className="editorWide">Nova categoria<input name="customCategory" required placeholder="Ex.: Acessórios" /></label>}
          <label>Cor / cores<select value={color} onChange={event => setColor(event.target.value)}>{colors.map(item => <option key={item}>{item}</option>)}<option>Outro</option></select></label>
          {color === 'Outro' && <label className="editorWide">Nova cor ou cores<input name="customColor" value={customColor} onChange={event => setCustomColor(event.target.value)} required placeholder="Ex.: Vinho ou Preto, Vinho" /></label>}
          <div className="editorWide adminColorField"><span className="eyebrow">Prévia de tonalidade</span><ColorPreview value={colorPreview} /></div>
          <label>Tamanhos disponíveis<input name="sizes" defaultValue={product.sizes?.join(', ') || 'PP, P, M, G, GG'} placeholder="PP, P, M, G, GG" /></label>
          <label className="editorWide">Descrição<textarea name="desc" rows={5} defaultValue={product.desc} required /></label>
          <label className="check editorWide"><input name="isNew" type="checkbox" defaultChecked={product.isNew} /> Marcar como novidade</label>
          <button className="button dark">Salvar alterações</button>
        </section>

        <section className="editorMedia">
          <span className="eyebrow">Fotos da peça</span>
          <h2 className="serif">Galeria do anúncio</h2>
          <p className="info">A primeira foto será a capa. Você pode remover, anexar novas fotos ou usar as imagens já enviadas.</p>
          <div className="imageThumbs">{images.map((src, index) => <figure key={src}><img src={src} alt={`Foto ${index + 1} de ${product.name}`} /><button type="button" onClick={() => removeImage(src)} aria-label="Remover foto">×</button>{index === 0 && <figcaption>Capa</figcaption>}</figure>)}</div>
          <label className="uploadLabel">Anexar novas fotos<input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple /></label>
          {gallery.length > 0 && <div className="galleryPicker"><span>Adicionar da galeria</span><div>{gallery.filter(src => !images.includes(src)).map(src => <button type="button" key={src} onClick={() => addGalleryImage(src)}><img src={src} alt="Imagem da galeria" /></button>)}</div></div>}
        </section>
      </form>
      {message && <p className="notice">{message}</p>}
    </main>
    <Footer />
  </>;
}
