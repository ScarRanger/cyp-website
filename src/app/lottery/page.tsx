"use client";

import React, { useState, useEffect } from "react";
// Update the import path below if your Button component is located elsewhere
import { Button } from "../components/ui/button";
import { useRouter } from "next/navigation";

const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

const LOTTERY_PRICE = 100; // ₹100 per ticket
const TIMER_DURATION = 5 * 60; // 5 minutes in seconds (matches soft-lock expiry)
const SOFT_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function LotteryPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [availableTickets, setAvailableTickets] = useState<number[]>([]);
  const [softLockedTickets, setSoftLockedTickets] = useState<number[]>([]);
  const [soldTickets, setSoldTickets] = useState<number[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerActive, setTimerActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    parish: '',
    transactionId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Generate session ID on mount
  useEffect(() => {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  }, []);

  // Fetch ticket status
  useEffect(() => {
    fetchTicketStatus();
    const interval = setInterval(fetchTicketStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const fetchTicketStatus = async () => {
    try {
      const response = await fetch('/api/lottery/tickets');
      const data = await response.json();
      
      if (response.ok) {
        setAvailableTickets(data.available || []);
        setSoftLockedTickets(data.softLocked || []);
        setSoldTickets(data.sold || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleTicketSelect = async (ticketNumber: number) => {
    if (soldTickets.includes(ticketNumber) || (softLockedTickets.includes(ticketNumber) && !selectedTickets.includes(ticketNumber))) {
      return; // Can't select sold or locked tickets
    }

    // Check if already selected (toggle off)
    if (selectedTickets.includes(ticketNumber)) {
      setSelectedTickets(prev => prev.filter(t => t !== ticketNumber));
      // Release the lock
      try {
        await fetch('/api/lottery/release-lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketNumber, sessionId }),
        });
      } catch (error) {
        console.error('Error releasing lock:', error);
      }
      return;
    }

    // Check if we've reached the limit
    if (ticketCount && selectedTickets.length >= ticketCount) {
      alert(`You can only select ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}`);
      return;
    }

    try {
      const response = await fetch('/api/lottery/soft-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketNumber, sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedTickets(prev => [...prev, ticketNumber]);
        if (!timerActive) {
          setTimerActive(true);
          setTimeLeft(TIMER_DURATION);
        }
      } else {
        alert(data.error || 'Failed to select ticket');
      }
    } catch (error) {
      console.error('Error selecting ticket:', error);
      alert('Failed to select ticket');
    }
  };

  const handleTimeout = async () => {
    if (selectedTickets.length > 0) {
      // Release all selected tickets
      for (const ticketNumber of selectedTickets) {
        try {
          await fetch('/api/lottery/release-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketNumber, sessionId }),
          });
        } catch (error) {
          console.error('Error releasing lock:', error);
        }
      }
    }
    
    setSelectedTickets([]);
    setShowCheckout(false);
    setTimerActive(false);
    alert('Time expired! Please start again.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText('dabrecarren10-2@oksbi');
    alert('UPI ID copied to clipboard!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.transactionId.trim()) {
      alert('Please enter UPI Transaction ID');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Submit orders for all selected tickets
      const promises = selectedTickets.map(ticketNumber => {
        const orderData = {
          ...formData,
          ticketNumber,
          amount: LOTTERY_PRICE,
          sessionId,
        };

        return fetch('/api/lottery/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
      });

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(r => r.ok);

      if (allSuccessful) {
        setSubmitMessage('Order placed successfully! Check your email for confirmation. 🎉');
        setFormData({ name: '', phone: '', email: '', parish: '', transactionId: '' });
        setTimeout(() => {
          router.push('/lottery');
          window.location.reload();
        }, 3000);
      } else {
        setSubmitMessage('Some orders failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setSubmitMessage('Failed to submit order. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showCheckout && selectedTickets.length > 0) {
    const totalAmount = selectedTickets.length * LOTTERY_PRICE;
    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: theme.background }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowCheckout(false);
                setTimerActive(false);
              }} 
              style={{ color: theme.text }}
            >
              ← Back to Tickets
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: timeLeft < 120 ? '#ef4444' : theme.primary, color: theme.background }}>
              <span className="font-bold text-lg">⏱️ {formatTime(timeLeft)}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Lottery Ticket Checkout</h1>

          <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <h2 className="font-semibold mb-2" style={{ color: theme.text }}>Selected Tickets ({selectedTickets.length})</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTickets.sort((a, b) => a - b).map(ticket => (
                <div key={ticket} className="px-3 py-1 rounded-lg font-bold" style={{ backgroundColor: theme.primary, color: theme.background }}>
                  #{ticket}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
              <div className="text-sm" style={{ color: theme.text, opacity: 0.7 }}>Total Amount</div>
              <div className="text-3xl font-bold" style={{ color: theme.primary }}>
                ₹{totalAmount}
              </div>
              <div className="text-xs mt-1" style={{ color: theme.text, opacity: 0.6 }}>
                {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} × ₹{LOTTERY_PRICE}
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
                className="w-full px-4 py-2 rounded-md border"
                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
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
                className="w-full px-4 py-2 rounded-md border"
                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md border"
                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
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
                className="w-full px-4 py-2 rounded-md border"
                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
              />
            </div>

            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'rgba(251, 146, 60, 0.05)', borderColor: theme.border }}>
              <h3 className="font-semibold mb-3" style={{ color: theme.text }}>UPI Payment</h3>
              
              <div className="mb-4 p-3 rounded-lg flex justify-center" style={{ backgroundColor: 'white' }}>
                <img src="/qr-code-upi.png" alt="UPI QR Code" className="w-48 h-48" />
              </div>

              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: theme.surface }}>
                <div className="text-sm mb-1" style={{ color: theme.text, opacity: 0.7 }}>UPI ID:</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold" style={{ color: theme.primary }}>dabrecarren10-2@oksbi</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={copyUpiId}
                    style={{ backgroundColor: theme.primary, color: theme.background }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
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
                  placeholder="Enter transaction ID after payment"
                  className="w-full px-4 py-2 rounded-md border"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                />
              </div>
            </div>

            {submitMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                submitMessage.includes('successfully') 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-red-500/20 border border-red-500/30'
              }`} style={{ 
                color: submitMessage.includes('successfully') ? '#22c55e' : '#ef4444'
              }}>
                {submitMessage}
              </div>
            )}

            <div className="text-sm p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(251, 146, 60, 0.05)', borderColor: theme.border, color: theme.text }}>
              You will receive a confirmation email. The E-Ticket will be sent after payment verification.
            </div>

            <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', color: theme.text }}>
              For queries, contact: <strong style={{ color: theme.primary }}>+91 8551098035</strong>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !formData.transactionId.trim()}
              size="lg"
              className="w-full font-semibold"
              style={{ backgroundColor: theme.primary, color: theme.background }}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Purchase'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-32" style={{ backgroundColor: theme.background }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold mb-2" style={{ color: theme.text }}>CYP Fundraiser Lottery</h1>
            <p className="text-lg" style={{ color: theme.text, opacity: 0.8 }}>Select your lucky ticket numbers (1-50)</p>
          </div>
          
          {/* Ticket Count Selector */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <label htmlFor="ticketCount" className="font-semibold" style={{ color: theme.text }}>
              How many tickets?
            </label>
            <select
              id="ticketCount"
              value={ticketCount}
              onChange={(e) => {
                const newCount = parseInt(e.target.value);
                setTicketCount(newCount);
                // Clear selections if exceeding new limit
                if (selectedTickets.length > newCount) {
                  setSelectedTickets(prev => prev.slice(0, newCount));
                }
              }}
              className="px-4 py-2 rounded-lg font-semibold text-lg border-2"
              style={{ 
                backgroundColor: theme.surface, 
                borderColor: theme.primary, 
                color: theme.text,
                outline: 'none'
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} Ticket{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <p className="text-sm text-center" style={{ color: theme.primary }}>
            Selected: {selectedTickets.length} / {ticketCount} tickets
          </p>
        </div>

        {/* Prizes Section */}
        <div className="mb-6 p-4 md:p-6 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', border: '2px solid', borderColor: theme.primary }}>
          <h2 className="text-xl md:text-2xl font-bold text-center mb-3 md:mb-4" style={{ color: theme.primary }}>🎁 Amazing Prizes to Win! 🎁</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            <div className="p-2 md:p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🥇</span>
                <div>
                  <div className="font-bold text-sm md:text-base" style={{ color: theme.text }}>1st Prize</div>
                  <div className="text-xs md:text-sm" style={{ color: theme.primary }}>Smartphone</div>
                </div>
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🥈</span>
                <div>
                  <div className="font-bold text-sm md:text-base" style={{ color: theme.text }}>2nd Prize</div>
                  <div className="text-xs md:text-sm" style={{ color: theme.primary }}>Home Theatre</div>
                </div>
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🥉</span>
                <div>
                  <div className="font-bold text-sm md:text-base" style={{ color: theme.text }}>3rd Prize</div>
                  <div className="text-xs md:text-sm" style={{ color: theme.primary }}>Air Fryer</div>
                </div>
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🏅</span>
                <div>
                  <div className="font-bold text-sm md:text-base" style={{ color: theme.text }}>4th Prize</div>
                  <div className="text-xs md:text-sm" style={{ color: theme.primary }}>Mixer</div>
                </div>
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🏅</span>
                <div>
                  <div className="font-bold text-sm md:text-base" style={{ color: theme.text }}>5th Prize</div>
                  <div className="text-xs md:text-sm" style={{ color: theme.primary }}>Iron</div>
                </div>
              </div>
            </div>
            <div className="p-2 md:p-3 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.15)' }}>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🎁</span>
                <div>
                  <div className="font-bold text-sm md:text-base" style={{ color: theme.text }}>6th-8th Prize</div>
                  <div className="text-xs md:text-sm" style={{ color: theme.primary }}>Consolation Prizes</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="font-bold text-sm md:text-base" style={{ color: theme.text }}>
              The Draw will be on 29th December at Jeevan Darshan Kendra, Giriz
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', borderColor: theme.border, border: '1px solid' }}>
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.primary }}></div>
              <span style={{ color: theme.text }}>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span style={{ color: theme.text }}>Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-500"></div>
              <span style={{ color: theme.text }}>Sold</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
          {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => {
            const isSold = soldTickets.includes(num);
            const isSoftLocked = softLockedTickets.includes(num) && !selectedTickets.includes(num);
            const isSelected = selectedTickets.includes(num);
            const isAvailable = !isSold && !isSoftLocked;

            return (
              <button
                key={num}
                onClick={() => isAvailable && handleTicketSelect(num)}
                disabled={isSold || isSoftLocked}
                className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                  isAvailable ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
                style={{
                  backgroundColor: isSold ? '#6b7280' : isSoftLocked ? '#eab308' : isSelected ? '#22c55e' : theme.primary,
                  color: theme.background,
                  border: '2px solid',
                  borderColor: isSold ? '#4b5563' : isSoftLocked ? '#ca8a04' : isSelected ? '#16a34a' : theme.primary,
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {num}
                {isSelected && <span className="text-xs block">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(251, 146, 60, 0.1)', color: theme.text }}>
          <p className="text-sm">
            The funds raised from the lottery will be used for: CYP Works of Mercy & Charity, Evangelizing youth, Conducting retreats & youth camps
          </p>
        </div>
      </div>

      {/* Floating Checkout Button */}
      {selectedTickets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 shadow-2xl" style={{ backgroundColor: theme.surface, borderTop: '2px solid', borderColor: theme.primary }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold" style={{ color: theme.text }}>
                    {selectedTickets.length} Ticket{selectedTickets.length > 1 ? 's' : ''} Selected:
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {selectedTickets.sort((a, b) => a - b).slice(0, 5).map(ticket => (
                      <div key={ticket} className="px-2 py-1 rounded text-sm font-bold" style={{ backgroundColor: theme.primary, color: theme.background }}>
                        #{ticket}
                      </div>
                    ))}
                    {selectedTickets.length > 5 && (
                      <div className="px-2 py-1 rounded text-sm" style={{ color: theme.text }}>
                        +{selectedTickets.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm mt-1" style={{ color: theme.text, opacity: 0.7 }}>
                  Total Amount: <span className="font-bold" style={{ color: theme.primary }}>₹{selectedTickets.length * LOTTERY_PRICE}</span>
                </div>
              </div>
              <Button
                onClick={() => setShowCheckout(true)}
                size="lg"
                className="font-bold shadow-lg"
                style={{ backgroundColor: theme.primary, color: theme.background }}
              >
                Proceed to Checkout →
              </Button>
            </div>
            {timerActive && (
              <div className="mt-2 text-center text-sm" style={{ color: timeLeft < 120 ? '#ef4444' : theme.primary }}>
                ⏱️ Time remaining: {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
