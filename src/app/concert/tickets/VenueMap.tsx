"use client";

import React from "react";
import { motion } from "framer-motion";
import type { TierAvailability } from "@/app/types/concert";

interface VenueMapProps {
    tiers: TierAvailability[];
    selectedTiers: { tier: string; quantity: number }[];
    onTierClick: (tier: TierAvailability) => void;
}

const theme = {
    background: '#1C1917',
    surface: '#1C1917',
    primary: '#FB923C',
    secondary: '#FB923C',
    accent: '#FB923C',
    text: '#FAFAFA',
    textMuted: '#a8a29e',
    border: '#FB923C30',
};

// Tier colors matching the premium feel
const tierColors: Record<string, { fill: string; hover: string; glow: string }> = {
    diamond: {
        fill: 'url(#diamondGradient)',
        hover: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.5)',
    },
    gold: {
        fill: 'url(#goldGradient)',
        hover: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.5)',
    },
    silver: {
        fill: 'url(#silverGradient)',
        hover: '#9ca3af',
        glow: 'rgba(156, 163, 175, 0.5)',
    },
};

export default function VenueMap({ tiers, selectedTiers, onTierClick }: VenueMapProps) {
    const getTierByName = (name: string) => tiers.find(t => t.tier.toLowerCase() === name.toLowerCase());
    const isSelected = (tierName: string) => selectedTiers.some(s => s.tier.toLowerCase() === tierName.toLowerCase());
    const isSoldOut = (tier: TierAvailability | undefined) => !tier || tier.available === 0;

    const renderTierSection = (
        tierName: string,
        pathD: string,
        labelY: number,
        delay: number
    ) => {
        const tier = getTierByName(tierName);
        const selected = isSelected(tierName);
        const soldOut = isSoldOut(tier);
        const colors = tierColors[tierName.toLowerCase()] || tierColors.silver;

        return (
            <motion.g
                key={tierName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.5 }}
                style={{ cursor: soldOut ? 'not-allowed' : 'pointer' }}
                onClick={() => tier && !soldOut && onTierClick(tier)}
            >
                {/* Glow effect for selected */}
                {selected && (
                    <path
                        d={pathD}
                        fill="none"
                        stroke={colors.glow}
                        strokeWidth="8"
                        filter="url(#glow)"
                    />
                )}

                {/* Main section */}
                <path
                    d={pathD}
                    fill={soldOut ? '#333' : colors.fill}
                    stroke={selected ? theme.primary : 'rgba(255,255,255,0.2)'}
                    strokeWidth={selected ? 3 : 1}
                    opacity={soldOut ? 0.4 : 1}
                    className="transition-all duration-300"
                    style={{
                        filter: selected ? 'brightness(1.2)' : 'none',
                    }}
                />

                {/* Section label */}
                <text
                    x="400"
                    y={labelY}
                    textAnchor="middle"
                    fill={soldOut ? '#666' : theme.text}
                    fontSize="18"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                >
                    {tierName.toUpperCase()}
                </text>

                {/* Price & availability */}
                <text
                    x="400"
                    y={labelY + 22}
                    textAnchor="middle"
                    fill={soldOut ? '#555' : theme.textMuted}
                    fontSize="12"
                    style={{ pointerEvents: 'none' }}
                >
                    {soldOut ? 'SOLD OUT' : tier ? `₹${tier.price.toLocaleString()} • ${tier.available} left` : ''}
                </text>

                {/* Selected indicator */}
                {selected && tier && (
                    <text
                        x="400"
                        y={labelY + 42}
                        textAnchor="middle"
                        fill={theme.primary}
                        fontSize="11"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                    >
                        ✓ SELECTED
                    </text>
                )}
            </motion.g>
        );
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-8">
            <h2 className="text-center text-lg font-semibold mb-4" style={{ color: theme.text }}>
                🗺️ Venue Layout
            </h2>
            <p className="text-center text-sm mb-4" style={{ color: theme.textMuted }}>
                Click a section to select tickets
            </p>

            <svg
                viewBox="0 0 800 520"
                className="w-full h-auto"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
            >
                {/* Definitions */}
                <defs>
                    {/* Gradients for each tier */}
                    <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9333ea" />
                        <stop offset="50%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>

                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>

                    <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6b7280" />
                        <stop offset="50%" stopColor="#4b5563" />
                        <stop offset="100%" stopColor="#374151" />
                    </linearGradient>

                    <linearGradient id="stageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e94560" />
                        <stop offset="100%" stopColor="#533483" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Pattern for ground texture */}
                    <pattern id="groundPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                        <circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.03)" />
                    </pattern>
                </defs>

                {/* Background */}
                <rect x="0" y="0" width="800" height="520" fill={theme.background} rx="16" />
                <rect x="0" y="0" width="800" height="520" fill="url(#groundPattern)" rx="16" />

                {/* Venue border */}
                <rect
                    x="50"
                    y="30"
                    width="700"
                    height="460"
                    fill="none"
                    stroke={theme.border}
                    strokeWidth="2"
                    strokeDasharray="8 4"
                    rx="12"
                />

                {/* Stage */}
                <motion.g
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <rect
                        x="150"
                        y="50"
                        width="500"
                        height="70"
                        rx="8"
                        fill="url(#stageGradient)"
                    />
                    <text
                        x="400"
                        y="92"
                        textAnchor="middle"
                        fill={theme.text}
                        fontSize="24"
                        fontWeight="bold"
                    >
                        🎤 STAGE
                    </text>

                    {/* Stage lights */}
                    {[180, 280, 380, 480, 580].map((x, i) => (
                        <motion.circle
                            key={i}
                            cx={x}
                            cy="55"
                            r="4"
                            fill={theme.accent}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </motion.g>

                {/* Diamond Section (closest to stage) */}
                {renderTierSection(
                    'diamond',
                    'M 120 140 Q 400 130 680 140 L 700 240 Q 400 250 100 240 Z',
                    190,
                    0.2
                )}

                {/* Gold Section (middle) */}
                {renderTierSection(
                    'gold',
                    'M 100 260 Q 400 250 700 260 L 720 370 Q 400 385 80 370 Z',
                    315,
                    0.4
                )}

                {/* Silver Section (back) */}
                {renderTierSection(
                    'silver',
                    'M 80 390 Q 400 375 720 390 L 730 460 Q 400 480 70 460 Z',
                    430,
                    0.6
                )}

                {/* Entry/Exit markers */}
                <g>
                    <text x="60" y="500" fill={theme.textMuted} fontSize="10" transform="rotate(-90, 60, 500)">
                        ENTRY →
                    </text>
                    <text x="740" y="420" fill={theme.textMuted} fontSize="10" transform="rotate(90, 740, 420)">
                        ← EXIT
                    </text>
                </g>

                {/* Legend */}
                <g transform="translate(50, 495)">
                    <text fill={theme.textMuted} fontSize="10">
                        💎 Diamond (VIP) | 🥇 Gold (Premium) | 🥈 Silver (Standard)
                    </text>
                </g>
            </svg>

            {/* Mobile hint */}
            <p className="text-center text-xs mt-3" style={{ color: theme.textMuted }}>
                Tap on a zone to select, then choose quantity below
            </p>
        </div>
    );
}
