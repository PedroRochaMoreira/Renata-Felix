'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const storageKey = 'rf-cookie-consent';
type Consent = 'necessary' | 'all';

function hasSavedChoice() {
  try {
    return Boolean(window.localStorage.getItem(storageKey));
  } catch {
    return false;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    setVisible(!hasSavedChoice());
    const openPreferences = () => {
      setPreferences(true);
      setVisible(true);
    };
    window.addEventListener('rf:manage-cookies', openPreferences);
    return () => window.removeEventListener('rf:manage-cookies', openPreferences);
  }, []);

  const save = (consent: Consent) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ consent, savedAt: new Date().toISOString(), version: 1 }));
    } finally {
      setVisible(false);
      setPreferences(false);
    }
  };

  if (!visible) return null;

  return (
    <aside className="cookieConsent" role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-description">
      <div className="cookieConsentCopy">
        <span className="eyebrow">Sua privacidade</span>
        <h2 id="cookie-title" className="serif">
          Escolhas que respeitamos.
        </h2>
        <p id="cookie-description">
          Usamos recursos essenciais para manter a sua sessão, sacola e preferências funcionando. Com sua permissão, poderemos usar
          tecnologias opcionais para entender e melhorar a experiência da loja.
        </p>
        {preferences && (
          <p className="cookieDetails">
            <strong>Essenciais</strong> mantêm o site seguro e funcional. <strong>Opcionais</strong> só serão usados quando você autorizar.
          </p>
        )}
        <Link href="/privacidade" className="cookiePolicyLink">
          Ler política de privacidade
        </Link>
      </div>
      <div className="cookieConsentActions">
        <button type="button" className="button cookieNecessary" onClick={() => save('necessary')}>
          Somente essenciais
        </button>
        <button type="button" className="button dark" onClick={() => save('all')}>
          Aceitar todos
        </button>
      </div>
    </aside>
  );
}
