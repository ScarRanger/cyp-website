import { Client } from '@upstash/qstash';
import type { TicketInfo } from './email-service';

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
// APP_URL is YOUR website's URL (where QStash will send webhooks)
const APP_URL = process.env.APP_URL || process.env.VERCEL_URL || '';

// Initialize QStash client
const qstashClient = QSTASH_TOKEN ? new Client({ token: QSTASH_TOKEN }) : null;

/**
 * Email job payload structure
 */
export interface EmailJobPayload {
    buyerEmail: string;
    buyerName: string;
    purchaseDate: string;
    tickets: TicketInfo[];
}

/**
 * Schedule an email to be sent via QStash
 * Returns immediately, email is sent asynchronously
 */
export async function scheduleTicketEmail(payload: EmailJobPayload): Promise<{ messageId: string; scheduled: boolean }> {

    if (!qstashClient) {
        console.error('[QStash] ERROR: QSTASH_TOKEN is not configured');
        throw new Error('QSTASH_TOKEN is not configured');
    }

    if (!APP_URL) {
        console.error('[QStash] ERROR: APP_URL is not configured');
        throw new Error('APP_URL is not configured');
    }

    // Build the webhook URL
    const webhookUrl = `${APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`}/api/webhooks/qstash-email`;

    const result = await qstashClient.publishJSON({
        url: webhookUrl,
        body: payload,
        retries: 3,
    });

    return {
        messageId: result.messageId,
        scheduled: true,
    };
}

/**
 * Check if QStash is configured and available
 */
export function isQStashConfigured(): boolean {
    return !!(QSTASH_TOKEN && APP_URL);
}

/**
 * Cancel a scheduled QStash message by its ID
 * Used to cancel rollback jobs when orders are paid
 */
export async function cancelQStashMessage(messageId: string): Promise<boolean> {
    if (!qstashClient) {
        console.warn('[QStash] Cannot cancel message - client not configured');
        return false;
    }

    try {
        await qstashClient.messages.delete(messageId);
        console.log(`[QStash] Successfully cancelled message: ${messageId}`);
        return true;
    } catch (error) {
        // Message may have already been delivered or doesn't exist
        console.warn(`[QStash] Failed to cancel message ${messageId}:`, error);
        return false;
    }
}
