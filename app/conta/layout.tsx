import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Footer, Header } from '../components';
import { currentUser } from '../../lib/auth';

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <><Header /><main className="accountPage"><div className="pageHeading"><span className="eyebrow">Área da cliente</span><h1 className="serif">Olá, {user.name.split(' ')[0]}.</h1><p>Gerencie os seus dados, endereços e acompanhe cada pedido.</p></div><div className="accountLayout"><nav className="accountNav"><Link href="/conta/pedidos">Meus pedidos</Link><Link href="/conta/dados">Dados pessoais</Link><Link href="/conta/enderecos">Endereços</Link><Link href="/favoritos">Favoritos</Link></nav><section>{children}</section></div></main><Footer /></>;
}
