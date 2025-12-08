"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product, ProductVariant } from "../types/product";
import * as safeStorage from "@/app/lib/safeStorage";

export type CartItem = {
  product: Product;
  qty: number;
  selectedVariant?: ProductVariant;
};

type CartContextValue = {
  items: CartItem[];
  addToCart: (product: Product, qty?: number, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "cyp_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        setItems(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addToCart = (product: Product, qty: number = 1, variant?: ProductVariant) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => 
        i.product.id === product.id && 
        i.selectedVariant?.id === variant?.id
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { product, qty, selectedVariant: variant }];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setItems((prev) => prev.filter((i) => 
      !(i.product.id === productId && i.selectedVariant?.id === variantId)
    ));
  };

  const updateQty = (productId: string, qty: number, variantId?: string) => {
    setItems((prev) => prev.map((i) => 
      (i.product.id === productId && i.selectedVariant?.id === variantId) 
        ? { ...i, qty } 
        : i
    ));
  };

  const clearCart = () => setItems([]);

  const { count, subtotal } = useMemo(() => {
    const count = items.reduce((acc, i) => acc + i.qty, 0);
    const subtotal = items.reduce((acc, i) => acc + i.qty * i.product.price, 0);
    return { count, subtotal };
  }, [items]);

  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<Product | { product: Product; qty?: number; variant?: ProductVariant }>;
      const detail: any = ce.detail;
      if (!detail) return;
      const product = (detail.product ?? detail) as Product;
      const qty = detail.qty ?? 1;
      const variant = detail.variant;
      if (product && product.id) addToCart(product, qty, variant);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("add-to-cart", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("add-to-cart", handler as EventListener);
      }
    };
  }, []);

  const value: CartContextValue = {
    items,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    count,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
