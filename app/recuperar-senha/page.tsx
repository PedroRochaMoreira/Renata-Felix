'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Footer, Header } from '../components';
export default function RecuperarSenha() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const email = String(new FormData(event.currentTarget).get('email') || '');
    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || data.error || 'Não foi possível processar seu pedido.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Header />
      <main className="loginPage">
        <section className="loginVisual">
          <div>
            <span className="eyebrow">Segurança da conta</span>
            <h2 className="serif">
              Vamos ajudar você a <em>voltar.</em>
            </h2>
            <p>Enviaremos um link seguro para criar uma nova senha.</p>
          </div>
        </section>
        <section className="loginContent">
          <span className="eyebrow">Recuperar senha</span>
          <h1 className="serif">Esqueceu sua senha?</h1>
          <form className="loginForm" onSubmit={submit}>
            <label>
              E-mail
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <button className="button dark" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
          {message && <p className="notice">{message}</p>}
          <div className="loginUtilities">
            <Link className="textLink" href="/login">
              Voltar para entrar
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
