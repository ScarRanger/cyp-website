"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Product } from "../types/product";
import { Button } from "./ui/button";
import { useRef } from "react";

const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const [idx, setIdx] = useState(0);
  const images = product.images && product.images.length > 0 ? product.images : ["/christmasfellowship.jpeg"];
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) return; // pause auto-rotate when overlay is open
    const t = setInterval(() => {
      setIdx((v) => (v + 1) % images.length);
    }, 2500);
    return () => clearInterval(t);
  }, [images.length, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setIdx((v) => (v + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((v) => (v - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const priceSection = useMemo(() => {
    const hasCompare = product.compareAtPrice && product.compareAtPrice > product.price;
    return (
      <div className="mt-1 flex items-baseline gap-1.5">
        {hasCompare ? (
          <>
            <span className="text-xs line-through" style={{ color: theme.text, opacity: 0.5 }}>₹{product.compareAtPrice}</span>
            <span className="text-base font-semibold" style={{ color: theme.primary }}>₹{product.price}</span>
          </>
        ) : (
          <span className="text-base font-semibold" style={{ color: theme.primary }}>₹{product.price}</span>
        )}
      </div>
    );
  }, [product.compareAtPrice, product.price]);

  const flyToCart = () => {
    const source = imgRef.current;
    const target = document.getElementById("cart-cta");
    if (!source || !target) return;
    const s = source.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLImageElement;
    clone.style.position = "fixed";
    clone.style.left = `${s.left}px`;
    clone.style.top = `${s.top}px`;
    clone.style.width = `${s.width}px`;
    clone.style.height = `${s.height}px`;
    clone.style.borderRadius = "12px";
    clone.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
    clone.style.zIndex = "9999";
    clone.style.transition = "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.1s ease";
    document.body.appendChild(clone);
    const dx = t.left + t.width / 2 - (s.left + s.width / 2);
    const dy = t.top + t.height / 2 - (s.top + s.height / 2);
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
      clone.style.opacity = "0.2";
    });
    setTimeout(() => {
      clone.remove();
    }, 1150);
  };

  return (
    <>
      <div
        className="relative border rounded-md overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        onClick={() => setOpen(true)}
      >
        <div className="aspect-square w-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <img ref={imgRef} src={images[idx]} alt={product.title} className="h-full w-full object-cover" />
        </div>
        <div className="p-3">
          <h3 className="font-semibold line-clamp-1 text-sm" style={{ color: theme.text }}>{product.title}</h3>
          <p className="text-xs line-clamp-2 mt-0.5" style={{ color: theme.text, opacity: 0.7 }}>{product.description}</p>
          {priceSection}
          <Button
            className="mt-2 w-full"
            style={{ backgroundColor: added ? '#10b981' : theme.primary, color: theme.background }}
            size="sm"
            disabled={!product.inStock}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("add-to-cart", { detail: product }));
              flyToCart();
              setAdded(true);
              const t = setTimeout(() => setAdded(false), 1400);
              return () => clearTimeout(t);
            }}
          >
            {product.inStock ? (added ? "Added" : "Add to Cart") : "Out of Stock"}
          </Button>
        </div>
        <div
          className={`pointer-events-none absolute top-2 right-2 rounded-full bg-green-600 text-white text-xs px-2 py-1 shadow-md transition-all duration-300 ${added ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
        >
          Added
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-lg shadow-lg" style={{ backgroundColor: theme.surface }} onClick={(e) => e.stopPropagation()}>
                <div className="grid sm:grid-cols-2 h-full">
                  <div className="relative flex items-center justify-center aspect-square sm:aspect-auto" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <button
                      aria-label="Close"
                      className="absolute top-2 right-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full shadow"
                      style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: theme.background }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                      }}
                    >
                      ✕
                    </button>
                    <button
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full shadow"
                      style={{ backgroundColor: 'rgba(255,255,255,0.8)', color: theme.background }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIdx((v) => (v - 1 + images.length) % images.length);
                      }}
                    >
                      ‹
                    </button>
                    <img src={images[idx]} alt={product.title} className="max-h-[70vh] w-full object-contain" />
                    <button
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full shadow"
                      style={{ backgroundColor: 'rgba(255,255,255,0.8)', color: theme.background }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIdx((v) => (v + 1) % images.length);
                      }}
                    >
                      ›
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 overflow-y-auto">
                    <h2 className="text-lg sm:text-xl font-semibold" style={{ color: theme.text }}>{product.title}</h2>
                    <p className="text-sm mt-2 whitespace-pre-line" style={{ color: theme.text, opacity: 0.8 }}>{product.description}</p>
                    <div className="mt-3">{priceSection}</div>
                    <Button
                      className="mt-4 w-full"
                      style={{ backgroundColor: added ? '#10b981' : theme.primary, color: theme.background }}
                      disabled={!product.inStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("add-to-cart", { detail: product }));
                        setAdded(true);
                        const t = setTimeout(() => setAdded(false), 1400);
                        return () => clearTimeout(t);
                      }}
                    >
                      {product.inStock ? (added ? "Added" : "Add to Cart") : "Out of Stock"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

