'use client';

import { FormEvent, useEffect, useState } from 'react';

type Profile = { name: string; email: string };
export default function Dados() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/account').then(response => response.json()).then(data => setProfile(data.user || null)); }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email') }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Não foi possível atualizar seus dados.');
    setProfile(data.user);
    setMessage('Dados atualizados com sucesso.');
  }
  if (!profile) return <p className="info">Carregando seus dados...</p>;
  return <><h2 className="serif">Dados pessoais</h2><p className="info">Mantenha suas informações atualizadas para tornar a compra mais simples.</p><form className="profileForm" onSubmit={save}><label>Nome completo<input name="name" required defaultValue={profile.name} /></label><label>E-mail<input name="email" required type="email" defaultValue={profile.email} /></label><button className="button dark">Salvar alterações</button>{message && <p className="notice">{message}</p>}</form></>;
}
