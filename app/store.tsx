'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type CartLine = { id: string; size: string; qty: number };
export type ShippingOption = { id: string | number; name: string; company: string; price: number; deliveryTime: number; postalCode?: string };
type Store = {
  cart: CartLine[];
  favorites: string[];
  shipping: ShippingOption | null;
  hydrated: boolean;
  add: (id: string, size: string, maxQuantity?: number) => void;
  remove: (id: string, size: string) => void;
  setQuantity: (id: string, size: string, quantity: number, maxQuantity?: number) => void;
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(readLocal<CartLine[]>('rf-cart', []));
    setFavorites(readLocal<string[]>('rf-favorites', []));
    setShipping(readLocal<ShippingOption | null>('rf-shipping', null));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem('rf-cart', JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('rf-favorites', JSON.stringify(favorites)); }, [favorites, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('rf-shipping', JSON.stringify(shipping)); }, [shipping, hydrated]);

  const add = (id: string, size: string, maxQuantity = 99) => setCart(current => {
    const existing = current.find(item => item.id === id && item.size === size);
    if (existing) {
      if (existing.qty >= maxQuantity) return current;
      return current.map(item => item.id === id && item.size === size ? { ...item, qty: item.qty + 1 } : item);
    }
    return [...current, { id, size, qty: 1 }];
  });

  const setQuantity = (id: string, size: string, quantity: number, maxQuantity = 99) => setCart(current => {
    if (quantity <= 0) return current.filter(item => item.id !== id || item.size !== size);
    return current.map(item => item.id === id && item.size === size ? { ...item, qty: Math.min(maxQuantity, Math.floor(quantity)) } : item);
  });

  return <Context.Provider value={{
    cart,
    favorites,
    shipping,
    hydrated,
    add,
    remove: (id, size) => setCart(current => current.filter(item => item.id !== id || item.size !== size)),
    setQuantity,
    clearCart: () => { setCart([]); setShipping(null); },
    setShipping,
    toggleFavorite: id => setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]),
  }}>{children}</Context.Provider>;
}

export const useStore = () => {
  const store = useContext(Context);
  if (!store) throw new Error('Store unavailable');
  return store;
};
