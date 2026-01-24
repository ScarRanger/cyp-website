'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HomePage from '@/app/components/HomePage';

// --- Theme (matching HomePage) ---
const theme = {
    name: 'Warm Espresso',
    background: '#1C1917',
    surface: '#1C1917',
    primary: '#FB923C',
    secondary: '#FCD34D',
    text: '#FAFAFA',
    textBright: '#FAFAFA',
    border: '#FB923C30',
    gradient: 'linear-gradient(to right, #FB923C, #FCD34D)',
};

// --- Firework Particle ---
type Particle = {
    id: number;
    x: number;
    y: number;
    color: string;
    angle: number;
    speed: number;
    life: number;
    size: number;
};

type Firework = {
    id: number;
    x: number;
    y: number;
    particles: Particle[];
};

const colors = ['#FB923C', '#FCD34D', '#F87171', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBBF24'];

export default function LaunchPage() {
    const [phase, setPhase] = useState<'ready' | 'countdown' | 'fireworks' | 'launched'>('ready');
    const [countdown, setCountdown] = useState(3);
    const [fireworks, setFireworks] = useState<Firework[]>([]);
    const [showHomePage, setShowHomePage] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const fireworksDataRef = useRef<Firework[]>([]);

    // Pre-render HomePage hidden
    const [preloadHomePage] = useState(true);

    // Create a firework explosion
    const createFirework = useCallback((x: number, y: number) => {
        const particleCount = 80 + Math.floor(Math.random() * 40);
        const particles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                id: i,
                x: 0,
                y: 0,
                color: colors[Math.floor(Math.random() * colors.length)],
                angle: (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5,
                speed: 2 + Math.random() * 6,
                life: 1,
                size: 2 + Math.random() * 3,
            });
        }

        return {
            id: Date.now() + Math.random(),
            x,
            y,
            particles,
        };
    }, []);

    // Canvas animation for fireworks
    const animateFireworks = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        fireworksDataRef.current = fireworksDataRef.current.map(fw => ({
            ...fw,
            particles: fw.particles.map(p => ({
                ...p,
                x: p.x + Math.cos(p.angle) * p.speed,
                y: p.y + Math.sin(p.angle) * p.speed + 0.15, // gravity
                speed: p.speed * 0.98,
                life: p.life - 0.015,
            })).filter(p => p.life > 0),
        })).filter(fw => fw.particles.length > 0);

        fireworksDataRef.current.forEach(fw => {
            fw.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(fw.x + p.x, fw.y + p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
                ctx.fill();

                // Trail effect
                ctx.beginPath();
                ctx.moveTo(fw.x + p.x, fw.y + p.y);
                ctx.lineTo(
                    fw.x + p.x - Math.cos(p.angle) * p.speed * 3,
                    fw.y + p.y - Math.sin(p.angle) * p.speed * 3
                );
                ctx.strokeStyle = p.color + Math.floor(p.life * 128).toString(16).padStart(2, '0');
                ctx.lineWidth = p.size * p.life * 0.5;
                ctx.stroke();
            });
        });

        if (phase === 'fireworks' || fireworksDataRef.current.length > 0) {
            animationRef.current = requestAnimationFrame(animateFireworks);
        }
    }, [phase]);

    // Start countdown
    const handleLaunch = () => {
        setPhase('countdown');
        setCountdown(3);
    };

    // Countdown effect
    useEffect(() => {
        if (phase === 'countdown' && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (phase === 'countdown' && countdown === 0) {
            setPhase('fireworks');
        }
    }, [phase, countdown]);

    // Fireworks phase
    useEffect(() => {
        if (phase === 'fireworks') {
            // Launch multiple fireworks
            const launchFireworks = () => {
                const newFireworks: Firework[] = [];
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
                        const y = Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.1;
                        fireworksDataRef.current.push(createFirework(x, y));
                    }, i * 300);
                }
                return newFireworks;
            };

            launchFireworks();
            animationRef.current = requestAnimationFrame(animateFireworks);

            // Transition to launched after fireworks
            const transitionTimer = setTimeout(() => {
                setShowHomePage(true);
                setTimeout(() => {
                    setPhase('launched');
                }, 500);
            }, 3000);

            return () => {
                clearTimeout(transitionTimer);
                cancelAnimationFrame(animationRef.current);
            };
        }
    }, [phase, createFirework, animateFireworks]);

    // Clean up animation on unmount
    useEffect(() => {
        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <div className="relative min-h-screen" style={{ backgroundColor: theme.background }}>
            {/* Pre-rendered HomePage (hidden until launch) */}
            <div
                className={`transition-opacity duration-1000 ${showHomePage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ position: phase === 'launched' ? 'relative' : 'fixed', top: 0, left: 0, width: '100%', zIndex: phase === 'launched' ? 1 : -1 }}
            >
                {preloadHomePage && <HomePage />}
            </div>

            {/* Launch Screen Overlay */}
            <AnimatePresence>
                {phase !== 'launched' && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
                        style={{ backgroundColor: theme.background }}
                    >
                        {/* Paper Texture Overlay */}
                        <div
                            className="fixed inset-0 pointer-events-none opacity-[0.03]"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'repeat',
                            }}
                        />

                        {/* Animated Background Glow */}
                        <div className="absolute inset-0 overflow-hidden">
                            <motion.div
                                className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
                                style={{ background: `radial-gradient(circle, ${theme.primary}20, transparent)` }}
                                animate={{
                                    x: ['-20%', '120%'],
                                    y: ['20%', '80%'],
                                }}
                                transition={{
                                    duration: 10,
                                    repeat: Infinity,
                                    repeatType: 'reverse',
                                    ease: 'easeInOut',
                                }}
                            />
                            <motion.div
                                className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
                                style={{ background: `radial-gradient(circle, ${theme.secondary}15, transparent)` }}
                                animate={{
                                    x: ['120%', '-20%'],
                                    y: ['60%', '10%'],
                                }}
                                transition={{
                                    duration: 12,
                                    repeat: Infinity,
                                    repeatType: 'reverse',
                                    ease: 'easeInOut',
                                }}
                            />
                        </div>

                        {/* Canvas for Fireworks */}
                        <canvas
                            ref={canvasRef}
                            className="fixed inset-0 pointer-events-none"
                            style={{ zIndex: 100 }}
                        />

                        {/* Content */}
                        <div className="relative z-10 text-center px-6">
                            {/* Logo/Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="mb-12"
                            >
                                <span
                                    className="inline-block py-1.5 px-4 rounded-full border text-xs font-bold tracking-widest mb-6 backdrop-blur-md uppercase"
                                    style={{
                                        backgroundColor: `${theme.secondary}20`,
                                        borderColor: `${theme.secondary}80`,
                                        color: theme.secondary,
                                    }}
                                >
                                    Website Launch
                                </span>
                                <h1
                                    className="text-5xl sm:text-7xl lg:text-8xl font-bold uppercase tracking-tighter leading-[0.9]"
                                    style={{ color: theme.textBright }}
                                >
                                    Christian Youth
                                    <br />
                                    <span
                                        className="text-transparent bg-clip-text bg-gradient-to-r"
                                        style={{ backgroundImage: theme.gradient }}
                                    >
                                        In Power
                                    </span>
                                </h1>
                            </motion.div>

                            {/* Countdown Display */}
                            <AnimatePresence mode="wait">
                                {phase === 'countdown' && (
                                    <motion.div
                                        key="countdown"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.5, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mb-8"
                                    >
                                        <motion.span
                                            key={countdown}
                                            initial={{ scale: 2, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            transition={{ duration: 0.5, type: 'spring' }}
                                            className="text-9xl sm:text-[12rem] font-bold block"
                                            style={{
                                                background: theme.gradient,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                textShadow: `0 0 80px ${theme.primary}60`,
                                            }}
                                        >
                                            {countdown}
                                        </motion.span>
                                    </motion.div>
                                )}

                                {phase === 'fireworks' && (
                                    <motion.div
                                        key="launching"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.2, opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="text-center"
                                    >
                                        <motion.h2
                                            className="text-3xl sm:text-5xl font-bold mb-4 px-4"
                                            style={{
                                                background: theme.gradient,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                            }}
                                            animate={{
                                                scale: [1, 1.05, 1],
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                repeat: Infinity,
                                            }}
                                        >
                                            🎉 The website is officially launched! 🎉
                                        </motion.h2>
                                        <p className="text-xl" style={{ color: theme.text }}>
                                            Welcome to Christian Youth In Power
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Launch Button */}
                            {phase === 'ready' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                >
                                    <motion.button
                                        onClick={handleLaunch}
                                        className="relative group px-12 py-5 rounded-2xl font-bold text-xl uppercase tracking-wider overflow-hidden"
                                        style={{
                                            background: theme.gradient,
                                            color: theme.background,
                                            boxShadow: `0 0 40px ${theme.primary}40, 0 0 80px ${theme.primary}20`,
                                        }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {/* Animated Border */}
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl"
                                            style={{
                                                background: `linear-gradient(90deg, transparent, ${theme.secondary}80, transparent)`,
                                            }}
                                            animate={{
                                                x: ['-100%', '100%'],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: 'linear',
                                            }}
                                        />

                                        {/* Button Content */}
                                        <span className="relative z-10 flex items-center gap-3">
                                            <span className="text-2xl">🚀</span>
                                            Launch Website
                                            <span className="text-2xl">🚀</span>
                                        </span>

                                        {/* Pulse Ring */}
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl border-2"
                                            style={{ borderColor: theme.secondary }}
                                            animate={{
                                                scale: [1, 1.2],
                                                opacity: [0.8, 0],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: 'easeOut',
                                            }}
                                        />
                                    </motion.button>

                                    <p
                                        className="mt-6 text-sm font-medium"
                                        style={{ color: `${theme.text}80` }}
                                    >
                                        Click to reveal our brand new website
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
