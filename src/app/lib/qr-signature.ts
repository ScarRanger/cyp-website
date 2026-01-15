import crypto from 'crypto';
import type { QRPayload } from '@/app/types/concert';

const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET || 'default-secret-change-in-production';

/**
 * Generate a random nonce for QR code uniqueness
 */
export function generateNonce(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate HMAC-SHA256 signature for QR payload
 * Signs: id + name + tier + nonce
 */
export function generateSignature(data: Omit<QRPayload, 'signature'>): string {
    const payload = `${data.id}:${data.name}:${data.tier}:${data.nonce}`;
    return crypto
        .createHmac('sha256', QR_HMAC_SECRET)
        .update(payload)
        .digest('hex');
}

/**
 * Create a complete QR payload with signature
 */
export function createQRPayload(ticketId: string, buyerName: string, tier: string): QRPayload {
    const nonce = generateNonce();

    const dataWithoutSignature = {
        id: ticketId,
        name: buyerName,
        tier: tier,
        nonce: nonce,
    };

    const signature = generateSignature(dataWithoutSignature);

    return {
        ...dataWithoutSignature,
        signature,
    };
}

/**
 * Verify a QR payload signature
 * Returns true if the signature is valid
 */
export function verifyQRSignature(payload: QRPayload): boolean {
    const { signature, ...dataWithoutSignature } = payload;
    const expectedSignature = generateSignature(dataWithoutSignature);

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Convert QR payload to JSON string for QR code generation
 */
export function qrPayloadToString(payload: QRPayload): string {
    return JSON.stringify(payload);
}

/**
 * Parse QR code string back to payload
 */
export function parseQRString(qrString: string): QRPayload | null {
    try {
        const parsed = JSON.parse(qrString);

        // Validate required fields
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
