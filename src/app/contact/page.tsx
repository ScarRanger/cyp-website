"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaInstagram, FaYoutube, FaWhatsapp } from "react-icons/fa";

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

export default function ContactPage() {
    const [email, setEmail] = React.useState("Click to reveal");

    // Obfuscated email parts
    const user = "admin";
    const domain = "cypvasai.org";

    const handleEmailClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const fullEmail = `${user}@${domain}`;
        window.location.href = `mailto:${fullEmail}`;
        setEmail(fullEmail);
    };

    const contactInfo = [
        {
            icon: <FaPhone className="text-2xl" />,
            title: "Phone",
            value: "+91 9923341074",
            link: "tel:+919923341074",
            color: theme.primary,
            onClick: undefined
        },
        {
            icon: <FaEnvelope className="text-2xl" />,
            title: "Email",
            value: email,
            link: "#",
            color: theme.accent,
            onClick: handleEmailClick
        },
        {
            icon: <FaMapMarkerAlt className="text-2xl" />,
            title: "Location",
            value: "Vasai, Maharashtra, India",
            link: undefined,
            color: theme.secondary,
            onClick: undefined
        }
    ];

    return (
        <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 px-4">
                {/* Background Effects */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        background: `radial-gradient(ellipse at 50% 0%, ${theme.primary}40 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 80%, ${theme.secondary}30 0%, transparent 50%)`,
                    }}
                />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1
                            className="text-4xl md:text-6xl font-bold mb-6"
                            style={{ color: theme.text }}
                        >
                            Get in Touch
                        </h1>
                        <p
                            className="text-xl md:text-2xl max-w-2xl mx-auto"
                            style={{ color: theme.textMuted }}
                        >
                            Have questions or want to join us? We'd love to hear from you.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Contact Cards */}
            <section className="py-12 px-4 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {contactInfo.map((info, index) => (
                        <motion.a
                            key={index}
                            href={info.link}
                            onClick={info.onClick}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            className={`p-8 rounded-2xl flex flex-col items-center text-center group ${!info.link && !info.onClick ? 'cursor-default' : 'cursor-pointer'}`}
                            style={{
                                backgroundColor: theme.surface,
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300"
                                style={{ backgroundColor: `${info.color}20`, color: info.color }}
                            >
                                {info.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>
                                {info.title}
                            </h3>
                            <p style={{ color: theme.textMuted }}>
                                {info.value === "Click to reveal" ? <span className="underline decoration-dotted">Click to reveal</span> : info.value}
                            </p>
                        </motion.a>
                    ))}
                </div>
            </section>

            {/* Map / Additional Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="p-8 rounded-3xl"
                        style={{
                            background: `linear-gradient(135deg, rgba(233, 69, 96, 0.1) 0%, rgba(83, 52, 131, 0.1) 100%)`,
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <h2 className="text-3xl font-bold mb-6" style={{ color: theme.text }}>Connect Socially</h2>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a href="https://www.instagram.com/cyp.vasai/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 group" style={{ backgroundColor: `${theme.surface}`, border: `1px solid ${theme.border}` }} aria-label="CYP Vasai Instagram">
                                <FaInstagram className="text-3xl text-pink-500" />
                                <span className="text-sm font-medium" style={{ color: theme.text }}>@cyp.vasai</span>
                            </a>
                            <a href="https://www.instagram.com/cyp.youngprofessionals/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 group" style={{ backgroundColor: `${theme.surface}`, border: `1px solid ${theme.border}` }} aria-label="Young Professionals Instagram">
                                <FaInstagram className="text-3xl text-pink-500" />
                                <span className="text-sm font-medium" style={{ color: theme.text }}>@cyp.yp</span>
                            </a>
                            <a href="https://www.youtube.com/@cyp-vasai" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 group" style={{ backgroundColor: `${theme.surface}`, border: `1px solid ${theme.border}` }} aria-label="CYP Vasai YouTube">
                                <FaYoutube className="text-3xl text-red-600" />
                                <span className="text-sm font-medium" style={{ color: theme.text }}>@cyp-vasai</span>
                            </a>
                            <a href="https://wa.me/919923341074" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105 group" style={{ backgroundColor: `${theme.surface}`, border: `1px solid ${theme.border}` }} aria-label="WhatsApp">
                                <FaWhatsapp className="text-3xl text-green-500" />
                                <span className="text-sm font-medium" style={{ color: theme.text }}>WhatsApp</span>
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
