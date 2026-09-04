import Link from 'next/link';
import { Footer, Header } from './components';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="empty pageError" id="conteudo">
        <span className="eyebrow">Página não encontrada</span>
        <h1 className="serif">Esta peça saiu da vitrine.</h1>
        <p>O endereço que você abriu não existe mais, ou nunca existiu.</p>
        <div className="pageErrorActions">
          <Link href="/loja" className="button dark">
            Explorar a loja
          </Link>
          <Link href="/" className="textLink">
            Voltar ao início
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
