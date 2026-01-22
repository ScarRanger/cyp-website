"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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

interface GalleryPhoto {
    src: string;
    caption: string;
}

const HISTORY_CONTENT = {
    title: "Our History",
    subtitle: "The Journey of Christian Youth in Power",

    // Timeline of key milestones (brief highlights)
    timeline: [
        {
            year: "Late 1980s",
            title: "The Foundation",
            description: "Christ the Deliverer Prayer Group founded by Br. Romeo Fernando.",
            image: null,
        },
        {
            year: "Late 1980s",
            title: "Youth Gathering Begins",
            description: "Monday youth gatherings launched, attracting 200–300 young people weekly.",
            image: null,
        },
        {
            year: "1990s",
            title: "A Movement is Born",
            description: "The movement spreads across Mumbai, fueling the growth of Torchbearers for Christ.",
            image: null,
        },
        {
            year: "2005",
            title: "Christian Youth in Power",
            description: "Renamed under the leadership of Br. Sanjay Ferreira (now Fr. Sanjay Ferreira).",
            image: null,
        },
        {
            year: "Present",
            title: "Continuing the Mission",
            description: "CYP continues to evangelize and transform lives across Vasai and Mumbai.",
            image: null,
        },
    ],

    // Full story paragraphs
    story: [
        "In the late 1980s, amid the growing momentum of the Catholic Charismatic Renewal, a powerful move of the Holy Spirit was unfolding in different parts of the world. Inspired by this renewal—much like the early campus movements that later became Christ's Youth in Action, or the Jesus Youth Movement in South India that spread across the globe—young people were responding to a call to commit their lives to God and boldly witness their faith among their peers.",

        "Within this larger movement of grace, the Christ the Deliverer Prayer Group was founded by Br. Romeo Fernando in the late 1980s. The Thursday prayer meetings quickly became a powerful centre of evangelization, drawing thousands of people from across the Vasai Diocese and beyond. A significant number of young people were deeply attracted to this outreach and were seen serving zealously in missions, ministries, and evangelistic activities.",

        "Recognizing the unique hunger, potential, and calling of the youth, Br. Romeo Fernando, together with his leadership team, sensed a clear inspiration from the Lord to begin a dedicated youth outreach. This led to the birth of a Monday youth gathering, initially known as the Christ the Deliverer Youth Group. Week after week, nearly 200–300 young people gathered to worship the Lord, encounter His love, and grow in faith and discipleship.",

        "What began as a local youth gathering soon developed into a movement. Its influence spread rapidly across Mumbai and beyond, becoming a major force in revitalizing youth evangelization. The movement played a decisive role in the expansion of the Bombay Charismatic Renewal youth outreach, Torchbearers for Christ, which grew remarkably from about 60 youth to nearly 1,000 active participants.",

        "In 2005, under the leadership of the then Youth Director Br. Sanjay Ferreira (now Fr. Sanjay Ferreira), the movement was given its present name: Christian Youth in Power.",

        "Since then, Christian Youth in Power has continued to play an instrumental role in evangelizing and transforming the lives of young people across Vasai and Mumbai. Rooted in worship, empowered by the Holy Spirit, and committed to proclaiming Christ, CYP remains a living testimony to how God uses young hearts to ignite renewal in the Church.",
    ],
};

export default function HistoryPage() {
    const [gallery, setGallery] = useState<GalleryPhoto[]>([]);

    useEffect(() => {
        async function fetchGallery() {
            try {
                const res = await fetch("/api/history/gallery");
                if (res.ok) {
                    const data = await res.json();
                    setGallery(data.gallery || []);
                }
            } catch (error) {
                console.error("Failed to fetch gallery:", error);
            }
        }
        fetchGallery();
    }, []);

    return (
        <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 md:py-32">
                {/* Background Effects */}
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: `radial-gradient(ellipse at 50% 0%, ${theme.primary}40 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 80%, ${theme.secondary}30 0%, transparent 50%)`,
                    }}
                />

                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full"
                            style={{
                                backgroundColor: i % 2 === 0 ? theme.primary : theme.accent,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -20, 0],
                                opacity: [0.2, 0.6, 0.2],
                            }}
                            transition={{
                                duration: 4 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Badge */}
                        <div
                            className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{
                                background: theme.gradient,
                                color: theme.text,
                            }}
                        >
                            📜 OUR JOURNEY
                        </div>

                        {/* Title */}
                        <h1
                            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4"
                            style={{
                                color: theme.text,
                                textShadow: `0 0 40px ${theme.primary}60`,
                            }}
                        >
                            {HISTORY_CONTENT.title}
                        </h1>

                        {/* Subtitle */}
                        <p
                            className="text-xl md:text-2xl"
                            style={{ color: theme.textMuted }}
                        >
                            {HISTORY_CONTENT.subtitle}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-16 md:py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                    >
                        {HISTORY_CONTENT.story.map((paragraph, index) => (
                            <motion.p
                                key={index}
                                className="text-lg leading-relaxed"
                                style={{ color: theme.textMuted }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                            >
                                {paragraph}
                            </motion.p>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="py-16 md:py-20 px-4" style={{ backgroundColor: theme.surface }}>
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        className="text-3xl md:text-4xl font-bold text-center mb-12"
                        style={{ color: theme.text }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        Our Timeline
                    </motion.h2>

                    <div className="relative">
                        {/* Timeline Line */}
                        <div
                            className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 transform md:-translate-x-1/2"
                            style={{ backgroundColor: theme.border }}
                        />

                        {/* Timeline Items */}
                        <div className="space-y-12">
                            {HISTORY_CONTENT.timeline.map((item, index) => (
                                <motion.div
                                    key={index}
                                    className={`relative flex flex-col md:flex-row gap-6 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''
                                        }`}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    {/* Timeline Dot */}
                                    <div
                                        className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full transform -translate-x-1/2 mt-6 z-10"
                                        style={{
                                            background: theme.gradient,
                                            boxShadow: `0 0 20px ${theme.primary}60`,
                                        }}
                                    />

                                    {/* Content Card */}
                                    <div
                                        className={`flex-1 ml-12 md:ml-0 ${index % 2 === 0 ? 'md:mr-12' : 'md:ml-12'
                                            }`}
                                    >
                                        <div
                                            className="p-6 rounded-2xl"
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${theme.border}`,
                                            }}
                                        >
                                            <div
                                                className="inline-block px-3 py-1 rounded-full text-sm font-bold mb-3"
                                                style={{
                                                    backgroundColor: `${theme.primary}20`,
                                                    color: theme.primary,
                                                }}
                                            >
                                                {item.year}
                                            </div>
                                            <h3
                                                className="text-xl font-bold mb-2"
                                                style={{ color: theme.text }}
                                            >
                                                {item.title}
                                            </h3>
                                            <p style={{ color: theme.textMuted }}>{item.description}</p>

                                            {item.image && (
                                                <div className="mt-4 rounded-xl overflow-hidden">
                                                    <Image
                                                        src={item.image}
                                                        alt={item.title}
                                                        width={400}
                                                        height={250}
                                                        className="object-cover w-full"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Spacer for alternating layout */}
                                    <div className="hidden md:block flex-1" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Photo Gallery Section */}
            {gallery.length > 0 && (
                <section className="py-16 md:py-20 px-4">
                    <div className="max-w-6xl mx-auto">
                        <motion.h2
                            className="text-3xl md:text-4xl font-bold text-center mb-12"
                            style={{ color: theme.text }}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                        >
                            Memories Through The Years
                        </motion.h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {gallery.map((photo: GalleryPhoto, index: number) => (
                                <motion.div
                                    key={index}
                                    className="relative group rounded-2xl overflow-hidden aspect-[4/3]"
                                    style={{ border: `1px solid ${theme.border}` }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <Image
                                        src={photo.src}
                                        alt={photo.caption}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Quote / Vision Section */}
            <section className="py-16 md:py-24 px-4" style={{ backgroundColor: theme.surface }}>
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-6xl mb-6">🙏</div>
                        <blockquote
                            className="text-2xl md:text-3xl font-bold italic mb-6"
                            style={{ color: theme.text }}
                        >
                            "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."
                        </blockquote>
                        <p style={{ color: theme.primary }}>— Jeremiah 29:11</p>
                    </motion.div>
                </div>
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
                    Christian Youth in Power (CYP) Vasai
                </p>
                <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
                    Empowering youth through faith since the beginning
                </p>
            </footer>
        </div>
    );
}
