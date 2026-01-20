/**
 * Client-side QR signature verification for offline scanning
 * 
 * SECURITY NOTE: The HMAC secret is embedded here for offline verification.
 * This is a trade-off: it allows offline scanning but means the secret is in client code.
 * For higher security, use asymmetric keys (RSA/ECDSA) where public key verifies.
 */

// Embedded secret for client-side verification
// In production, consider using asymmetric keys instead
const QR_HMAC_SECRET = process.env.NEXT_PUBLIC_QR_HMAC_SECRET || 'default-secret-change-in-production';

interface QRPayload {
    id: string;
    name: string;
    tier: string;
    nonce: string;
    signature: string;
}

/**
 * Parse QR code string to payload
 */
export function parseQRPayload(qrString: string): QRPayload | null {
    try {
        const parsed = JSON.parse(qrString);

        if (
            typeof parsed.id === 'string' &&
            typeof parsed.name === 'string' &&
            typeof parsed.tier === 'string' &&
            typeof parsed.nonce === 'string' &&
            typeof parsed.signature === 'string'
        ) {
            return parsed as QRPayload;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Verify QR signature client-side using Web Crypto API
 */
export async function verifySignatureClient(payload: QRPayload): Promise<boolean> {
    try {
        const { signature, ...dataWithoutSignature } = payload;
        const message = `${dataWithoutSignature.id}:${dataWithoutSignature.name}:${dataWithoutSignature.tier}:${dataWithoutSignature.nonce}`;

        // Import the secret key
        const encoder = new TextEncoder();
        const keyData = encoder.encode(QR_HMAC_SECRET);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        // Generate expected signature
        const messageData = encoder.encode(message);
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);

        // Convert to hex
        const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Constant-time comparison (best effort in JS)
        if (signature.length !== expectedSignature.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < signature.length; i++) {
            result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
        }

        return result === 0;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Full offline verification: parse and verify signature
 */
export async function verifyQROffline(qrString: string): Promise<{
    valid: boolean;
    payload: QRPayload | null;
    error?: string;
}> {
    const payload = parseQRPayload(qrString);

    if (!payload) {
        return { valid: false, payload: null, error: 'Invalid QR format' };
    }

    const isValid = await verifySignatureClient(payload);

    if (!isValid) {
        return { valid: false, payload, error: 'Invalid signature - possible fake ticket!' };
    }

    return { valid: true, payload };
}
