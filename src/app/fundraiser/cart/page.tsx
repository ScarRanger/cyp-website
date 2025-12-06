"use client";

import React, { useState } from "react";
import { useCart } from "../../providers/CartProvider";
import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";

const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

export default function CartPage() {
  const { items, updateQty, removeFromCart, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [showCheckout, setShowCheckout] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    parish: '',
    paymentMode: '',
    transactionId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePaymentModeChange = (mode: string) => {
    setFormData(prev => ({ ...prev, paymentMode: mode }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const orderData = {
        ...formData,
        items: items.map(({ product, qty }) => ({
          title: product.title,
          price: product.price,
          qty: qty,
        })),
        subtotal: subtotal,
      };

      const response = await fetch('/api/fundraiser/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage('Order placed successfully! We will contact you soon. 🎉');
        setFormData({ name: '', phone: '', parish: '', paymentMode: '', transactionId: '' });
        setTimeout(() => {
          clearCart();
          router.push('/fundraiser');
        }, 3000);
      } else {
        setSubmitMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setSubmitMessage('Failed to submit order. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showCheckout) {
    return (
      <div className="p-4 min-h-screen" style={{ backgroundColor: theme.background }}>
        <div className="mb-3">
          <Button variant="ghost" size="sm" onClick={() => setShowCheckout(false)} style={{ color: theme.text }}>
            ← Back to Cart
          </Button>
        </div>
        <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Checkout</h1>
        
        <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <h2 className="font-semibold mb-2" style={{ color: theme.text }}>Order Summary</h2>
          <div className="space-y-1 text-sm" style={{ color: theme.text }}>
            {items.map(({ product, qty }) => (
              <div key={product.id} className="flex justify-between">
                <span>{product.title} x {qty}</span>
                <span>₹{(product.price * qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 font-semibold flex justify-between" style={{ borderColor: theme.border }}>
              <span>Total:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border bg-white/5 focus:outline-none transition-colors"
              style={{ borderColor: theme.border, color: theme.text }}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border bg-white/5 focus:outline-none transition-colors"
              style={{ borderColor: theme.border, color: theme.text }}
              placeholder="+91 1234567890"
            />
          </div>

          <div>
            <label htmlFor="parish" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Parish *
            </label>
            <input
              type="text"
              id="parish"
              name="parish"
              required
              value={formData.parish}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border bg-white/5 focus:outline-none transition-colors"
              style={{ borderColor: theme.border, color: theme.text }}
              placeholder="Your parish name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Payment Mode *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePaymentModeChange('UPI')}
                className="p-4 rounded-lg border-2 transition-all"
                style={{
                  borderColor: formData.paymentMode === 'UPI' ? theme.primary : theme.border,
                  backgroundColor: formData.paymentMode === 'UPI' ? 'rgba(251, 146, 60, 0.1)' : 'transparent',
                  color: theme.text
                }}
              >
                <div className="font-semibold">UPI Payment</div>
                <div className="text-xs mt-1" style={{ opacity: 0.7 }}>Pay via UPI</div>
              </button>
              <button
                type="button"
                onClick={() => handlePaymentModeChange('Cash')}
                className="p-4 rounded-lg border-2 transition-all"
                style={{
                  borderColor: formData.paymentMode === 'Cash' ? theme.primary : theme.border,
                  backgroundColor: formData.paymentMode === 'Cash' ? 'rgba(251, 146, 60, 0.1)' : 'transparent',
                  color: theme.text
                }}
              >
                <div className="font-semibold">Cash</div>
                <div className="text-xs mt-1" style={{ opacity: 0.7 }}>Pay in cash</div>
              </button>
            </div>
          </div>

          {formData.paymentMode === 'UPI' && (
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(251, 146, 60, 0.05)', borderColor: theme.border }}>
              <div className="text-center mb-3">
                <p className="font-semibold mb-2" style={{ color: theme.text }}>Scan QR Code to Pay</p>
                <div className="p-4 inline-block rounded-lg" style={{ backgroundColor: 'white' }}>
                  <img 
                    src="/qr-code-upi.png" 
                    alt="UPI QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm mt-3" style={{ color: theme.text, opacity: 0.8 }}>
                  After payment, enter the transaction ID below
                </p>
              </div>
              <div className="mt-4">
                <label htmlFor="transactionId" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                  UPI Transaction ID *
                </label>
                <input
                  type="text"
                  id="transactionId"
                  name="transactionId"
                  required
                  value={formData.transactionId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border bg-white/5 focus:outline-none transition-colors"
                  style={{ borderColor: theme.border, color: theme.text }}
                  placeholder="Enter 12-digit transaction ID"
                />
              </div>
            </div>
          )}

          {submitMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              submitMessage.includes('successfully') 
                ? 'bg-green-500/20 border border-green-500/30 text-green-900' 
                : 'bg-red-500/20 border border-red-500/30 text-red-900'
            }`}>
              {submitMessage}
            </div>
          )}

          <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', color: theme.text }}>
            For queries, contact: <strong style={{ color: theme.primary }}>+91 8551098035</strong>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !formData.paymentMode}
            size="lg"
            className="w-full font-semibold"
            style={{ backgroundColor: '#FB923C', color: '#1C1917' }}
          >
            {isSubmitting ? 'Submitting...' : 'Place Order'}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen" style={{ backgroundColor: theme.background }}>
      <div className="mb-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} style={{ color: theme.text }}>
          ← Back
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Your Cart</h1>
      {items.length === 0 ? (
        <div style={{ color: theme.text, opacity: 0.7 }}>Your cart is empty.</div>
      ) : (
        <div className="space-y-4">
          {items.map(({ product, qty }) => (
            <div key={product.id} className="flex gap-3 border rounded-md p-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <img src={product.images[0]} alt={product.title} className="h-20 w-20 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium" style={{ color: theme.text }}>{product.title}</div>
                <div className="text-sm line-clamp-2" style={{ color: theme.text, opacity: 0.7 }}>{product.description}</div>
                <div className="mt-1" style={{ color: theme.primary }}>₹{product.price}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Decrease quantity"
                    onClick={() => updateQty(product.id, Math.max(1, qty - 1))}
                  >
                    −
                  </Button>
                  <span className="inline-flex items-center justify-center min-w-8 px-2 h-8 border rounded-md text-gray-900 bg-white">
                    {qty}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Increase quantity"
                    onClick={() => updateQty(product.id, qty + 1)}
                  >
                    +
                  </Button>
                  <Button variant="outline" onClick={() => removeFromCart(product.id)}>Remove</Button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: theme.border }}>
            <div className="text-lg font-semibold" style={{ color: theme.text }}>Subtotal: ₹{subtotal.toFixed(2)}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearCart}>Clear</Button>
              <Button onClick={handleCheckout} style={{ backgroundColor: '#FB923C', color: '#1C1917' }}>
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
