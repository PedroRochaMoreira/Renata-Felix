'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import FeaturedIcons from './featured-icons';
import { Footer, Header, Newsletter, ProductCard } from './components';
import { Product, products } from './data';

export default function Home() {
  const [catalog, setCatalog] = useState<Product[]>(products);

  useEffect(() => { fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }).catch(() => undefined); }, []);
  const newArrivals = catalog.filter(product => product.isNew).slice(0, 4);

  return <><Header /><main>
    <section className="hero heroLuxury">
      <Image priority src="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=2200&q=90" alt="Mulher vestindo peça da curadoria Renata Felix" fill sizes="100vw" />
      <div className="heroVeil" />
      <div className="heroCopy"><span className="eyebrow heroEyebrow"><Sparkles size={12} /> Curadoria Renata Felix</span><h1 className="serif">Peças que deixam<br /><em>a sua presença falar.</em></h1><p>Moda contemporânea escolhida para acompanhar seus movimentos, todos os dias.</p><div className="heroActions"><Link href="/loja" className="button light">Explorar a loja <ArrowRight size={15} /></Link><Link href="/sobre" className="heroTextLink">Conhecer a marca <ArrowDownRight size={15} /></Link></div></div>
      <div className="heroFootnote"><span>Luziânia · GO · Brasil</span><span>Seleção feita com intenção</span></div>
    </section>

    <section className="manifesto"><div className="manifestoMark">RF</div><div><span className="eyebrow">A nossa seleção</span><h2 className="serif">Uma loja para mulheres que escolhem <em>menos, e melhor.</em></h2></div><p>Em vez de excessos, reunimos formas que atravessam momentos: vestidos, alfaiataria e essenciais escolhidos por caimento, conforto e personalidade.</p></section>

    <section className="section productShowcase"><div className="sectionHead"><div><span className="eyebrow">Chegaram agora</span><h2 className="serif">Novidades que merecem atenção.</h2></div><Link href="/loja?filtro=novidades" className="textLink">Ver todas <ArrowRight size={13} /></Link></div><div className="grid">{newArrivals.map(product => <ProductCard product={product} key={product.id} />)}</div></section>

    <section className="splitFeature"><Link href="/loja?categoria=Alfaiataria" className="splitFeatureImage"><Image src="https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=1500&q=88" alt="Alfaiataria feminina" fill sizes="(max-width: 760px) 100vw, 52vw" /><span className="imageCaption">01 / Alfaiataria</span></Link><div className="splitFeatureCopy"><span className="eyebrow">Escolhas que ficam</span><h2 className="serif">O refinamento está nos detalhes que você sente.</h2><p>Linhas precisas, texturas especiais e proporções que fazem uma peça ser lembrada muito depois do primeiro uso.</p><Link href="/loja?categoria=Alfaiataria" className="button dark">Conhecer alfaiataria <ArrowRight size={14} /></Link></div></section>

    <section className="section iconSection"><div className="sectionHead"><div><span className="eyebrow">A assinatura da loja</span><h2 className="serif">Ícones Renata Felix</h2></div><Link href="/loja" className="textLink">Ver a loja <ArrowRight size={13} /></Link></div><FeaturedIcons /></section>

    <section className="storeBanner"><div><span className="eyebrow">Visite-nos</span><h2 className="serif">Uma experiência para ver, tocar e se reconhecer.</h2><p>R. José Alencar, Qd. 77 · Lt. 12 · Luziânia — GO</p><Link href="/lojas" className="textLink">Como chegar <MapPin size={13} /></Link></div><Image src="/brand/fachada-renata-felix.png" width={1290} height={1086} alt="Fachada da loja Renata Felix" /></section>

    <Newsletter />
  </main><Footer /></>;
}
