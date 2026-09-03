'use client';

import { FormEvent, useEffect, useState } from 'react';

type Address = { street: string; city: string; postalCode: string; complement?: string };
export default function Enderecos() {
  const [address, setAddress] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/account')
      .then(response => response.json())
      .then(data => {
        setAddress(data.user?.address || null);
        setOpen(!data.user?.address);
      });
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      street: String(form.get('street') || ''),
      city: String(form.get('city') || ''),
      postalCode: String(form.get('postalCode') || ''),
      complement: String(form.get('complement') || ''),
    };
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: next }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Não foi possível salvar o endereço.');
    setAddress(data.user.address);
    setOpen(false);
    setMessage('Endereço salvo com sucesso.');
  }
  return (
    <>
      <h2 className="serif">Endereços</h2>
      {address && !open ? (
        <div className="savedAddress">
          <span className="eyebrow">Endereço principal</span>
          <p>
            {address.street}
            <br />
            {address.complement && (
              <>
                {address.complement}
                <br />
              </>
            )}
            {address.city} · {address.postalCode}
          </p>
          <button className="textLink" onClick={() => setOpen(true)}>
            Editar endereço
          </button>
        </div>
      ) : (
        <form className="profileForm" onSubmit={save}>
          <label>
            Endereço
            <input name="street" required defaultValue={address?.street} />
          </label>
          <label>
            Complemento
            <input name="complement" defaultValue={address?.complement} />
          </label>
          <label>
            Cidade
            <input name="city" required defaultValue={address?.city} />
          </label>
          <label>
            CEP
            <input name="postalCode" required defaultValue={address?.postalCode} />
          </label>
          <button className="button dark">Salvar endereço</button>
        </form>
      )}
      {message && <p className="notice">{message}</p>}
    </>
  );
}
