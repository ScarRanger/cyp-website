import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { reserveTicketsAtomic, storeReservation, getAvailableTickets } from '@/app/lib/concert-redis';
import { reservationRatelimit, getClientIP } from '@/app/lib/concert-ratelimit';
import { Client } from '@upstash/qstash';

const MAX_TICKETS_PER_SESSION = 10;
const ROLLBACK_DELAY_MINUTES = 10;

// QStash client for scheduling rollback
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = process.env.APP_URL || process.env.VERCEL_URL || '';
const qstash = QSTASH_TOKEN ? new Client({ token: QSTASH_TOKEN }) : null;

export async function POST(request: NextRequest) {
    try {
        const clientIP = getClientIP(request);

        // Rate limit check
        const rateLimitResult = await reservationRatelimit.limit(clientIP);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                {
                    error: 'Too many requests. Please wait before trying again.',
                    retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
                },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { tier, quantity, sessionId } = body;

        if (!tier || !quantity || !sessionId) {
            return NextResponse.json(
                { error: 'Missing tier, quantity, or sessionId' },
                { status: 400 }
            );
        }

        if (quantity < 1 || quantity > MAX_TICKETS_PER_SESSION) {
            return NextResponse.json(
                { error: `Quantity must be between 1 and ${MAX_TICKETS_PER_SESSION}` },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // Check how many tickets this session already has reserved (pending orders)
        const { data: existingOrders, error: ordersError } = await supabase
            .from('concert_orders')
            .select('quantity')
            .eq('session_id', sessionId)
            .eq('status', 'pending');

        if (ordersError) {
            console.error('[SoftLock] Error checking existing orders:', ordersError);
        }

        const currentlyReserved = (existingOrders || []).reduce((sum, order) => sum + order.quantity, 0);

        if (currentlyReserved + quantity > MAX_TICKETS_PER_SESSION) {
            return NextResponse.json(
                {
                    error: `Maximum ${MAX_TICKETS_PER_SESSION} tickets can be selected at once. You have ${currentlyReserved} already reserved.`,
                    currentlyReserved,
                },
                { status: 400 }
            );
        }

        // Atomic reservation via Redis Lua script
        const reserveResult = await reserveTicketsAtomic(tier, quantity);

        if (!reserveResult.success) {
            return NextResponse.json(
                {
                    error: `Only ${reserveResult.available} tickets available in ${tier} tier`,
                    available: reserveResult.available,
                },
                { status: 400 }
            );
        }

        // Generate checkout ID
        const checkoutId = `CHK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + ROLLBACK_DELAY_MINUTES * 60 * 1000).toISOString();

        // Store reservation metadata in Redis (with TTL)
        await storeReservation(checkoutId, {
            tier,
            quantity: quantity,
            createdAt,
        });

        // Create pending order in Supabase
        const { error: orderError } = await supabase
            .from('concert_orders')
            .insert({
                checkout_id: checkoutId,
                tier,
                quantity,
                session_id: sessionId,
                client_ip: clientIP,
                status: 'pending',
                created_at: createdAt,
                expires_at: expiresAt,
            });

        if (orderError) {
            console.error('[SoftLock] Error creating order:', orderError);
            // Rollback Redis reservation
            const { releaseTickets } = await import('@/app/lib/concert-redis');
            await releaseTickets(tier, quantity);
            throw orderError;
        }

        // Schedule QStash rollback
        let qstashMessageId: string | null = null;

        if (qstash && APP_URL) {
            try {
                const webhookUrl = `${APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`}/api/concert/rollback`;

                const result = await qstash.publishJSON({
                    url: webhookUrl,
                    body: {
                        checkout_id: checkoutId,
                        tier,
                        quantity,
                    },
                    delay: `${ROLLBACK_DELAY_MINUTES}m`,
                    retries: 3,
                });

                qstashMessageId = result.messageId;
                console.log(`[SoftLock] Scheduled rollback for ${checkoutId} in ${ROLLBACK_DELAY_MINUTES}m, messageId: ${qstashMessageId}`);

                // Update order with QStash message ID
                await supabase
                    .from('concert_orders')
                    .update({ qstash_message_id: qstashMessageId })
                    .eq('checkout_id', checkoutId);

            } catch (qstashError) {
                console.error('[SoftLock] Failed to schedule QStash rollback:', qstashError);
                // Continue anyway - tickets will remain reserved until manual cleanup
            }
        } else {
            console.warn('[SoftLock] QStash not configured - no automatic rollback will occur');
        }

        return NextResponse.json({
            success: true,
            message: `${quantity} ${tier} ticket(s) reserved for ${ROLLBACK_DELAY_MINUTES} minutes`,
            checkoutId,
            expiresAt,
            available: reserveResult.available,
            qstashMessageId,
        });

    } catch (error) {
        console.error('[SoftLock] Error:', error);
        return NextResponse.json(
            { error: 'Failed to reserve tickets' },
            { status: 500 }
        );
    }
}

// GET to check current availability
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tier = searchParams.get('tier');

        if (!tier) {
            // Return all tiers
            const { getAllTierAvailability } = await import('@/app/lib/concert-redis');
            const availability = await getAllTierAvailability();
            return NextResponse.json({ tiers: availability });
        }

        const available = await getAvailableTickets(tier);
        return NextResponse.json({ tier, available });

    } catch (error) {
        console.error('[SoftLock] Error getting availability:', error);
        return NextResponse.json(
            { error: 'Failed to get availability' },
            { status: 500 }
        );
    }
}
