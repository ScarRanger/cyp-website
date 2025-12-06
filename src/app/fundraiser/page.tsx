"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "../types/product";
import ProductCard from "../components/ProductCard";
import { useCart } from "../providers/CartProvider";
import { Button } from "../components/ui/button";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../lib/firebase";

const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

export default function FundraiserPage() {
  const [items, setItems] = useState<Product[]>([]);
  const { count, subtotal } = useCart();

  useEffect(() => {
    async function load() {
      try {
        const col = collection(db, "fundraiser_items");
        const qy = query(col);
        const snap = await getDocs(qy);
        const list: Product[] = snap.docs
          .map((d) => ({ ...(d.data() as any), id: d.id }))
          .sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')));
        setItems(list);
      } catch {
        setItems([]);
      }
    }
    load();
  }, []);

  const inStockItems = useMemo(() => items.filter((p) => (p.inStock !== false) && (p.active !== false)), [items]);

  return (
    <div className="p-4 pb-24 min-h-screen" style={{ backgroundColor: theme.background }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Fundraiser Store</h1>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {inStockItems.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {inStockItems.length === 0 && (
          <div style={{ color: theme.text, opacity: 0.7 }}>No active listings at the moment.</div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0">
        <div className="px-4">
          <div className="rounded-full shadow-lg border p-2 flex items-center justify-between" style={{ backgroundColor: theme.surface, borderColor: theme.primary }}>
            <div className="px-3 text-sm" style={{ color: theme.text }}>
              <span className="font-semibold">Cart:</span> {count} item{count !== 1 ? "s" : ""} • ₹{subtotal.toFixed(2)}
            </div>
            <Button asChild className="rounded-full px-6" style={{ backgroundColor: theme.primary, color: theme.background, border: 'none' }}>
              <Link id="cart-cta" href="/fundraiser/cart" className="hover:opacity-90">View Cart & Checkout</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
