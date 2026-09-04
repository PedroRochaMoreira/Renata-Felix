'use client';

import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Tone = 'success' | 'error';
type Toast = { id: number; text: string; tone: Tone };
type ToastApi = { notify: (text: string, tone?: Tone) => void };

const Context = createContext<ToastApi | null>(null);

/**
 * Substitui o `setMessage` reimplementado em cada página por um aviso único e
 * consistente, anunciado a leitores de tela e descartável pelo teclado.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts(current => current.filter(item => item.id !== id)), []);

  const notify = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current.slice(-2), { id, text, tone }]);
    window.setTimeout(() => dismiss(id), 5200);
  }, [dismiss]);

  const api = useMemo(() => ({ notify }), [notify]);

  return <Context.Provider value={api}>
    {children}
    <div className="toastStack" role="status" aria-live="polite">
      {toasts.map(toast => <div className={`toast ${toast.tone}`} key={toast.id}>
        {toast.tone === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
        <span>{toast.text}</span>
        <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dispensar aviso"><X size={14} /></button>
      </div>)}
    </div>
  </Context.Provider>;
}

/** Fora do provider o aviso vira `console`, para nunca derrubar uma página. */
export function useToast(): ToastApi {
  return useContext(Context) || { notify: (text: string) => console.warn(text) };
}
