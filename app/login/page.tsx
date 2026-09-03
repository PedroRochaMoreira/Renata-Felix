'use client';

import Link from 'next/link';
import { Check, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Footer, Header } from '../components';

type User = { name: string; email: string; role: 'ADMIN' | 'CUSTOMER'; emailVerified?: boolean };
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetch('/api/auth/me').then(response => response.json()).then(data => setUser(data.user)).catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (mode === 'register' && !passwordPattern.test(password)) return setMessage('Use ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo.');
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password }),
      });
      const data = await response.json();
      if (!response.ok) return setMessage(data.error || 'Não foi possível concluir esta ação.');
      setUser(data.user);
      if (mode === 'register') {
        setMessage(data.verificationEmailSent ? 'Conta criada. Enviamos um link para confirmar seu e-mail.' : 'Conta criada com sucesso. Você poderá confirmar o e-mail assim que o envio automático estiver configurado pela loja.');
      } else {
        setMessage('Login realizado com sucesso.');
      }
    } catch {
      setMessage('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return <><Header /><main className="loginPage"><section className="loginVisual"><div><span className="eyebrow">Renata Felix</span><h2 className="serif">A sua conta,<br /><em>do seu jeito.</em></h2><p>Salve suas escolhas, acompanhe pedidos e tenha uma experiência ainda mais pessoal.</p></div></section><section className="loginContent"><span className="eyebrow">Área da cliente</span><h1 className="serif">{user ? `Olá, ${user.name.split(' ')[0]}.` : mode === 'login' ? 'Que bom ter você de volta.' : 'Crie a sua conta.'}</h1>{user ? <div className="loggedBox"><span className="role"><ShieldCheck size={15} /> {user.role === 'ADMIN' ? 'Acesso administrativo' : 'Cliente Renata Felix'}</span><p>{user.email}</p><Link className="button dark" href="/conta/pedidos">Minha conta</Link><button className="textLink" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); setMessage(''); }}>Sair</button></div> : <><div className="authSwitch"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage(''); }}>Entrar</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage(''); }}>Criar conta</button></div><form className="loginForm" onSubmit={submit}>{mode === 'register' && <label>Nome completo<input name="name" required autoComplete="name" /></label>}<label>E-mail<input name="email" required type="email" autoComplete="email" /></label><label>Senha<input name="password" required minLength={mode === 'register' ? 10 : undefined} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{mode === 'register' && <p className="passwordHint"><Check size={13} /> 10+ caracteres, letra maiúscula, minúscula, número e símbolo.</p>}<button className="button dark" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}</button></form><div className="loginUtilities"><Link className="textLink" href="/recuperar-senha">Esqueci minha senha</Link></div>{message && <p className="notice">{message}</p>}</>}</section></main><Footer /></>;
}
