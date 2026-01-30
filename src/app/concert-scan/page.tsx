"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { initDB, isScannedLocally, storeScanLocally, getDeviceId, type LocalScan } from "@/app/lib/offline-db";
import { verifyQROffline, parseQRPayload } from "@/app/lib/offline-verify";
import { startBackgroundSync, isOnline } from "@/app/lib/sync-service";

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

// Credentials are loaded from environment variables for security
// Set CONCERT_SCAN_USERNAME and CONCERT_SCAN_PASSWORD in your environment
const getCredentials = () => ({
    username: process.env.NEXT_PUBLIC_CONCERT_SCAN_USERNAME || '',
    password: process.env.NEXT_PUBLIC_CONCERT_SCAN_PASSWORD || '',
});

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
    qrData?: string; // Original QR payload for verification
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
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [pendingSyncs, setPendingSyncs] = useState(0);
    const [conflicts, setConflicts] = useState<LocalScan[]>([]);

    // Ref to hold the scanner instance
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Check for saved session + register service worker
    useEffect(() => {
        const savedAuth = sessionStorage.getItem('scanner_auth');
        if (savedAuth === 'authenticated') {
            setIsAuthenticated(true);
        }

        // Register service worker for offline page caching
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('[SW] Registered:', reg.scope))
                .catch((err) => console.error('[SW] Registration failed:', err));
        }
    }, []);

    // Initialize offline capabilities
    useEffect(() => {
        if (!isAuthenticated) return;

        // Initialize IndexedDB
        initDB().catch(console.error);

        // Start background sync
        const stopSync = startBackgroundSync(30000); // Sync every 30 seconds

        // Monitor online/offline status
        const updateOnlineStatus = () => setIsOfflineMode(!navigator.onLine);
        updateOnlineStatus();
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Listen for sync conflicts
        const handleConflicts = (e: CustomEvent) => {
            setConflicts(prev => [...prev, ...e.detail.conflicts]);
        };
        window.addEventListener('scan-conflicts', handleConflicts as EventListener);

        return () => {
            stopSync();
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
            window.removeEventListener('scan-conflicts', handleConflicts as EventListener);
        };
    }, [isAuthenticated]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
                scannerRef.current.clear();
            }
        };
    }, []);

    // --- LOGIC FIX: Handle Scanner Lifecycle ---
    // --- LOGIC FIX: Handle Scanner Lifecycle ---
    useEffect(() => {
        // Only run this if we are supposed to be scanning and the scanner isn't already running
        if (isScanning && !scannerRef.current) {
            const startCamera = async () => {
                try {
                    // Step 1: Explicitly request camera permission first
                    // This ensures the browser shows the permission prompt
                    console.log("Requesting camera permission...");
                    let stream: MediaStream | null = null;
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: "environment" }
                        });
                        console.log("Camera permission granted!");
                    } catch (permErr: any) {
                        console.error("Permission request failed:", permErr);
                        // Try without facingMode constraint
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({ video: true });
                            console.log("Camera permission granted (any camera)!");
                        } catch (permErr2: any) {
                            console.error("All permission requests failed:", permErr2);
                            throw permErr2;
                        }
                    }

                    // Step 2: Stop the test stream - we just needed it for permission
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }

                    // Step 3: Now start the QR scanner (permission is already granted)
                    const html5QrCode = new Html5Qrcode(
                        "qr-reader",
                        {
                            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                            verbose: false
                        }
                    );

                    scannerRef.current = html5QrCode;

                    const scanConfig = {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    };

                    const onSuccess = (decodedText: string) => {
                        onScanSuccess(decodedText);
                    };

                    const onError = () => {
                        // Ignore scan errors while seeking code
                    };

                    // Try back camera first, then fallback to any camera
                    try {
                        await html5QrCode.start(
                            { facingMode: "environment" },
                            scanConfig,
                            onSuccess,
                            onError
                        );
                        console.log("QR Scanner started successfully!");
                    } catch (backCameraErr) {
                        console.warn("Back camera failed, trying any camera:", backCameraErr);
                        // Fallback: try to get any available camera
                        const cameras = await Html5Qrcode.getCameras();
                        console.log("Available cameras:", cameras);
                        if (cameras && cameras.length > 0) {
                            await html5QrCode.start(
                                cameras[0].id,
                                scanConfig,
                                onSuccess,
                                onError
                            );
                            console.log("QR Scanner started with fallback camera!");
                        } else {
                            throw new Error("No cameras found on device");
                        }
                    }
                } catch (err: any) {
                    console.error("Error starting scanner:", err);
                    // Clean up the scanner ref if it was created
                    if (scannerRef.current) {
                        try {
                            scannerRef.current.clear();
                        } catch (e) { }
                        scannerRef.current = null;
                    }
                    setIsScanning(false);
                    setScanResult({
                        valid: false,
                        error: getCameraErrorMessage(err),
                    });
                }
            };

            const timer = setTimeout(() => {
                startCamera();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isScanning]);


    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');

        const credentials = getCredentials();
        if (username === credentials.username && password === credentials.password) {
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
        // We simply set this to true. The useEffect above will detect this change,
        // wait for the render, and then start the camera.
        setIsScanning(true);
    };

    const getCameraErrorMessage = (err: any): string => {
        const errorName = err?.name || 'UnknownError';
        const errorMsg = err?.message || '';

        // Check if running on HTTP (not HTTPS) - camera requires secure context
        if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            return 'Camera requires HTTPS. Please use a secure connection.';
        }

        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
            return 'Camera access denied. Please enable camera permissions in your browser settings and refresh the page.';
        }
        if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
            return 'No camera found on this device.';
        }
        if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
            return 'Camera is in use by another app. Please close other apps using the camera.';
        }
        if (errorName === 'OverconstrainedError') {
            return 'Camera requirements not met. Trying alternative...';
        }
        if (errorMsg.includes('No cameras found')) {
            return 'No cameras found on this device.';
        }

        // For debugging: show actual error
        return `Camera error: ${errorName} - ${errorMsg || 'Please refresh and try again.'}`;
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (error) {
                console.error("Failed to stop scanner", error);
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const onScanSuccess = async (decodedText: string) => {
        // Stop scanning immediately upon success to prevent duplicate calls
        await stopScanner();

        if (isProcessing) return;
        setIsProcessing(true);

        try {
            // OFFLINE-FIRST: Verify signature locally first
            const { valid, payload, error } = await verifyQROffline(decodedText);

            if (!valid || !payload) {
                setScanResult({
                    valid: false,
                    error: error || 'Invalid QR code',
                });
                return;
            }

            // Check if already scanned locally (on this device)
            const existingLocalScan = await isScannedLocally(payload.id);
            if (existingLocalScan) {
                setScanResult({
                    valid: false,
                    error: 'Already scanned on this device!',
                    alreadyScanned: true,
                    ticket: {
                        id: payload.id,
                        tier: payload.tier,
                        status: 'used',
                        buyerName: payload.name,
                        scannedAt: existingLocalScan.scannedAt,
                    },
                });
                return;
            }

            // If online, also verify with server
            if (isOnline()) {
                try {
                    const response = await fetch('/api/concert/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ qrData: decodedText }),
                    });

                    const data = await response.json();

                    if (data.alreadyScanned) {
                        setScanResult({ ...data, qrData: decodedText });
                        return;
                    }

                    // Store original QR data for confirmation step
                    setScanResult({ ...data, qrData: decodedText });
                } catch (error) {
                    // Network error - fall back to offline mode
                    console.log('Network error, using offline mode');
                    setScanResult({
                        valid: true,
                        message: 'Valid ticket (offline mode)',
                        ticket: {
                            id: payload.id,
                            tier: payload.tier,
                            status: 'valid',
                            buyerName: payload.name,
                        },
                        qrData: decodedText,
                    });
                }
            } else {
                // Offline mode - signature verified, show as valid
                setScanResult({
                    valid: true,
                    message: 'Valid ticket (offline mode)',
                    ticket: {
                        id: payload.id,
                        tier: payload.tier,
                        status: 'valid',
                        buyerName: payload.name,
                    },
                    qrData: decodedText,
                });
            }
        } catch (error) {
            console.error('Verification error:', error);
            setScanResult({
                valid: false,
                error: 'Failed to verify ticket.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmScan = async () => {
        if (!scanResult?.ticket?.id || !scanResult.qrData) return;
        setIsProcessing(true);

        const ticketId = scanResult.ticket.id;
        const deviceId = getDeviceId();
        const scannedAt = new Date().toISOString();

        try {
            // ALWAYS store locally first (offline-first)
            const localScan: LocalScan = {
                ticketId,
                tier: scanResult.ticket.tier,
                buyerName: scanResult.ticket.buyerName,
                scannedAt,
                deviceId,
                synced: false,
                conflict: false,
                qrData: scanResult.qrData,
            };

            await storeScanLocally(localScan);
            setScanCount(prev => prev + 1);

            // Try to sync to server if online
            if (isOnline()) {
                try {
                    const response = await fetch('/api/concert/scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ticketId,
                            qrData: scanResult.qrData
                        }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Update local record as synced
                        localScan.synced = true;
                        await storeScanLocally(localScan);

                        setScanResult({
                            valid: true,
                            message: '✓ Entry Confirmed!',
                            ticket: scanResult.ticket,
                        });
                    } else if (data.alreadyScanned) {
                        // Conflict detected
                        localScan.synced = true;
                        localScan.conflict = true;
                        await storeScanLocally(localScan);

                        setScanResult({
                            valid: false,
                            error: 'Already scanned on another device!',
                            alreadyScanned: true,
                            ticket: scanResult.ticket,
                        });
                        return;
                    }
                } catch (networkError) {
                    // Network failed - scan is stored locally, will sync later
                    console.log('Network error, scan saved locally');
                    setScanResult({
                        valid: true,
                        message: '✓ Entry Confirmed (will sync)',
                        ticket: scanResult.ticket,
                    });
                }
            } else {
                // Offline - scan saved locally
                setScanResult({
                    valid: true,
                    message: '✓ Entry Confirmed (offline)',
                    ticket: scanResult.ticket,
                });
            }

            if (navigator.vibrate) {
                navigator.vibrate(200);
            }

            setTimeout(() => {
                setScanResult(null);
            }, 3000);

        } catch (error) {
            console.error('Scan confirmation error:', error);
            setScanResult({
                valid: false,
                error: 'Failed to save scan. Try again.',
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

                {/* CAMERA CONTAINER */}
                {isScanning && (
                    <div>
                        <div className="relative rounded-2xl overflow-hidden mb-4 border border-gray-700 bg-black">
                            {/* This ID matches the ID used in new Html5Qrcode("qr-reader") */}
                            <div
                                id="qr-reader"
                                className="w-full h-full"
                                style={{ minHeight: '300px' }}
                            />
                        </div>
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
                {!scanResult && (
                    <div className="mt-8 text-center">
                        <p className="text-sm" style={{ color: theme.textMuted }}>
                            Point camera at ticket QR code
                        </p>
                    </div>
                )}
            </div>

            {/* Custom styles - Simplified because we are not using the Scanner UI anymore */}
            <style jsx global>{`
                #qr-reader video {
                    object-fit: cover;
                    border-radius: 12px;
                }
            `}</style>
        </div>
    );
}