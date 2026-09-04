import Link from 'next/link';
import { Footer, Header } from './components';

export default function NotFound() {
  return <><Header /><main id="conteudo" className="statusPage">
    <span className="eyebrow">Página não encontrada</span>
    <h1 className="serif">Esta peça saiu da vitrine.</h1>
    <p>O endereço não existe mais ou a peça deixou de estar disponível. Nossa curadoria continua por aqui.</p>
    <div className="statusPageActions">
      <Link href="/loja" className="button dark">Explorar a loja</Link>
      <Link href="/contato" className="textLink">Falar com a loja</Link>
    </div>
  </main><Footer /></>;
}
