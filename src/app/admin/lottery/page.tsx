"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import AuthGuard from "../../components/Auth/AuthGuard";

const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

type LotteryOrder = {
  id: string;
  ticketNumber: number;
  name: string;
  phone: string;
  email: string;
  parish: string;
  transactionId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: any;
};

export default function AdminLotteryPage() {
  const [orders, setOrders] = useState<LotteryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/lottery/admin/orders');
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (orderId: string, ticketNumber: number) => {
    if (!confirm(`Confirm order for Ticket #${ticketNumber}? This will send the E-Ticket to the customer.`)) {
      return;
    }

    setProcessing(orderId);

    try {
      const response = await fetch('/api/lottery/admin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Order confirmed and E-Ticket sent!');
        fetchOrders();
      } else {
        alert(data.error || 'Failed to confirm order');
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Failed to confirm order');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (orderId: string, ticketNumber: number) => {
    if (!confirm(`Decline order for Ticket #${ticketNumber}? This will release the ticket back to the pool.`)) {
      return;
    }

    setProcessing(orderId);

    try {
      const response = await fetch('/api/lottery/admin/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Order declined and ticket released');
        fetchOrders();
      } else {
        alert(data.error || 'Failed to decline order');
      }
    } catch (error) {
      console.error('Error declining order:', error);
      alert('Failed to decline order');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div style={{ color: theme.text }}>Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen p-4" style={{ backgroundColor: theme.background }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6" style={{ color: theme.text }}>Lottery Orders Management</h1>

        <div className="mb-4 flex gap-2">
          <Button onClick={fetchOrders} style={{ backgroundColor: theme.primary, color: theme.background }}>
            Refresh
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 rounded-lg text-center" style={{ backgroundColor: theme.surface, borderColor: theme.border, border: '1px solid', color: theme.text }}>
            No orders found
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: order.status !== 'pending' ? 0.6 : 1,
                }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold mb-2" style={{ color: theme.primary }}>
                      Ticket #{order.ticketNumber}
                    </div>
                    <div className="space-y-2 text-sm" style={{ color: theme.text }}>
                      <div><strong>Order ID:</strong> {order.id}</div>
                      <div><strong>Name:</strong> {order.name}</div>
                      <div><strong>Phone:</strong> {order.phone}</div>
                      <div><strong>Email:</strong> {order.email}</div>
                      <div><strong>Parish:</strong> {order.parish}</div>
                      <div><strong>Transaction ID:</strong> <span style={{ color: theme.primary }}>{order.transactionId}</span></div>
                      <div><strong>Amount:</strong> ₹{order.amount}</div>
                      <div><strong>Status:</strong> <span style={{ 
                        color: order.status === 'confirmed' ? '#22c55e' : order.status === 'declined' ? '#ef4444' : '#eab308'
                      }}>{order.status.toUpperCase()}</span></div>
                      <div><strong>Created:</strong> {new Date(order.createdAt._seconds * 1000).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {order.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleConfirm(order.id, order.ticketNumber)}
                          disabled={processing === order.id}
                          className="flex-1"
                          style={{ backgroundColor: '#22c55e', color: 'white' }}
                        >
                          {processing === order.id ? 'Processing...' : 'Confirm Order'}
                        </Button>
                        <Button
                          onClick={() => handleDecline(order.id, order.ticketNumber)}
                          disabled={processing === order.id}
                          className="flex-1"
                          style={{ backgroundColor: '#ef4444', color: 'white' }}
                        >
                          {processing === order.id ? 'Processing...' : 'Decline Order'}
                        </Button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <div className="text-center" style={{ color: '#22c55e' }}>
                        ✓ Order Confirmed & E-Ticket Sent
                      </div>
                    )}
                    {order.status === 'declined' && (
                      <div className="text-center" style={{ color: '#ef4444' }}>
                        ✗ Order Declined
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </AuthGuard>
  );
}
