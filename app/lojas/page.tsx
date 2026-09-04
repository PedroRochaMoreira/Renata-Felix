import Image from 'next/image';
import { Clock3, MapPin } from 'lucide-react';
import { Footer, Header } from '../components';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nossa loja',
  description: 'Visite a Renata Felix na R. José Alencar, Qd. 77, Lt. 12, em Luziânia, GO. Segunda a sexta, das 9h às 18h.',
  alternates: { canonical: '/lojas' },
  openGraph: { url: '/lojas' },
};

export default function Lojas() {
  return (
    <>
      <Header />
      <main id="conteudo" tabIndex={-1} className="storesPage">
        <div className="pageHeading">
          <span className="eyebrow">Visite-nos</span>
          <h1 className="serif">A nossa casa em Luziânia.</h1>
          <p>Um espaço pensado para experimentar as peças com calma e descobrir novas possibilidades.</p>
        </div>
        <div className="storeExperience">
          <Image src="/brand/fachada-renata-felix.png" width={1290} height={1086} alt="Fachada da loja Renata Felix" />
          <div>
            <span className="eyebrow">Renata Felix Store</span>
            <p>Uma experiência pensada em cada detalhe.</p>
            <p>
              R. José Alencar, Qd. 77 · Lt. 12
              <br />
              Luziânia — GO
              <br />
              CEP 72804-030
            </p>
            <div className="storeExperienceHours">
              <Clock3 size={18} />
              <div>
                <span>Funcionamento</span>
                <strong>Segunda a sexta · 9h às 18h</strong>
              </div>
            </div>
            <a
              className="button dark"
              target="_blank"
              rel="noreferrer"
              href="https://www.google.com/maps/search/?api=1&query=Renata+Felix+Store%2C+Rua+Jose+Alencar%2C+Qd+77%2C+Lt+12%2C+Luziania%2C+GO%2C+72804-030"
            >
              <MapPin size={15} /> Abrir no Google Maps
            </a>
          </div>
        </div>
        <iframe
          className="map"
          title="Mapa Renata Felix Store"
          src="https://www.google.com/maps?q=Renata+Felix+Store%2C+Rua+Jose+Alencar%2C+Qd+77%2C+Lt+12%2C+Luziania%2C+GO%2C+72804-030&output=embed"
          loading="lazy"
        />
      </main>
      <Footer />
    </>
  );
}
