import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { sendTicketEmail } from '@/app/lib/email-service';
import type { EmailJobPayload } from '@/app/lib/qstash';

// QStash receiver for signature verification
const receiver = process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
    : null;

/**
 * QStash webhook endpoint for sending ticket emails
 * This endpoint is called by QStash after the order API schedules an email
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();

        // Verify signature if QStash is configured
        if (receiver) {
            const signature = request.headers.get('upstash-signature');
            if (!signature) {
                console.error('[QStash Webhook] ERROR: Missing signature');
                return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
            }

            const isValid = await receiver.verify({
                signature,
                body,
            });

            if (!isValid) {
                console.error('[QStash Webhook] ERROR: Invalid signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else if (process.env.NODE_ENV === 'production') {
            // In production, require signature verification
            console.error('QStash signing keys not configured in production');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const payload: EmailJobPayload = JSON.parse(body);

        // Validate payload
        if (!payload.buyerEmail || !payload.buyerName || !payload.tickets || payload.tickets.length === 0) {
            console.error('Invalid email job payload:', payload);
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Send the email using the configured provider
        const result = await sendTicketEmail(
            payload.buyerEmail,
            payload.buyerName,
            payload.purchaseDate,
            payload.tickets
        );

        return NextResponse.json({
            success: true,
            messageId: result.messageId,
            provider: result.provider,
        });

    } catch (error) {
        console.error('Error processing email job:', error);

        // Return 500 to trigger QStash retry
        return NextResponse.json(
            { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
