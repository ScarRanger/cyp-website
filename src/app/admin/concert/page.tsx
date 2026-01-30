"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface TierStats {
    available: number;
    pending: number;
    sold: number;
    revenue: number;
}

interface TierConfig {
    name: string;
    price: number;
}

interface Order {
    tier: string;
    quantity: number;
    status: string;
    created_at: string;
    paid_at: string | null;
    name: string | null;
    email: string | null;
}

interface Stats {
    tiers: Record<string, TierStats>;
    totalSold: number;
    totalPending: number;
    totalRevenue: number;
    recentOrders: Order[];
}

const theme = {
    background: '#0f0f1a',
    surface: '#1a1a2e',
    primary: '#e94560',
    secondary: '#533483',
    accent: '#f5c518',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    text: '#ffffff',
    textMuted: '#a0a0b0',
    border: 'rgba(233, 69, 96, 0.3)',
};

const tierColors: Record<string, string> = {
    silver: '#94a3b8',
    gold: '#f59e0b',
    diamond: '#60a5fa',
};

export default function ConcertAdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [tierConfig, setTierConfig] = useState<Record<string, TierConfig>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Tier editing state
    const [editingTier, setEditingTier] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState(0);
    const [tierActionLoading, setTierActionLoading] = useState(false);
    const [tierActionMessage, setTierActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Inventory management state (separate section)
    const [showInventoryPanel, setShowInventoryPanel] = useState(false);
    const [inventoryTier, setInventoryTier] = useState('general');
    const [inventoryQuantity, setInventoryQuantity] = useState<number>(100);
    const [inventoryAction, setInventoryAction] = useState<'initialize' | 'add' | 'remove'>('add');
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [inventoryMessage, setInventoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmInventoryAction, setConfirmInventoryAction] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/concert/admin');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch stats');
            }

            setStats(data.stats);
            setTierConfig(data.tierConfig || {});
            setLastUpdated(data.lastUpdated);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const handleTierConfigUpdate = async () => {
        if (!editingTier) return;

        setTierActionLoading(true);
        setTierActionMessage(null);

        try {
            const response = await fetch('/api/concert/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateTierConfig',
                    tier: editingTier,
                    name: editName,
                    price: editPrice,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Update failed');
            }

            setTierActionMessage({ type: 'success', text: `${editingTier} tier updated successfully` });
            setEditingTier(null);
            fetchStats();
        } catch (err) {
            setTierActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Update failed' });
        } finally {
            setTierActionLoading(false);
        }
    };

    const handleInventoryAction = async () => {
        if (!confirmInventoryAction) {
            setConfirmInventoryAction(true);
            return;
        }

        setInventoryLoading(true);
        setInventoryMessage(null);

        try {
            const response = await fetch('/api/concert/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: inventoryAction,
                    tier: inventoryTier,
                    quantity: inventoryQuantity,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Action failed');
            }

            setInventoryMessage({
                type: 'success',
                text: `${inventoryAction} successful! New count: ${data.newCount}. Redis: Updated, Supabase: ${data.storage?.supabase || 'Updated'}`,
            });
            setConfirmInventoryAction(false);
            fetchStats();
        } catch (err) {
            setInventoryMessage({ type: 'error', text: err instanceof Error ? err.message : 'Action failed' });
            setConfirmInventoryAction(false);
        } finally {
            setInventoryLoading(false);
        }
    };

    const startEditingTier = (tierId: string) => {
        setEditingTier(tierId);
        setEditName(tierConfig[tierId]?.name || tierId);
        setEditPrice(tierConfig[tierId]?.price || 0);
        setTierActionMessage(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return theme.success;
            case 'pending': return theme.warning;
            case 'expired': return theme.textMuted;
            case 'cancelled': return theme.primary;
            default: return theme.textMuted;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: theme.primary }}></div>
                    <p style={{ color: theme.textMuted }}>Loading concert data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: theme.background }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: theme.text }}>
                            Concert Ticket Management
                        </h1>
                        <p style={{ color: theme.textMuted }}>
                            Real-time inventory and sales dashboard
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {lastUpdated && (
                            <span className="text-sm" style={{ color: theme.textMuted }}>
                                Last updated: {formatDate(lastUpdated)}
                            </span>
                        )}
                        <button
                            onClick={() => { setLoading(true); fetchStats(); }}
                            className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                            style={{ backgroundColor: theme.primary, color: theme.text }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(233, 69, 96, 0.2)', border: `1px solid ${theme.primary}` }}>
                        <p style={{ color: theme.primary }}>Error: {error}</p>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <motion.div
                        className="p-6 rounded-xl"
                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="text-sm uppercase tracking-wide mb-1" style={{ color: theme.textMuted }}>Tickets Sold</div>
                        <div className="text-3xl font-bold" style={{ color: theme.success }}>
                            {stats?.totalSold || 0}
                        </div>
                    </motion.div>

                    <motion.div
                        className="p-6 rounded-xl"
                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="text-sm uppercase tracking-wide mb-1" style={{ color: theme.textMuted }}>Pending Checkouts</div>
                        <div className="text-3xl font-bold" style={{ color: theme.warning }}>
                            {stats?.totalPending || 0}
                        </div>
                    </motion.div>

                    <motion.div
                        className="p-6 rounded-xl"
                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="text-sm uppercase tracking-wide mb-1" style={{ color: theme.textMuted }}>Total Revenue</div>
                        <div className="text-3xl font-bold" style={{ color: theme.accent }}>
                            {formatCurrency(stats?.totalRevenue || 0)}
                        </div>
                    </motion.div>

                    <motion.div
                        className="p-6 rounded-xl"
                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="text-sm uppercase tracking-wide mb-1" style={{ color: theme.textMuted }}>Total Available</div>
                        <div className="text-3xl font-bold" style={{ color: theme.text }}>
                            {Object.values(stats?.tiers || {}).reduce((sum, t) => sum + t.available, 0)}
                        </div>
                    </motion.div>
                </div>

                {/* Tier Configuration & Inventory */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Tier Cards */}
                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold" style={{ color: theme.text }}>Tier Configuration</h2>
                            {tierActionMessage && (
                                <span className="text-sm" style={{ color: tierActionMessage.type === 'success' ? theme.success : theme.primary }}>
                                    {tierActionMessage.text}
                                </span>
                            )}
                        </div>
                        <div className="grid gap-4">
                            {Object.keys(tierColors).map((tierId) => {
                                const tierStats = stats?.tiers[tierId];
                                const config = tierConfig[tierId] || { name: tierId, price: 0 };
                                const total = (tierStats?.available || 0) + (tierStats?.sold || 0) + (tierStats?.pending || 0);
                                const soldPercent = total > 0 ? ((tierStats?.sold || 0) / total) * 100 : 0;
                                const pendingPercent = total > 0 ? ((tierStats?.pending || 0) / total) * 100 : 0;
                                const isEditing = editingTier === tierId;

                                return (
                                    <motion.div
                                        key={tierId}
                                        className="p-5 rounded-xl"
                                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium uppercase" style={{ color: tierColors[tierId] }}>{tierId}</span>
                                                    <button
                                                        onClick={() => setEditingTier(null)}
                                                        className="text-sm px-3 py-1 rounded"
                                                        style={{ color: theme.textMuted }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm mb-1" style={{ color: theme.textMuted }}>Display Name</label>
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="w-full p-2 rounded-lg"
                                                            style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm mb-1" style={{ color: theme.textMuted }}>Price (INR)</label>
                                                        <input
                                                            type="number"
                                                            value={editPrice}
                                                            onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                                                            min="0"
                                                            className="w-full p-2 rounded-lg"
                                                            style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleTierConfigUpdate}
                                                    disabled={tierActionLoading}
                                                    className="w-full py-2 rounded-lg font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
                                                    style={{ backgroundColor: theme.success, color: theme.text }}
                                                >
                                                    {tierActionLoading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <p className="text-xs" style={{ color: theme.textMuted }}>
                                                    Changes save to Supabase and will reflect in ticket pricing.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h3 className="text-lg font-bold" style={{ color: tierColors[tierId] }}>
                                                            {config.name}
                                                        </h3>
                                                        <p className="text-sm" style={{ color: theme.textMuted }}>
                                                            {formatCurrency(config.price)} per ticket
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="text-2xl font-bold" style={{ color: theme.success }}>
                                                                {tierStats?.available || 0}
                                                            </div>
                                                            <div className="text-sm" style={{ color: theme.textMuted }}>available</div>
                                                        </div>
                                                        <button
                                                            onClick={() => startEditingTier(tierId)}
                                                            className="px-3 py-1 rounded text-sm"
                                                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.textMuted }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="h-3 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                                    <div className="h-full flex">
                                                        <div style={{ width: `${soldPercent}%`, backgroundColor: theme.success }} />
                                                        <div style={{ width: `${pendingPercent}%`, backgroundColor: theme.warning }} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between text-sm">
                                                    <span style={{ color: theme.success }}>Sold: {tierStats?.sold || 0}</span>
                                                    <span style={{ color: theme.warning }}>Pending: {tierStats?.pending || 0}</span>
                                                    <span style={{ color: theme.textMuted }}>{formatCurrency(tierStats?.revenue || 0)}</span>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Inventory Management - Separate Panel */}
                    <div>
                        <h2 className="text-xl font-bold mb-4" style={{ color: theme.text }}>Inventory Management</h2>

                        {!showInventoryPanel ? (
                            <div className="p-5 rounded-xl" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
                                <p className="mb-4" style={{ color: theme.textMuted }}>
                                    Modify ticket inventory for each tier. These changes affect the real-time availability in Redis.
                                </p>
                                <button
                                    onClick={() => setShowInventoryPanel(true)}
                                    className="w-full py-3 rounded-lg font-medium transition-all"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.text, border: `1px solid ${theme.border}` }}
                                >
                                    Open Inventory Controls
                                </button>
                            </div>
                        ) : (
                            <div className="p-5 rounded-xl" style={{ backgroundColor: theme.surface, border: `2px solid ${theme.warning}` }}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-bold uppercase" style={{ color: theme.warning }}>Inventory Controls</span>
                                    <button
                                        onClick={() => { setShowInventoryPanel(false); setConfirmInventoryAction(false); setInventoryMessage(null); }}
                                        className="text-sm px-3 py-1 rounded"
                                        style={{ color: theme.textMuted }}
                                    >
                                        Close
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textMuted }}>Action</label>
                                        <select
                                            value={inventoryAction}
                                            onChange={(e) => { setInventoryAction(e.target.value as typeof inventoryAction); setConfirmInventoryAction(false); }}
                                            className="w-full p-3 rounded-lg"
                                            style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                                        >
                                            <option value="add">Add Tickets</option>
                                            <option value="remove">Remove Tickets</option>
                                            <option value="initialize">Initialize (Set Exact Count)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textMuted }}>Tier</label>
                                        <select
                                            value={inventoryTier}
                                            onChange={(e) => { setInventoryTier(e.target.value); setConfirmInventoryAction(false); }}
                                            className="w-full p-3 rounded-lg"
                                            style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                                        >
                                            {Object.keys(tierColors).map((id) => (
                                                <option key={id} value={id}>{tierConfig[id]?.name || id}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: theme.textMuted }}>Quantity</label>
                                        <input
                                            type="number"
                                            value={inventoryQuantity}
                                            onChange={(e) => { setInventoryQuantity(parseInt(e.target.value) || 0); setConfirmInventoryAction(false); }}
                                            min="0"
                                            className="w-full p-3 rounded-lg"
                                            style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                                        />
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {[10, 50, 100, 500].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => { setInventoryQuantity(num); setConfirmInventoryAction(false); }}
                                                    className="px-3 py-1 rounded text-sm transition-all hover:scale-105"
                                                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.textMuted }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Warning box */}
                                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', border: `1px solid ${theme.warning}` }}>
                                        <p className="text-sm" style={{ color: theme.warning }}>
                                            <strong>Warning:</strong> This will {inventoryAction === 'initialize' ? 'reset' : inventoryAction} {inventoryQuantity} tickets for {tierConfig[inventoryTier]?.name || inventoryTier} tier.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleInventoryAction}
                                        disabled={inventoryLoading}
                                        className="w-full py-3 rounded-lg font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                                        style={{
                                            backgroundColor: confirmInventoryAction ? theme.danger : (inventoryAction === 'remove' ? theme.warning : theme.success),
                                            color: theme.text,
                                        }}
                                    >
                                        {inventoryLoading ? 'Processing...' : confirmInventoryAction ? 'Click Again to Confirm' : `${inventoryAction.charAt(0).toUpperCase() + inventoryAction.slice(1)} Tickets`}
                                    </button>

                                    {inventoryMessage && (
                                        <div
                                            className="p-3 rounded-lg text-sm"
                                            style={{
                                                backgroundColor: inventoryMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(233, 69, 96, 0.2)',
                                                color: inventoryMessage.type === 'success' ? theme.success : theme.primary,
                                            }}
                                        >
                                            {inventoryMessage.text}
                                        </div>
                                    )}

                                    <p className="text-xs" style={{ color: theme.textMuted }}>
                                        Redis: Real-time inventory | Supabase: Order records & tier config
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Orders */}
                <div>
                    <h2 className="text-xl font-bold mb-4" style={{ color: theme.text }}>Recent Orders</h2>
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                        <th className="text-left p-4" style={{ color: theme.textMuted }}>Time</th>
                                        <th className="text-left p-4" style={{ color: theme.textMuted }}>Buyer</th>
                                        <th className="text-left p-4" style={{ color: theme.textMuted }}>Tier</th>
                                        <th className="text-center p-4" style={{ color: theme.textMuted }}>Qty</th>
                                        <th className="text-center p-4" style={{ color: theme.textMuted }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                                        stats.recentOrders.map((order, index) => (
                                            <tr key={index} style={{ borderTop: `1px solid ${theme.border}` }}>
                                                <td className="p-4 text-sm" style={{ color: theme.textMuted }}>
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="p-4">
                                                    <div style={{ color: theme.text }}>{order.name || '-'}</div>
                                                    <div className="text-sm" style={{ color: theme.textMuted }}>{order.email || '-'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className="px-2 py-1 rounded text-sm font-medium"
                                                        style={{ backgroundColor: tierColors[order.tier] + '30', color: tierColors[order.tier] }}
                                                    >
                                                        {tierConfig[order.tier]?.name || order.tier}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-bold" style={{ color: theme.text }}>
                                                    {order.quantity}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span
                                                        className="px-3 py-1 rounded-full text-xs font-semibold uppercase"
                                                        style={{ backgroundColor: getStatusColor(order.status) + '30', color: getStatusColor(order.status) }}
                                                    >
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center" style={{ color: theme.textMuted }}>
                                                No orders yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
