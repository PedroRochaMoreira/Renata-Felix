'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ImagePlus, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { Footer, Header } from '../components';
import { Product } from '../data';
import { productColors, productColorTone } from '../../lib/product-variants';

type User = { name: string; role: string };

const defaultCategories = ['Vestidos', 'Alfaiataria', 'Camisas', 'Tricots', 'Saias', 'Casacos', 'Conjuntos'];
const defaultColors = ['Preto', 'Off white', 'Areia', 'Chocolate', 'Caramelo', 'Azul-marinho'];

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

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [category, setCategory] = useState('Vestidos');
  const [color, setColor] = useState('Preto');
  const [customColor, setCustomColor] = useState('');
  const [message, setMessage] = useState('');

  const reload = () => Promise.all([
    fetch('/api/auth/me').then(response => response.json()),
    fetch('/api/catalog').then(response => response.json()),
    fetch('/api/admin/featured').then(response => response.json()),
    fetch('/api/admin/gallery').then(response => response.ok ? response.json() : { images: [] }),
  ]).then(([auth, catalog, home, media]) => {
    setUser(auth.user);
    setItems(catalog.products || []);
    setFeatured(home.ids || []);
    setGallery(media.images || []);
    if (media.storage === 'missing') setMessage('Para anexar fotos em produção, conecte um Vercel Blob e configure BLOB_READ_WRITE_TOKEN.');
  }).finally(() => setLoading(false));

  useEffect(() => { reload().catch(() => setLoading(false)); }, []);

  const categories = useMemo(() => Array.from(new Set([...defaultCategories, ...items.map(item => item.cat)])).sort(), [items]);
  const colors = useMemo(() => Array.from(new Set([...defaultColors, ...items.map(item => item.color)])).sort(), [items]);
  const colorPreview = color === 'Outro' ? customColor : color;
  const flash = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 4200); };

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedCategory = category === 'Outro' ? String(form.get('customCategory') || '').trim() : category;
    const selectedColor = color === 'Outro' ? String(form.get('customColor') || '').trim() : color;

    if (!selectedCategory || !selectedColor) return flash('Informe a nova categoria ou cor antes de publicar.');

    form.set('cat', selectedCategory);
    form.set('color', selectedColor);
    form.set('isNew', String(form.get('isNew') === 'on'));

    try {
      const response = await fetch('/api/admin/products', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({ error: 'Não foi possível receber a resposta do servidor.' }));
      if (!response.ok) return flash(data.error || 'Não foi possível publicar a peça.');

      setItems(current => [data.product, ...current]);
      const uploaded = (data.product.images || [data.product.img]).filter((src: string) => typeof src === 'string' && src.length > 0);
      if (uploaded.length) setGallery(current => [...uploaded, ...current.filter(src => !uploaded.includes(src))]);
      event.currentTarget.reset();
      setCategory('Vestidos');
      setColor('Preto');
      setCustomColor('');
      flash('Peça publicada e pronta para aparecer na loja.');
    } catch {
      flash('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  async function saveFeatured() {
    const response = await fetch('/api/admin/featured', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: featured }),
    });
    flash(response.ok ? 'Vitrine atualizada com sucesso.' : 'Não foi possível salvar a vitrine.');
  }

  async function promote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') || '');
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) return flash(data.error || 'Não foi possível conceder acesso.');
    event.currentTarget.reset();
    flash(`${data.user.name} agora tem acesso administrativo.`);
  }

  async function updateStock(id: string, stock: number) {
    const response = await fetch('/api/admin/inventory', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, stock }),
    });
    if (!response.ok) return flash('Não foi possível atualizar o estoque.');
    setItems(current => current.map(item => item.id === id ? { ...item, stock } : item));
    flash(stock === 0 ? 'Peça marcada como esgotada.' : 'Estoque atualizado.');
  }

  async function removeItem(id: string) {
    if (!confirm('Excluir esta peça do catálogo? Essa ação a remove da vitrine da loja.')) return;
    const response = await fetch('/api/admin/inventory', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) return flash('Não foi possível excluir a peça.');
    setItems(current => current.filter(item => item.id !== id));
    setFeatured(current => current.filter(item => item !== id));
    flash('Peça removida do catálogo.');
  }

  if (loading) return <><Header /><main className="adminGate">Carregando painel...</main><Footer /></>;
  if (!user) return <Gate />;
  if (user.role !== 'ADMIN') return <><Header /><main className="adminGate"><span className="eyebrow">Acesso restrito</span><h1 className="serif">Esta área é exclusiva da administração.</h1><p>Entre com uma conta autorizada para continuar.</p><Link className="button dark" href="/login">Ir para login</Link></main><Footer /></>;

  return <>
    <Header />
    <main className="adminPage">
      <div className="adminIntro">
        <span className="eyebrow">Administração</span>
        <h1 className="serif">Olá, {user.name.split(' ')[0]}.</h1>
        <p>Cuide da sua vitrine, do estoque e da apresentação de cada peça em um só lugar.</p>
        <Link className="adminOrdersLink" href="/admin/pedidos">Acompanhar pedidos <ArrowUpRight size={14} /></Link>
      </div>

      <div className="adminDashboardStats">
        <div><span>Peças ativas</span><b>{items.length}</b></div>
        <div><span>Em destaque</span><b>{featured.length}/4</b></div>
        <div><span>Sem estoque</span><b>{items.filter(item => item.stock === 0).length}</b></div>
      </div>

      <div className="adminColumns">
        <section className="adminCard">
          <div className="adminCardTitle"><div><span className="eyebrow">Novo anúncio</span><h2 className="serif">Publicar peça</h2></div><PackagePlus size={23} /></div>
          <form className="adminForm" onSubmit={addProduct}>
            <label>Nome<input name="name" required /></label>
            <label>Preço (R$)<input name="price" type="number" min="0.01" step="0.01" required /></label>
            <label>Estoque inicial<input name="stock" type="number" min="0" defaultValue="10" required /></label>
            <label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}<option>Outro</option></select></label>
            {category === 'Outro' && <label className="wideField">Nova categoria<input name="customCategory" required placeholder="Ex.: Acessórios" /></label>}
            <label>Cor / cores<select value={color} onChange={event => setColor(event.target.value)}>{colors.map(item => <option key={item}>{item}</option>)}<option>Outro</option></select></label>
            {color === 'Outro' && <label className="wideField">Nova cor ou cores<input name="customColor" value={customColor} onChange={event => setCustomColor(event.target.value)} required placeholder="Ex.: Vinho ou Preto, Vinho" /></label>}
            <div className="wideField adminColorField"><span className="eyebrow">Prévia de tonalidade</span><ColorPreview value={colorPreview} /></div>
            <label>Tamanhos<input name="sizes" placeholder="PP, P, M, G, GG" /></label>
            <label className="wideField uploadField"><span><ImagePlus size={15} /> Anexar fotos</span><input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple /></label>
            {gallery.length > 0 && <label className="wideField">Usar fotos já enviadas<select name="galleryImages" multiple size={Math.min(4, gallery.length)}>{gallery.map(source => <option value={source} key={source}>{source.split('/').pop()}</option>)}</select><small>Use Cmd/Ctrl para selecionar mais de uma foto.</small></label>}
            <label className="wideField">Descrição<textarea name="desc" rows={4} required /></label>
            <label className="check wideField"><input name="isNew" type="checkbox" /> Marcar como novidade</label>
            <button className="button dark">Publicar peça <ArrowUpRight size={15} /></button>
          </form>
        </section>

        <section className="adminCard featuredCard">
          <div className="adminCardTitle"><div><span className="eyebrow">Vitrine da Home</span><h2 className="serif">Ícones Renata Felix</h2></div><span className="adminCount">{featured.length}/4</span></div>
          <p className="info">Escolha até quatro peças para ocupar o espaço principal da página inicial.</p>
          <div className="featuredList">{items.map(item => <label key={item.id}><input type="checkbox" checked={featured.includes(item.id)} onChange={event => setFeatured(current => event.target.checked ? [...current, item.id].slice(-4) : current.filter(id => id !== item.id))} /><img src={item.img} alt="" /><span>{item.name}<small>{item.cat}</small></span></label>)}</div>
          <button className="button dark" onClick={saveFeatured}>Salvar vitrine</button>
        </section>
      </div>

      <section className="adminAccess"><div><span className="eyebrow">Equipe</span><h2 className="serif">Administradores</h2><p>Conceda acesso pelo e-mail de uma conta já criada na loja.</p></div><form onSubmit={promote}><input name="email" type="email" required placeholder="conta@exemplo.com" /><button className="button light">Conceder acesso</button></form></section>

      <section className="inventoryPanel">
        <div className="inventoryHeading"><div><span className="eyebrow">Controle de estoque</span><h2 className="serif">Suas peças</h2><p className="info">Edite cada anúncio, altere o estoque ou retire uma peça da loja.</p></div><span>{items.length} itens</span></div>
        <div className="inventoryList">{items.map(item => <article key={item.id}><img src={item.img} alt="" /><div><b>{item.name}</b><small>{item.cat} · {item.color}</small></div><label className="stockControl"><span>Estoque</span><input aria-label={`Estoque de ${item.name}`} type="number" min="0" defaultValue={item.stock} onBlur={event => updateStock(item.id, Number(event.target.value))} /></label><span className={`stockStatus ${item.stock === 0 ? 'soldOut' : ''}`}>{item.stock === 0 ? 'Esgotado' : `${item.stock} em estoque`}</span><div className="inventoryActions"><Link className="textLink" href={`/admin/produto/${item.id}`}><Pencil size={13} /> Editar</Link><button className="textLink" onClick={() => updateStock(item.id, 0)}>Esgotar</button><button className="removeProduct" onClick={() => removeItem(item.id)} aria-label={`Excluir ${item.name}`}><Trash2 size={15} /></button></div></article>)}</div>
      </section>

      {message && <p className="notice adminNotice">{message}</p>}
    </main>
    <Footer />
  </>;
}

function Gate() {
  return <><Header /><main className="adminGate"><span className="eyebrow">Painel administrativo</span><h1 className="serif">Entre para gerenciar sua loja.</h1><p>Use uma conta de administradora para acessar o painel.</p><Link className="button dark" href="/login">Entrar</Link></main><Footer /></>;
}
