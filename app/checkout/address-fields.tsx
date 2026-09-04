'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { formatarCep } from '@/lib/format';

type Address = { street?: string; city?: string; postalCode?: string; complement?: string };
type Account = { name: string; email: string; address?: Address };
type ViaCep = { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean | string };

/**
 * Preencher endereço à mão é o maior atrito do checkout brasileiro. Ao digitar
 * os 8 dígitos do CEP, buscamos rua, bairro e cidade — o campo continua
 * editável, porque nem todo CEP tem logradouro único.
 */
export default function AddressFields({ account }: { account: Account }) {
  const address = account.address;
  const [postalCode, setPostalCode] = useState(formatarCep(address?.postalCode || ''));
  const [street, setStreet] = useState(address?.street || '');
  const [city, setCity] = useState(address?.city || '');
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function buscarCep(valor: string) {
    const digitos = valor.replace(/\D/g, '');
    if (digitos.length !== 8) return;
    setBuscando(true);
    setAviso('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const data = await response.json() as ViaCep;
      if (data.erro) return setAviso('CEP não encontrado. Confira o número ou preencha o endereço à mão.');
      const logradouro = [data.logradouro, data.bairro].filter(Boolean).join(' — ');
      if (logradouro) setStreet(logradouro);
      if (data.localidade) setCity([data.localidade, data.uf].filter(Boolean).join(' / '));
    } catch {
      setAviso('Não foi possível consultar o CEP agora. Você pode preencher o endereço à mão.');
    } finally {
      setBuscando(false);
    }
  }

  return <div className="formGrid">
    <label>Nome completo<input name="name" required autoComplete="name" defaultValue={account.name} /></label>
    <label className="wide">E-mail<input name="email" required type="email" autoComplete="email" defaultValue={account.email} /></label>

    <label>
      CEP
      <input
        name="postalCode" required inputMode="numeric" autoComplete="postal-code"
        placeholder="00000-000" value={postalCode}
        onChange={event => { const valor = formatarCep(event.target.value); setPostalCode(valor); void buscarCep(valor); }}
        onBlur={event => void buscarCep(event.target.value)}
        aria-describedby="cep-aviso"
      />
      {buscando && <small className="fieldHint"><Loader2 size={12} className="spin" aria-hidden="true" /> Buscando endereço...</small>}
    </label>
    <label className="wide">Endereço<input name="street" required autoComplete="street-address" value={street} onChange={event => setStreet(event.target.value)} /></label>
    <label>Complemento<input name="complement" autoComplete="address-line2" defaultValue={address?.complement} placeholder="Apto, bloco, referência" /></label>
    <label>Cidade<input name="city" required autoComplete="address-level2" value={city} onChange={event => setCity(event.target.value)} /></label>

    {aviso && <p className="fieldHint wide" id="cep-aviso" role="status">{aviso}</p>}
  </div>;
}
