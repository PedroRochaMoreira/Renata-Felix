'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type CartLine = { id: string; size: string; color?: string; qty: number };
export type ShippingOption = { id: string | number; name: string; company: string; price: number; deliveryTime: number; postalCode?: string };
type Store = {
  cart: CartLine[];
  favorites: string[];
  shipping: ShippingOption | null;
  hydrated: boolean;
  add: (id: string, size: string, maxQuantity?: number, color?: string) => void;
  remove: (id: string, size: string, color?: string) => void;
  setQuantity: (id: string, size: string, quantity: number, maxQuantity?: number, color?: string) => void;
  setVariant: (id: string, size: string, color: string, nextSize: string, nextColor: string, maxQuantity?: number) => void;
  clearCart: () => void;
  setShipping: (shipping: ShippingOption | null) => void;
  toggleFavorite: (id: string) => void;
};

const Context = createContext<Store | null>(null);

function readLocal<T>(key: string, fallback: T) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function cleanPart(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cartLineKey(id: string, size: string, color = '') {
  return `${id}\u0000${size}\u0000${color}`;
}

function sameCartLine(line: CartLine, id: string, size: string, color = '') {
  return line.id === id && line.size === size && (line.color || '') === color;
}

/** Keeps carts saved before colour variants were introduced usable. */
function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const lines = new Map<string, CartLine>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = cleanPart(row.id, 128);
    const size = cleanPart(row.size, 32);
    const color = cleanPart(row.color, 60);
    const qty = Math.floor(Number(row.qty));
    if (!id || !size || !Number.isFinite(qty) || qty < 1) continue;
    const key = cartLineKey(id, size, color);
    const existing = lines.get(key);
    lines.set(key, { id, size, color: color || undefined, qty: (existing?.qty || 0) + qty });
  }
  return [...lines.values()];
}

function stockLimit(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 99;
}

function quantityForVariant(lines: CartLine[], id: string, size: string, color = '') {
  return lines.filter(line => sameCartLine(line, id, size, color)).reduce((total, line) => total + line.qty, 0);
}

function persistFavorites(next: string[]) {
  void fetch('/api/account/favorites', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ favorites: next }),
  }).catch(() => undefined);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const cartDiscarded = useRef(false);

  useEffect(() => {
    // O checkout limpa a sacola ao voltar do provedor de pagamento, e o efeito
    // dele roda antes deste. Sem a marca abaixo, a leitura do armazenamento
    // devolveria a sacola já paga para a cliente.
    if (!cartDiscarded.current) {
      setCart(readCart(readLocal<unknown>('rf-cart', [])));
      setShipping(readLocal<ShippingOption | null>('rf-shipping', null));
    }
    setFavorites(readLocal<string[]>('rf-favorites', []));
    setHydrated(true);
    fetch('/api/account/favorites')
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (Array.isArray(data?.favorites)) setFavorites(data.favorites); })
      .catch(() => undefined);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem('rf-cart', JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('rf-favorites', JSON.stringify(favorites)); }, [favorites, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('rf-shipping', JSON.stringify(shipping)); }, [shipping, hydrated]);

  // O limite é da variante escolhida: o estoque de um tamanho não empresta
  // peças para outro tamanho da mesma modelagem.
  const add = (id: string, size: string, maxQuantity = 99, color = '') => setCart(current => {
    const limit = stockLimit(maxQuantity);
    if (quantityForVariant(current, id, size, color) >= limit) return current;
    const existing = current.find(item => sameCartLine(item, id, size, color));
    if (existing) return current.map(item => sameCartLine(item, id, size, color) ? { ...item, qty: item.qty + 1 } : item);
    return [...current, { id, size, color: color || undefined, qty: 1 }];
  });

  const setQuantity = (id: string, size: string, quantity: number, maxQuantity = 99, color = '') => setCart(current => {
    const nextQuantity = Math.min(Math.max(0, Math.floor(quantity)), stockLimit(maxQuantity));
    if (nextQuantity <= 0) return current.filter(item => !sameCartLine(item, id, size, color));
    return current.map(item => sameCartLine(item, id, size, color) ? { ...item, qty: nextQuantity } : item);
  });

  const setVariant = (id: string, size: string, color: string, nextSize: string, nextColor: string, maxQuantity = 99) => setCart(current => {
    const safeSize = cleanPart(size, 32);
    const safeColor = cleanPart(color, 60);
    const safeNextSize = cleanPart(nextSize, 32);
    const safeNextColor = cleanPart(nextColor, 60);
    if (!safeSize || !safeNextSize || (safeSize === safeNextSize && safeColor === safeNextColor)) return current;
    const source = current.find(item => sameCartLine(item, id, safeSize, safeColor));
    if (!source) return current;
    const target = current.find(item => sameCartLine(item, id, safeNextSize, safeNextColor));
    // maxQuantity já é o estoque da variante de destino, então a soma das duas
    // linhas só pode ir até onde o novo tamanho e cor permitem.
    const mergedQuantity = Math.min(source.qty + (target?.qty || 0), stockLimit(maxQuantity));
    const withoutOldVariants = current.filter(item => item !== source && item !== target);
    return mergedQuantity > 0 ? [...withoutOldVariants, { id, size: safeNextSize, color: safeNextColor || undefined, qty: mergedQuantity }] : withoutOldVariants;
  });

  const toggleFavorite = (id: string) => setFavorites(current => {
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    persistFavorites(next);
    return next;
  });

  return <Context.Provider value={{
    cart, favorites, shipping, hydrated, add,
    remove: (id, size, color) => setCart(current => current.filter(item => item.id !== id || item.size !== size || (color !== undefined && (item.color || '') !== color))),
    setQuantity,
    setVariant,
    clearCart: () => { cartDiscarded.current = true; setCart([]); setShipping(null); },
    setShipping,
    toggleFavorite,
  }}>{children}</Context.Provider>;
}

export const useStore = () => {
  const store = useContext(Context);
  if (!store) throw new Error('Store unavailable');
  return store;
};
