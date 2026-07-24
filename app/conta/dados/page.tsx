'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, MailCheck } from 'lucide-react';

type Profile = { name: string; email: string; emailVerified?: boolean };

export default function Dados() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/account').then(response => response.json()).then(data => setProfile(data.user || null)).catch(() => setProfile(null));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/account', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email') }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Não foi possível atualizar seus dados.');
    setProfile(data.user);
    setMessage(data.verificationEmailSent ? 'Dados atualizados. Enviamos um link para confirmar o novo e-mail.' : 'Dados atualizados com sucesso.');
  }

  async function resendVerification() {
    setSending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await response.json();
      setMessage(response.ok ? (data.emailSent ? 'Enviamos um novo link de confirmação para o seu e-mail.' : 'O envio de e-mail ainda não está configurado pela loja.') : data.error || 'Não foi possível enviar o link.');
    } catch {
      setMessage('Não foi possível enviar o link agora. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  if (!profile) return <p className="info">Carregando seus dados...</p>;
  return <><h2 className="serif">Dados pessoais</h2><p className="info">Mantenha suas informações atualizadas para tornar a compra mais simples.</p>
    <div className={`verificationCard ${profile.emailVerified ? 'isVerified' : ''}`}>
      {profile.emailVerified ? <CheckCircle2 size={18} /> : <MailCheck size={18} />}<div><b>{profile.emailVerified ? 'E-mail confirmado' : 'Confirme o seu e-mail'}</b><p>{profile.emailVerified ? 'Sua conta já está protegida por um e-mail confirmado.' : 'Use o link enviado para seu e-mail. Não encontrou? Solicite outro abaixo.'}</p></div>
      {!profile.emailVerified && <button className="textLink" type="button" onClick={resendVerification} disabled={sending}>{sending ? 'Enviando...' : 'Reenviar link'}</button>}
    </div>
    <form className="profileForm" onSubmit={save}><label>Nome completo<input name="name" required defaultValue={profile.name} /></label><label>E-mail<input name="email" required type="email" defaultValue={profile.email} /></label><button className="button dark">Salvar alterações</button>{message && <p className="notice">{message}</p>}</form>
  </>;
}
