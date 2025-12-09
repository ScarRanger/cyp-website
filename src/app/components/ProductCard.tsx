"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Product, ProductVariant } from "../types/product";
import { Button } from "./ui/button";
import { useRef } from "react";
import { useCart } from "../providers/CartProvider";

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
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const { items, addToCart, updateQty, removeFromCart } = useCart();

  // Get current quantity in cart for products without variants
  const cartItem = items.find(i => i.product.id === product.id && !i.selectedVariant);
  const currentQty = cartItem?.qty || 0;

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
        onClick={() => {
          // Check if it's a lottery product
          if ((product as any).isLottery) {
            window.location.href = '/lottery';
            return;
          }
          
          setOpen(true);
          if (product.hasVariants && product.variants && product.variants.length > 0) {
            setShowVariants(true);
          }
        }}
      >
        <div className="aspect-square w-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <img ref={imgRef} src={images[idx]} alt={product.title} className="h-full w-full object-cover" />
        </div>
        <div className="p-3">
          <h3 className="font-semibold line-clamp-1 text-sm" style={{ color: theme.text }}>{product.title}</h3>
          <p className="text-xs line-clamp-2 mt-0.5" style={{ color: theme.text, opacity: 0.7 }}>{product.description}</p>
          {priceSection}
          
          {/* Show quantity controls for products without variants */}
          {!product.hasVariants && !(product as any).isLottery ? (
            currentQty > 0 ? (
              <div className="mt-2 w-full flex items-center justify-between border-2 rounded-full px-4 py-2" style={{ borderColor: theme.primary }}>
                <button
                  className="w-8 h-8 flex items-center justify-center font-bold text-xl hover:opacity-70 transition-opacity"
                  style={{ color: theme.text }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentQty === 1) {
                      removeFromCart(product.id);
                    } else {
                      updateQty(product.id, currentQty - 1);
                    }
                  }}
                >
                  {currentQty === 1 ? '🗑' : '−'}
                </button>
                <span className="font-bold text-lg" style={{ color: theme.text }}>{currentQty}</span>
                <button
                  className="w-8 h-8 flex items-center justify-center font-bold text-xl hover:opacity-70 transition-opacity"
                  style={{ color: theme.text }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQty(product.id, currentQty + 1);
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <Button
                className="mt-2 w-full"
                style={{ backgroundColor: added ? '#10b981' : theme.primary, color: theme.background }}
                size="sm"
                disabled={!product.inStock}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product, 1);
                  flyToCart();
                  setAdded(true);
                  setTimeout(() => setAdded(false), 1400);
                }}
              >
                {product.inStock ? (added ? "Added" : "Add to Cart") : "Out of Stock"}
              </Button>
            )
          ) : (
            <Button
              className="mt-2 w-full"
              style={{ backgroundColor: added ? '#10b981' : theme.primary, color: theme.background }}
              size="sm"
              disabled={!product.inStock}
              onClick={(e) => {
                e.stopPropagation();
                
                // Check if it's a lottery product
                if ((product as any).isLottery) {
                  window.location.href = '/lottery';
                  return;
                }
                
                if (product.hasVariants && product.variants && product.variants.length > 0) {
                  setShowVariants(true);
                  setOpen(true);
                }
              }}
            >
              {product.inStock ? ((product as any).isLottery ? "Buy Ticket" : product.hasVariants ? "Select Design" : "Add to Cart") : "Out of Stock"}
            </Button>
          )}
        </div>
        <div
          className={`pointer-events-none absolute top-2 right-2 rounded-full bg-green-600 text-white text-xs px-2 py-1 shadow-md transition-all duration-300 ${added ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
        >
          Added
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute inset-0 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full max-w-5xl max-h-[95vh] sm:rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: theme.surface, borderColor: theme.border, border: '1px solid' }} onClick={(e) => e.stopPropagation()}>
              <div className="grid md:grid-cols-2 max-h-[95vh]">
                <div className="relative flex items-center justify-center bg-black/40 min-h-[300px] md:min-h-[500px]">
                  <button
                    aria-label="Close"
                    className="absolute top-3 right-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-lg font-bold text-lg hover:scale-110 transition-transform"
                    style={{ backgroundColor: theme.primary, color: theme.background }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                    }}
                  >
                    ✕
                  </button>
                  {images.length > 1 && (
                    <>
                      <button
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg font-bold text-2xl hover:scale-110 transition-transform"
                        style={{ backgroundColor: 'rgba(251, 146, 60, 0.9)', color: theme.background }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIdx((v) => (v - 1 + images.length) % images.length);
                        }}
                      >
                        ‹
                      </button>
                      <button
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg font-bold text-2xl hover:scale-110 transition-transform"
                        style={{ backgroundColor: 'rgba(251, 146, 60, 0.9)', color: theme.background }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIdx((v) => (v + 1) % images.length);
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}
                  <img src={images[idx]} alt={product.title} className="max-h-[50vh] md:max-h-[90vh] w-full object-contain p-4" />
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          className="h-2 w-2 rounded-full transition-all"
                          style={{ backgroundColor: i === idx ? theme.primary : 'rgba(255,255,255,0.5)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIdx(i);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-6 overflow-y-auto max-h-[45vh] md:max-h-[95vh]">
                  <h2 className="text-xl sm:text-2xl font-bold" style={{ color: theme.text }}>{product.title}</h2>
                  <p className="text-sm mt-3 leading-relaxed whitespace-pre-line" style={{ color: theme.text, opacity: 0.85 }}>{product.description}</p>
                  <div className="mt-4">{priceSection}</div>
                  
                  {showVariants ? (
                    <>
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Select Design</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {product.variants?.map((variant) => {
                            const isOutOfStock = variant.inStock === false;
                            return (
                              <div
                                key={variant.id}
                                className="cursor-pointer rounded-lg overflow-hidden transition-all relative"
                                style={{
                                  border: selectedVariant?.id === variant.id ? `3px solid ${theme.primary}` : `1px solid ${theme.border}`,
                                  backgroundColor: theme.background,
                                  opacity: isOutOfStock ? 0.6 : 1,
                                }}
                                onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              >
                                <div className="aspect-square relative">
                                  <img
                                    src={variant.images[0]}
                                    alt={variant.name}
                                    className="w-full h-full object-cover"
                                  />
                                  {selectedVariant?.id === variant.id && !isOutOfStock && (
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                                      <span className="text-white text-sm font-bold">✓</span>
                                    </div>
                                  )}
                                  {isOutOfStock && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                      <span className="text-white text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: theme.primary }}>
                                        OUT OF STOCK
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-sm font-medium" style={{ color: theme.text }}>{variant.name}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <Button
                        className="mt-6 w-full text-base font-semibold py-6 hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: added ? '#10b981' : theme.primary, color: theme.background }}
                        disabled={!product.inStock || !selectedVariant || selectedVariant.inStock === false}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedVariant && selectedVariant.inStock !== false) {
                            window.dispatchEvent(new CustomEvent("add-to-cart", { detail: { product, variant: selectedVariant } }));
                            setAdded(true);
                            const t = setTimeout(() => {
                              setAdded(false);
                              setShowVariants(false);
                              setSelectedVariant(null);
                              setOpen(false);
                            }, 1400);
                            return () => clearTimeout(t);
                          }
                        }}
                      >
                        {product.inStock ? (added ? "✓ Added to Cart" : selectedVariant ? (selectedVariant.inStock === false ? "Out of Stock" : "Add to Cart") : "Select a Design") : "Out of Stock"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="mt-6 w-full text-base font-semibold py-6 hover:opacity-90 transition-opacity"
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
                      {product.inStock ? (added ? "✓ Added to Cart" : "Add to Cart") : "Out of Stock"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

