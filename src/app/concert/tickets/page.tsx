"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { TierAvailability } from "@/app/types/concert";

const theme = {
    background: '#0f0f1a',
    surface: '#1a1a2e',
    primary: '#e94560',
    secondary: '#533483',
    accent: '#f5c518',
    text: '#ffffff',
    textMuted: '#a0a0b0',
    border: 'rgba(233, 69, 96, 0.3)',
    gradient: 'linear-gradient(135deg, #e94560 0%, #533483 100%)',
    success: '#22c55e',
    error: '#ef4444',
};

interface SelectedTier {
    tier: string;
    quantity: number;
    price: number;
}

interface ReservationData {
    checkoutId: string;
    expiresAt: string;
    tier: string;
    quantity: number;
}

// Generate a unique session ID
function getSessionId(): string {
    if (typeof window === 'undefined') return '';
    let sessionId = sessionStorage.getItem('concert_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('concert_session_id', sessionId);
    }
    return sessionId;
}

export default function TicketingPage() {
    const [tiers, setTiers] = useState<TierAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTiers, setSelectedTiers] = useState<SelectedTier[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Reservation state
    const [reservation, setReservation] = useState<ReservationData | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isReserving, setIsReserving] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch tiers
    const fetchTiers = useCallback(async () => {
        try {
            const response = await fetch('/api/concert/tiers');
            const data = await response.json();
            if (response.ok && data.tiers) {
                setTiers(data.tiers);
            }
        } catch (error) {
            console.error('Error fetching tiers:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTiers();
        const interval = setInterval(fetchTiers, 30000);
        return () => clearInterval(interval);
    }, [fetchTiers]);

    // Countdown timer for reservation
    useEffect(() => {
        if (!reservation) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeRemaining(0);
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(reservation.expiresAt).getTime();
            const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                // Reservation expired
                setReservation(null);
                setShowCheckout(false);
                setSubmitMessage('Your reservation has expired. Please try again.');
                fetchTiers();
            }
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [reservation, fetchTiers]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSelectTier = (tier: TierAvailability, quantity: number) => {
        if (quantity < 0 || quantity > tier.available) return;

        setSelectedTiers(prev => {
            const filtered = prev.filter(s => s.tier !== tier.tier);
            if (quantity === 0) return filtered;
            return [...filtered, { tier: tier.tier, quantity, price: tier.price }];
        });
    };

    const getTotalAmount = () => {
        return selectedTiers.reduce((sum, s) => sum + (s.quantity * s.price), 0);
    };

    const getTotalTickets = () => {
        return selectedTiers.reduce((sum, s) => sum + s.quantity, 0);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Reserve tickets via soft-lock
    const handleReserve = async () => {
        if (isReserving || selectedTiers.length === 0) return;

        setIsReserving(true);
        setSubmitMessage('');

        try {
            const sessionId = getSessionId();
            const selected = selectedTiers[0]; // For now, handle one tier at a time

            const response = await fetch('/api/concert/soft-lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier: selected.tier,
                    quantity: selected.quantity,
                    sessionId,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setReservation({
                    checkoutId: data.checkoutId,
                    expiresAt: data.expiresAt,
                    tier: selected.tier,
                    quantity: selected.quantity,
                });
                setShowCheckout(true);
            } else {
                setSubmitMessage(data.error || 'Failed to reserve tickets');
                if (data.retryAfter) {
                    setSubmitMessage(`${data.error} (retry in ${data.retryAfter}s)`);
                }
            }
        } catch (error) {
            console.error('Error reserving tickets:', error);
            setSubmitMessage('Failed to reserve tickets. Please try again.');
        } finally {
            setIsReserving(false);
        }
    };

    // Complete order with checkout_id
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || !reservation) return;

        setIsSubmitting(true);
        setSubmitMessage('');

        try {
            const response = await fetch('/api/concert/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkoutId: reservation.checkoutId,
                    ...formData,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubmitSuccess(true);
                setSubmitMessage('🎉 Tickets purchased successfully!');
                setSelectedTiers([]);
                setReservation(null);
                fetchTiers();
            } else {
                setSubmitMessage(data.error || 'Failed to complete purchase');
            }
        } catch (error) {
            console.error('Error processing order:', error);
            setSubmitMessage('Failed to process order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel reservation
    const handleCancelReservation = async () => {
        if (reservation) {
            try {
                await fetch('/api/concert/release-lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        checkoutId: reservation.checkoutId,
                    }),
                });
            } catch (e) {
                console.error('Error releasing lock:', e);
            }
        }
        setReservation(null);
        setShowCheckout(false);
        fetchTiers();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                        style={{ borderColor: `${theme.primary} transparent ${theme.primary} ${theme.primary}` }} />
                    <p style={{ color: theme.textMuted }}>Loading tickets...</p>
                </div>
            </div>
        );
    }

    if (submitSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
                <motion.div
                    className="max-w-lg w-full text-center p-8 rounded-2xl"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>
                        Purchase Successful!
                    </h1>
                    <p className="mb-4" style={{ color: theme.textMuted }}>
                        Your tickets have been sent to your email address.
                    </p>
                    <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'rgba(245, 197, 24, 0.1)' }}>
                        <p style={{ color: theme.accent }}>
                            👤 <strong>{formData.name}</strong> ({formData.email})
                        </p>
                    </div>

                    <div className="mb-6 p-4 rounded-xl border border-dashed" style={{ borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <p className="text-sm" style={{ color: theme.textMuted }}>
                            Please check your inbox (and spam folder) for an email from <strong>tickets@cypvasai.org</strong> containing your e-tickets.
                            Show the QR code from the email at the entrance.
                        </p>
                    </div>

                    <Link href="/concert">
                        <button
                            className="px-8 py-3 rounded-full font-bold"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.text }}
                        >
                            Back to Concert Info
                        </button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    // Checkout view with reservation timer
    if (showCheckout && reservation) {
        return (
            <div className="min-h-screen p-4" style={{ backgroundColor: theme.background }}>
                <div className="max-w-2xl mx-auto">
                    {/* Timer Banner */}
                    <motion.div
                        className="mb-6 p-4 rounded-xl text-center"
                        style={{
                            backgroundColor: timeRemaining < 60 ? `${theme.error}30` : `${theme.accent}20`,
                            border: `1px solid ${timeRemaining < 60 ? theme.error : theme.accent}50`,
                        }}
                        animate={{ scale: timeRemaining < 60 ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 1, repeat: timeRemaining < 60 ? Infinity : 0 }}
                    >
                        <p className="text-sm" style={{ color: timeRemaining < 60 ? theme.error : theme.accent }}>
                            ⏱️ Complete your purchase in
                        </p>
                        <p className="text-3xl font-bold" style={{ color: timeRemaining < 60 ? theme.error : theme.accent }}>
                            {formatTime(timeRemaining)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                            Tickets will be released if not completed
                        </p>
                    </motion.div>

                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={handleCancelReservation}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg"
                            style={{ color: theme.text, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                            ← Cancel & Go Back
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold mb-6" style={{ color: theme.text }}>
                        Complete Your Purchase
                    </h1>

                    {/* Order Summary */}
                    <div
                        className="p-6 rounded-2xl mb-6"
                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                    >
                        <h2 className="font-bold mb-4" style={{ color: theme.text }}>Reserved Tickets</h2>
                        <div className="flex justify-between py-2" style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <span style={{ color: theme.text }}>
                                {reservation.tier} × {reservation.quantity}
                            </span>
                            <span style={{ color: theme.primary }}>
                                ₹{(reservation.quantity * (selectedTiers.find(s => s.tier === reservation.tier)?.price || 0)).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between pt-4 mt-2">
                            <span className="font-bold text-lg" style={{ color: theme.text }}>Total</span>
                            <span className="font-bold text-2xl" style={{ color: theme.primary }}>
                                ₹{getTotalAmount().toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Checkout Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                                Full Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2"
                                style={{
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                    color: theme.text,
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                                Email Address *
                            </label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2"
                                style={{
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                    color: theme.text,
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2"
                                style={{
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                    color: theme.text,
                                }}
                            />
                        </div>

                        {submitMessage && (
                            <div
                                className="p-4 rounded-xl"
                                style={{
                                    backgroundColor: submitMessage.includes('success') ? `${theme.success}20` : `${theme.error}20`,
                                    border: `1px solid ${submitMessage.includes('success') ? theme.success : theme.error}30`,
                                    color: submitMessage.includes('success') ? theme.success : theme.error,
                                }}
                            >
                                {submitMessage}
                            </div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={isSubmitting || timeRemaining === 0}
                            className="w-full py-4 rounded-xl font-bold text-lg"
                            style={{
                                background: theme.gradient,
                                color: theme.text,
                                opacity: isSubmitting || timeRemaining === 0 ? 0.7 : 1,
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isSubmitting ? 'Processing...' : `Confirm Purchase - ₹${getTotalAmount().toLocaleString()}`}
                        </motion.button>
                    </form>
                </div>
            </div>
        );
    }

    // Main ticket selection view
    return (
        <div className="min-h-screen p-4 pb-32" style={{ backgroundColor: theme.background }}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <Link href="/concert" className="inline-block mb-4 text-sm" style={{ color: theme.textMuted }}>
                        ← Back to Concert Info
                    </Link>
                    <h1
                        className="text-3xl md:text-4xl font-bold mb-2"
                        style={{ color: theme.text }}
                    >
                        🎟️ Select Your Tickets
                    </h1>
                    <p style={{ color: theme.textMuted }}>
                        CYP Concert 2026 • March 21, 2026
                    </p>
                </div>

                {/* Message Banner */}
                {submitMessage && !showCheckout && (
                    <div
                        className="mb-6 p-4 rounded-xl text-center"
                        style={{
                            backgroundColor: `${theme.error}20`,
                            border: `1px solid ${theme.error}30`,
                            color: theme.error,
                        }}
                    >
                        {submitMessage}
                    </div>
                )}

                {/* Tier Cards */}
                <div className="space-y-4 mb-8">
                    {tiers.map((tier, index) => {
                        const selected = selectedTiers.find(s => s.tier === tier.tier);
                        const isSelected = !!selected;
                        const isSoldOut = tier.available === 0;

                        return (
                            <motion.div
                                key={tier.tier}
                                className="p-6 rounded-2xl"
                                style={{
                                    backgroundColor: theme.surface,
                                    border: isSelected ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                                    opacity: isSoldOut ? 0.5 : 1,
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: isSoldOut ? 0.5 : 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold" style={{ color: theme.text }}>
                                                {tier.tier}
                                            </h3>
                                            {isSoldOut && (
                                                <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: theme.error, color: theme.text }}>
                                                    SOLD OUT
                                                </span>
                                            )}
                                        </div>
                                        {tier.description && (
                                            <p className="text-sm mb-2" style={{ color: theme.textMuted }}>
                                                {tier.description}
                                            </p>
                                        )}
                                        <p className="text-2xl font-bold" style={{ color: theme.primary }}>
                                            ₹{tier.price.toLocaleString()}
                                        </p>
                                        <p className="text-sm" style={{ color: theme.textMuted }}>
                                            {tier.available} of {tier.total} available
                                        </p>
                                    </div>

                                    {!isSoldOut && (
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={selected?.quantity || 0}
                                                onChange={(e) => handleSelectTier(tier, parseInt(e.target.value))}
                                                className="px-4 py-2 rounded-xl font-semibold outline-none cursor-pointer"
                                                style={{
                                                    backgroundColor: theme.surface,
                                                    border: `1px solid ${theme.border}`,
                                                    color: theme.text,
                                                }}
                                            >
                                                <option value={0} style={{ backgroundColor: theme.surface, color: theme.text }}>Select</option>
                                                {[...Array(Math.min(tier.available, 10))].map((_, i) => (
                                                    <option
                                                        key={i + 1}
                                                        value={i + 1}
                                                        style={{ backgroundColor: theme.surface, color: theme.text }}
                                                    >
                                                        {i + 1} {i === 0 ? 'Ticket' : 'Tickets'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {isSelected && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 pt-4"
                                        style={{ borderTop: `1px solid ${theme.border}` }}
                                    >
                                        <div className="flex justify-between">
                                            <span style={{ color: theme.textMuted }}>Subtotal</span>
                                            <span className="font-bold" style={{ color: theme.primary }}>
                                                ₹{(selected.quantity * tier.price).toLocaleString()}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Floating Checkout Bar */}
                <AnimatePresence>
                    {selectedTiers.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-0 left-0 right-0 p-4"
                            style={{ backgroundColor: theme.surface, borderTop: `1px solid ${theme.border}` }}
                        >
                            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm" style={{ color: theme.textMuted }}>
                                        {getTotalTickets()} ticket{getTotalTickets() > 1 ? 's' : ''} selected
                                    </p>
                                    <p className="text-2xl font-bold" style={{ color: theme.primary }}>
                                        ₹{getTotalAmount().toLocaleString()}
                                    </p>
                                </div>
                                <motion.button
                                    onClick={handleReserve}
                                    disabled={isReserving}
                                    className="px-8 py-3 rounded-xl font-bold"
                                    style={{
                                        background: theme.gradient,
                                        color: theme.text,
                                        opacity: isReserving ? 0.7 : 1,
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isReserving ? 'Reserving...' : 'Reserve Tickets →'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
