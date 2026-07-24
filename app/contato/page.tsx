'use client';

import { FormEvent, useState } from 'react';
import { Footer, Header } from '../components';

export default function Contato() {
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || 'Não foi possível enviar sua mensagem.');
    form.reset();
    setMessage('Mensagem enviada. Retornaremos em breve.');
  }
  return <><Header /><main className="contactPage"><div className="pageHeading"><span className="eyebrow">Como podemos ajudar?</span><h1 className="serif">Fale conosco.</h1><p>Estamos por aqui para tornar a sua experiência ainda mais especial.</p></div><form className="contactForm" onSubmit={submit}><label>Nome<input name="name" required /></label><label>E-mail<input name="email" required type="email" /></label><label>Assunto<input name="subject" required /></label><label>Mensagem<textarea name="message" required rows={6} /></label><button className="button dark">Enviar mensagem</button>{message && <p className="notice">{message}</p>}</form></main><Footer /></>;
}
