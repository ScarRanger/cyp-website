"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

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
    warning: '#f59e0b',
};

// Basic auth credentials - change these or move to env vars for production
const VALID_CREDENTIALS = {
    username: 'cyp_admin',
    password: 'concert2026',
};

interface TicketInfo {
    id: string;
    tier: string;
    status: string;
    buyerName: string;
    buyerEmail?: string;
    buyerPhone?: string;
    orderId?: string;
    purchaseDate?: string;
    scannedAt?: string;
}

interface ScanResult {
    valid: boolean;
    message?: string;
    error?: string;
    alreadyScanned?: boolean;
    ticket?: TicketInfo;
}

export default function ConcertScanPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanCount, setScanCount] = useState(0);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Check for saved session
    useEffect(() => {
        const savedAuth = sessionStorage.getItem('scanner_auth');
        if (savedAuth === 'authenticated') {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');

        if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
            setIsAuthenticated(true);
            sessionStorage.setItem('scanner_auth', 'authenticated');
        } else {
            setAuthError('Invalid username or password');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('scanner_auth');
        setUsername('');
        setPassword('');
    };

    const startScanner = () => {
        setScanResult(null);
        setIsScanning(true);

        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                    rememberLastUsedCamera: true,
                },
                false
            );

            scanner.render(onScanSuccess, onScanError);
            scannerRef.current = scanner;
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const onScanSuccess = async (decodedText: string) => {
        if (isProcessing) return;
        setIsProcessing(true);

        stopScanner();

        try {
            const response = await fetch('/api/concert/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrData: decodedText }),
            });

            const data = await response.json();
            setScanResult(data);

        } catch (error) {
            console.error('Verification error:', error);
            setScanResult({
                valid: false,
                error: 'Failed to verify ticket. Check connection.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const onScanError = () => { };

    const handleConfirmScan = async () => {
        if (!scanResult?.ticket?.id) return;
        setIsProcessing(true);

        try {
            const response = await fetch('/api/concert/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: scanResult.ticket.id }),
            });

            const data = await response.json();

            if (data.success) {
                setScanCount(prev => prev + 1);
                setScanResult({
                    valid: true,
                    message: '✓ Entry Confirmed!',
                    ticket: scanResult.ticket,
                });

                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }

                setTimeout(() => {
                    setScanResult(null);
                }, 3000);
            } else {
                setScanResult({
                    valid: false,
                    error: data.error || 'Failed to confirm entry',
                    alreadyScanned: data.alreadyScanned,
                    ticket: scanResult.ticket,
                });
            }

        } catch (error) {
            console.error('Scan confirmation error:', error);
            setScanResult({
                valid: false,
                error: 'Network error. Please try again.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setIsProcessing(false);
    };

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4"
                style={{ backgroundColor: theme.background }}
            >
                <div
                    className="w-full max-w-sm p-6 rounded-2xl"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                >
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-2">🔐</div>
                        <h1 className="text-xl font-bold" style={{ color: theme.text }}>
                            Scanner Login
                        </h1>
                        <p className="text-sm" style={{ color: theme.textMuted }}>
                            Staff access only
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm mb-1" style={{ color: theme.textMuted }}>
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderColor: theme.border,
                                    color: theme.text,
                                }}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm mb-1" style={{ color: theme.textMuted }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border outline-none"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderColor: theme.border,
                                    color: theme.text,
                                }}
                                required
                            />
                        </div>

                        {authError && (
                            <p
                                className="text-center p-2 rounded-lg text-sm"
                                style={{ backgroundColor: theme.error + '20', color: theme.error }}
                            >
                                {authError}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl font-bold"
                            style={{ background: theme.gradient, color: theme.text }}
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Scanner Interface (after login)
    return (
        <div
            className="min-h-screen p-4"
            style={{ backgroundColor: theme.background }}
        >
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-6 pt-4">
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={handleLogout}
                            className="text-sm px-3 py-1 rounded-lg"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.textMuted }}
                        >
                            Logout
                        </button>
                    </div>
                    <h1
                        className="text-2xl font-bold mb-1"
                        style={{ color: theme.text }}
                    >
                        🎫 Ticket Scanner
                    </h1>
                    <p style={{ color: theme.textMuted }}>
                        CYP Concert 2026
                    </p>
                    {scanCount > 0 && (
                        <div
                            className="mt-2 inline-block px-3 py-1 rounded-full text-sm"
                            style={{ backgroundColor: theme.success + '20', color: theme.success }}
                        >
                            {scanCount} scanned today
                        </div>
                    )}
                </div>

                {/* Scanner or Result */}
                {!isScanning && !scanResult && (
                    <div
                        className="p-8 rounded-2xl text-center"
                        style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                    >
                        <div className="text-6xl mb-4">📷</div>
                        <p className="mb-6" style={{ color: theme.textMuted }}>
                            Tap the button below to start scanning tickets
                        </p>
                        <button
                            onClick={startScanner}
                            className="w-full py-4 rounded-xl font-bold text-lg"
                            style={{ background: theme.gradient, color: theme.text }}
                        >
                            Start Scanning
                        </button>
                    </div>
                )}

                {isScanning && (
                    <div>
                        <div
                            id="qr-reader"
                            className="rounded-2xl overflow-hidden mb-4"
                            style={{ backgroundColor: theme.surface }}
                        />
                        <button
                            onClick={stopScanner}
                            className="w-full py-3 rounded-xl font-medium"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {scanResult && (
                    <div
                        className="p-6 rounded-2xl"
                        style={{
                            backgroundColor: theme.surface,
                            border: `2px solid ${scanResult.valid ? theme.success : theme.error}`,
                        }}
                    >
                        {/* Status Header */}
                        <div className="text-center mb-4">
                            {scanResult.valid ? (
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{ backgroundColor: theme.success + '20', color: theme.success }}
                                >
                                    <span className="text-2xl">✓</span>
                                    <span className="font-bold">{scanResult.message || 'Valid Ticket'}</span>
                                </div>
                            ) : (
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{ backgroundColor: theme.error + '20', color: theme.error }}
                                >
                                    <span className="text-2xl">✗</span>
                                    <span className="font-bold">
                                        {scanResult.alreadyScanned ? 'Already Scanned!' : 'Invalid'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {scanResult.error && (
                            <p
                                className="text-center mb-4 p-3 rounded-lg"
                                style={{
                                    backgroundColor: theme.error + '10',
                                    color: theme.error,
                                }}
                            >
                                {scanResult.error}
                            </p>
                        )}

                        {/* Ticket Details */}
                        {scanResult.ticket && (
                            <div className="space-y-3 mb-6">
                                <div
                                    className="p-4 rounded-xl"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span style={{ color: theme.textMuted }}>Tier</span>
                                        <span
                                            className="px-3 py-1 rounded-full font-bold"
                                            style={{ background: theme.gradient, color: theme.text }}
                                        >
                                            {scanResult.ticket.tier}
                                        </span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span style={{ color: theme.textMuted }}>Name</span>
                                        <span style={{ color: theme.text, fontWeight: 600 }}>
                                            {scanResult.ticket.buyerName}
                                        </span>
                                    </div>
                                    {scanResult.ticket.buyerPhone && (
                                        <div className="flex justify-between mb-2">
                                            <span style={{ color: theme.textMuted }}>Phone</span>
                                            <span style={{ color: theme.text }}>
                                                {scanResult.ticket.buyerPhone}
                                            </span>
                                        </div>
                                    )}
                                    {scanResult.alreadyScanned && scanResult.ticket.scannedAt && (
                                        <div className="flex justify-between">
                                            <span style={{ color: theme.textMuted }}>Scanned At</span>
                                            <span style={{ color: theme.warning }}>
                                                {new Date(scanResult.ticket.scannedAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <p
                                    className="text-xs text-center"
                                    style={{ color: theme.textMuted }}
                                >
                                    ID: {scanResult.ticket.id.substring(0, 8)}...
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {scanResult.valid && !scanResult.message?.includes('Confirmed') && (
                                <button
                                    onClick={handleConfirmScan}
                                    disabled={isProcessing}
                                    className="w-full py-4 rounded-xl font-bold text-lg"
                                    style={{
                                        backgroundColor: theme.success,
                                        color: theme.text,
                                        opacity: isProcessing ? 0.7 : 1,
                                    }}
                                >
                                    {isProcessing ? 'Confirming...' : '✓ Confirm Entry'}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    resetScanner();
                                    startScanner();
                                }}
                                className="w-full py-3 rounded-xl font-medium"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: theme.text,
                                    border: `1px solid ${theme.border}`,
                                }}
                            >
                                Scan Another Ticket
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-8 text-center">
                    <p className="text-sm" style={{ color: theme.textMuted }}>
                        Point camera at ticket QR code
                    </p>
                </div>
            </div>

            {/* Custom styles for html5-qrcode */}
            <style jsx global>{`
                #qr-reader {
                    border: none !important;
                }
                #qr-reader__scan_region {
                    background: ${theme.surface} !important;
                }
                #qr-reader__dashboard {
                    background: ${theme.surface} !important;
                    padding: 10px !important;
                }
                #qr-reader__dashboard_section {
                    background: ${theme.surface} !important;
                }
                #qr-reader__dashboard_section_csr button {
                    background: ${theme.primary} !important;
                    border: none !important;
                    color: white !important;
                    padding: 10px 20px !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                }
                #qr-reader__dashboard_section_swaplink {
                    color: ${theme.primary} !important;
                    text-decoration: none !important;
                }
                #qr-reader__status_span {
                    color: ${theme.textMuted} !important;
                    background: transparent !important;
                }
                #qr-reader video {
                    border-radius: 12px !important;
                }
            `}</style>
        </div>
    );
}
