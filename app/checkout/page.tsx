'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3, LockKeyhole, XCircle } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Footer, Header } from '../components';
import { Product, formatPrice, products } from '../data';
import { useStore } from '../store';

type Account = { name: string; email: string; address?: { street: string; city: string; postalCode: string; complement?: string } };
type PaymentStatus = 'success' | 'pending' | 'failure';

const paymentCopy: Record<PaymentStatus, { eyebrow: string; title: string; text: string; icon: typeof CheckCircle2 }> = {
  success: { eyebrow: 'Pagamento recebido', title: 'Obrigada pela sua escolha.', text: 'Recebemos a confirmação inicial do seu pagamento. Você pode acompanhar todas as atualizações na sua conta.', icon: CheckCircle2 },
  pending: { eyebrow: 'Pagamento em análise', title: 'Seu pedido está aguardando confirmação.', text: 'Assim que o pagamento for confirmado, atualizaremos o status do pedido e enviaremos uma mensagem para você.', icon: Clock3 },
  failure: { eyebrow: 'Pagamento não concluído', title: 'A compra ainda não foi finalizada.', text: 'Nenhuma cobrança foi confirmada. Você pode revisar sua sacola e tentar novamente quando quiser.', icon: XCircle },
};

export default function Checkout() {
  const { cart, shipping, hydrated, clearCart } = useStore();
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    fetch('/api/catalog').then(response => response.ok ? response.json() : null).then(data => { if (data?.products) setCatalog(data.products); }).catch(() => undefined);
    fetch('/api/account').then(response => response.ok ? response.json() : null).then(data => setAccount(data?.user || null)).catch(() => setAccount(null));
    const status = new URLSearchParams(window.location.search).get('status');
    if (status === 'success' || status === 'pending' || status === 'failure') {
      setPaymentStatus(status);
      if (status === 'success') clearCart();
    }
  // A leitura é intencionalmente feita uma vez ao voltar do provedor de pagamento.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = useMemo(() => cart.map(line => ({ line, product: catalog.find(product => product.id === line.id) })).filter((item): item is { line: typeof cart[number]; product: Product } => Boolean(item.product)), [cart, catalog]);
  const subtotal = lines.reduce((total, item) => total + item.product.price * item.line.qty, 0);
  const total = subtotal + (shipping?.price || 0);

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shipping) return setMessage('Escolha uma modalidade de entrega antes de continuar.');
    if (!lines.length) return setMessage('Sua sacola está vazia.');
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const profile = {
        name: String(form.get('name') || ''), email: String(form.get('email') || ''),
        address: {
          street: String(form.get('street') || ''), city: String(form.get('city') || ''), postalCode: String(form.get('postalCode') || ''), complement: String(form.get('complement') || ''),
        },
      };
      const profileResponse = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) });
      const profileData = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error || 'Não foi possível salvar seus dados de entrega.');
      const response = await fetch('/api/payments/mercadopago', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: cart.map(item => ({ id: item.id, size: item.size, quantity: item.qty })), shipping }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || account === undefined) return <><Header /><main className="checkoutPage loadingPage">Preparando seu checkout...</main><Footer /></>;
  if (paymentStatus) {
    const copy = paymentCopy[paymentStatus];
    const Icon = copy.icon;
    return <><Header /><main className="checkoutPage"><div className={`empty paymentResult ${paymentStatus}`}><Icon size={34} /><span className="eyebrow">{copy.eyebrow}</span><h1 className="serif">{copy.title}</h1><p>{copy.text}</p><div className="paymentResultActions"><Link href="/conta/pedidos" className="button dark">Acompanhar pedido</Link><Link href={paymentStatus === 'failure' ? '/carrinho' : '/loja'} className="textLink">{paymentStatus === 'failure' ? 'Voltar à sacola' : 'Continuar na loja'}</Link></div></div></main><Footer /></>;
  }
  if (!account) return <><Header /><main className="checkoutPage"><div className="empty"><span className="eyebrow">Checkout seguro</span><h1 className="serif">Entre para finalizar seu pedido.</h1><p>Assim conseguimos associar sua compra, endereço e acompanhamento à sua conta.</p><Link href="/login" className="button dark">Entrar ou criar conta</Link></div></main><Footer /></>;
  if (!lines.length) return <><Header /><main className="checkoutPage"><div className="empty"><span className="eyebrow">Checkout seguro</span><h1 className="serif">Sua sacola está vazia.</h1><Link href="/loja" className="button dark">Explorar a loja</Link></div></main><Footer /></>;

  return <><Header /><main className="checkoutPage"><div className="pageHeading"><span className="eyebrow"><LockKeyhole size={12} /> Checkout seguro</span><h1 className="serif">Finalizar pedido</h1><p>Você será direcionada ao Mercado Pago para concluir o pagamento com segurança.</p></div><div className="cartLayout"><form className="checkoutForm" onSubmit={pay}><h2 className="serif">Entrega</h2><div className="formGrid"><label>Nome completo<input name="name" required defaultValue={account.name} /></label><label className="wide">E-mail<input name="email" required type="email" defaultValue={account.email} /></label><label className="wide">Endereço<input name="street" required defaultValue={account.address?.street} /></label><label>Complemento<input name="complement" defaultValue={account.address?.complement} /></label><label>Cidade<input name="city" required defaultValue={account.address?.city} /></label><label>CEP<input name="postalCode" inputMode="numeric" required defaultValue={account.address?.postalCode} /></label></div><div className="checkoutShipping"><span className="eyebrow">Entrega selecionada</span>{shipping ? <p><b>{shipping.company} · {shipping.name}</b><span>{formatPrice(shipping.price)} · até {shipping.deliveryTime} dias úteis</span></p> : <p>Volte à sacola para escolher uma modalidade de entrega.</p>}</div><button className="button dark fullButton" disabled={loading || !shipping}>{loading ? 'Redirecionando...' : 'Ir para pagamento seguro'}</button>{message && <p className="notice">{message}</p>}<p className="checkoutTrust"><CheckCircle2 size={15} /> Seus dados são usados apenas para processar e acompanhar o pedido.</p></form><aside className="summary"><span className="eyebrow">Seu pedido</span>{lines.map(({ line, product }) => <p key={line.id + line.size}><span>{product.name} · {line.size} × {line.qty}</span><span>{formatPrice(product.price * line.qty)}</span></p>)}<hr /><p><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p><p><span>Entrega</span><span>{shipping ? formatPrice(shipping.price) : 'A calcular'}</span></p><p className="summaryTotal"><b>Total</b><b>{formatPrice(total)}</b></p></aside></div></main><Footer /></>;
}
