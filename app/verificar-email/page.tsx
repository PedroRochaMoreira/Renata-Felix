'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Footer, Header } from '../components';

export default function VerificarEmail() {
  const [message, setMessage] = useState('Confirmando seu e-mail...');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setMessage('Link de confirmação inválido.');
      return;
    }
    fetch('/api/auth/verify-email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async response => {
        const data = await response.json();
        setMessage(
          response.ok ? 'E-mail confirmado com sucesso. Sua conta está protegida.' : data.error || 'Não foi possível confirmar o e-mail.',
        );
      })
      .catch(() => setMessage('Não foi possível confirmar o e-mail.'));
  }, []);

  return (
    <>
      <Header />
      <main className="checkoutPage">
        <div className="empty">
          <span className="eyebrow">Segurança da conta</span>
          <h1 className="serif">Confirmação de e-mail</h1>
          <p>{message}</p>
          <Link className="button dark" href="/login">
            Ir para minha conta
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
