"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

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
};

// Concert details - update these as needed
const CONCERT_DETAILS = {
    title: "CYP CONCERT 2026",
    tagline: "An Evening of Praise & Worship",
    date: "Saturday, 21st March 2026",
    time: "6:00 PM Onwards",
    venue: "GG College",
    venueAddress: "GG College, Vasai, Maharashtra",
    description: `Join us for an unforgettable evening of worship, music, and community! 
  Experience powerful performances, soul-stirring worship sessions, and connect with 
  fellow believers in an atmosphere of praise and celebration.`,
    highlights: [
        { icon: "🎤", title: "Live Performances", desc: "Amazing artists and worship bands" },
        { icon: "🙏", title: "Worship Experience", desc: "Uplifting praise and worship sessions" },
        { icon: "🎶", title: "Original Music", desc: "Exclusive songs and covers" },
        { icon: "👥", title: "Community", desc: "Connect with fellow youth" },
    ],
    lineup: [
        "Worship Band",
        "Solo Artists",
        "Special Guests",
        "Youth Choir",
    ],
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3760.8376893!2d72.81873!3d19.4163!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7a98d5ba94bdf%3A0x5d7d3a2f1b0e4c8a!2sGG%20College!5e0!3m2!1sen!2sin!4v1234567890",
    googleMapsLink: "https://maps.google.com/?q=GG+College+Vasai",
};

export default function ConcertPage() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Animated background gradient */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(ellipse at 50% 0%, ${theme.primary}40 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 80%, ${theme.secondary}30 0%, transparent 50%)`,
                    }}
                />

                {/* Floating particles effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full"
                            style={{
                                backgroundColor: i % 2 === 0 ? theme.primary : theme.accent,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -30, 0],
                                opacity: [0.3, 0.8, 0.3],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Event Badge */}
                        <div
                            className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{
                                background: theme.gradient,
                                color: theme.text,
                            }}
                        >
                            🎵 LIVE CONCERT EVENT
                        </div>

                        {/* Main Title */}
                        <h1
                            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4"
                            style={{
                                color: theme.text,
                                textShadow: `0 0 40px ${theme.primary}60`,
                            }}
                        >
                            {CONCERT_DETAILS.title}
                        </h1>

                        {/* Tagline */}
                        <p
                            className="text-xl md:text-2xl mb-8"
                            style={{ color: theme.textMuted }}
                        >
                            {CONCERT_DETAILS.tagline}
                        </p>

                        {/* Date & Time Cards */}
                        <div className="flex flex-wrap justify-center gap-4 mb-10">
                            <div
                                className="px-6 py-3 rounded-xl backdrop-blur-sm"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${theme.border}`,
                                }}
                            >
                                <div className="text-2xl mb-1">📅</div>
                                <div className="font-bold" style={{ color: theme.text }}>{CONCERT_DETAILS.date}</div>
                            </div>
                            <div
                                className="px-6 py-3 rounded-xl backdrop-blur-sm"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${theme.border}`,
                                }}
                            >
                                <div className="text-2xl mb-1">⏰</div>
                                <div className="font-bold" style={{ color: theme.text }}>{CONCERT_DETAILS.time}</div>
                            </div>
                            <div
                                className="px-6 py-3 rounded-xl backdrop-blur-sm"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${theme.border}`,
                                }}
                            >
                                <div className="text-2xl mb-1">📍</div>
                                <div className="font-bold" style={{ color: theme.text }}>{CONCERT_DETAILS.venue}</div>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <Link href="/concert/tickets">
                            <motion.button
                                className="px-10 py-4 rounded-full text-lg font-bold cursor-pointer"
                                style={{
                                    background: theme.gradient,
                                    color: theme.text,
                                    boxShadow: `0 10px 40px ${theme.primary}50`,
                                }}
                                whileHover={{
                                    scale: 1.05,
                                    boxShadow: `0 15px 50px ${theme.primary}70`,
                                }}
                                whileTap={{ scale: 0.98 }}
                            >
                                🎟️ Get Your Tickets Now
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* About Section */}
            <section className="py-16 md:py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2
                            className="text-3xl md:text-4xl font-bold mb-6"
                            style={{ color: theme.text }}
                        >
                            About The Event
                        </h2>
                        <p
                            className="text-lg leading-relaxed whitespace-pre-line"
                            style={{ color: theme.textMuted }}
                        >
                            {CONCERT_DETAILS.description}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Highlights Section */}
            <section className="py-16 md:py-20 px-4" style={{ backgroundColor: theme.surface }}>
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        className="text-3xl md:text-4xl font-bold text-center mb-12"
                        style={{ color: theme.text }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        What to Expect
                    </motion.h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {CONCERT_DETAILS.highlights.map((item, index) => (
                            <motion.div
                                key={index}
                                className="p-6 rounded-2xl text-center"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${theme.border}`,
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                whileHover={{
                                    scale: 1.02,
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                }}
                            >
                                <div className="text-4xl mb-4">{item.icon}</div>
                                <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>
                                    {item.title}
                                </h3>
                                <p style={{ color: theme.textMuted }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Lineup Section */}
            <section className="py-16 md:py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <h2
                            className="text-3xl md:text-4xl font-bold mb-8"
                            style={{ color: theme.text }}
                        >
                            The Lineup
                        </h2>
                        <div className="flex flex-wrap justify-center gap-4">
                            {CONCERT_DETAILS.lineup.map((artist, index) => (
                                <motion.div
                                    key={index}
                                    className="px-6 py-3 rounded-full"
                                    style={{
                                        background: theme.gradient,
                                        color: theme.text,
                                    }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    {artist}
                                </motion.div>
                            ))}
                        </div>
                        <p className="mt-6 text-sm" style={{ color: theme.textMuted }}>
                            More artists to be announced soon!
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* How to Reach Section */}
            <section className="py-16 md:py-20 px-4" style={{ backgroundColor: theme.surface }}>
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        className="text-3xl md:text-4xl font-bold text-center mb-12"
                        style={{ color: theme.text }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        📍 How to Reach the Venue
                    </motion.h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Venue Details */}
                        <motion.div
                            className="p-6 rounded-2xl"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${theme.border}`,
                            }}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h3 className="text-2xl font-bold mb-4" style={{ color: theme.primary }}>
                                {CONCERT_DETAILS.venue}
                            </h3>
                            <p className="mb-6" style={{ color: theme.textMuted }}>
                                {CONCERT_DETAILS.venueAddress}
                            </p>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <h4 className="font-bold mb-2" style={{ color: theme.accent }}>🚆 By Train</h4>
                                    <p style={{ color: theme.textMuted }}>
                                        Take a train to Vasai Road railway station. From there, take an auto-rickshaw or taxi to Giriz (approximately 15 minutes).
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <h4 className="font-bold mb-2" style={{ color: theme.accent }}>🚗 By Car</h4>
                                    <p style={{ color: theme.textMuted }}>
                                        From Mumbai, take NH48 towards Vasai. Follow signs to Vasai West and navigate to Giriz Road. Parking available at venue.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <h4 className="font-bold mb-2" style={{ color: theme.accent }}>🚌 By Bus</h4>
                                    <p style={{ color: theme.textMuted }}>
                                        Take a ST bus to Vasai Bus Depot. Local buses and sharing autos are available to Giriz from the depot.
                                    </p>
                                </div>
                            </div>

                            <a
                                href={CONCERT_DETAILS.googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                                style={{
                                    backgroundColor: theme.primary,
                                    color: theme.text,
                                }}
                            >
                                🗺️ Open in Google Maps
                            </a>
                        </motion.div>

                        {/* Map Embed */}
                        <motion.div
                            className="rounded-2xl overflow-hidden h-[400px] md:h-auto"
                            style={{ border: `1px solid ${theme.border}` }}
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <iframe
                                src={CONCERT_DETAILS.mapUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 0, minHeight: '400px' }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 md:py-24 px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2
                        className="text-3xl md:text-4xl font-bold mb-4"
                        style={{ color: theme.text }}
                    >
                        Don&apos;t Miss Out!
                    </h2>
                    <p
                        className="text-lg mb-8 max-w-xl mx-auto"
                        style={{ color: theme.textMuted }}
                    >
                        Limited tickets available. Secure your spot for an unforgettable evening of worship and music.
                    </p>
                    <Link href="/concert/tickets">
                        <motion.button
                            className="px-12 py-5 rounded-full text-xl font-bold cursor-pointer"
                            style={{
                                background: theme.gradient,
                                color: theme.text,
                                boxShadow: `0 10px 40px ${theme.primary}50`,
                            }}
                            whileHover={{
                                scale: 1.05,
                                boxShadow: `0 15px 50px ${theme.primary}70`,
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            🎟️ Book Tickets Now
                        </motion.button>
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer
                className="py-8 px-4 text-center"
                style={{
                    backgroundColor: theme.surface,
                    borderTop: `1px solid ${theme.border}`,
                }}
            >
                <p style={{ color: theme.textMuted }}>
                    For queries, contact: <span style={{ color: theme.primary }}>+91 9923341074</span>
                </p>
                <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
                    Organized by Christian Youth in Power (CYP) Vasai
                </p>
            </footer>
        </div>
    );
}
