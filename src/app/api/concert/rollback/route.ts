import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { releaseTickets, deleteReservation } from '@/app/lib/concert-redis';

// QStash signature verification
const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

interface RollbackPayload {
    checkout_id: string;
    tier: string;
    quantity: number;
}

export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature verification
        const body = await request.text();
        const signature = request.headers.get('upstash-signature');

        if (!signature) {
            console.error('[Rollback] Missing QStash signature');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify QStash signature
        const isValid = await receiver.verify({
            signature,
            body,
        });

        if (!isValid) {
            console.error('[Rollback] Invalid QStash signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload: RollbackPayload = JSON.parse(body);
        const { checkout_id, tier, quantity } = payload;

        if (!checkout_id || !tier || !quantity) {
            console.error('[Rollback] Missing required fields:', payload);
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`[Rollback] Processing rollback for checkout ${checkout_id}: ${quantity} ${tier} tickets`);

        const supabase = createServerSupabaseClient();

        // Check order status in Supabase
        const { data: order, error: orderError } = await supabase
            .from('concert_orders')
            .select('status')
            .eq('checkout_id', checkout_id)
            .single();

        if (orderError && orderError.code !== 'PGRST116') {
            console.error('[Rollback] Error fetching order:', orderError);
            throw orderError;
        }

        // If order doesn't exist or is not found, still try to release (edge case)
        if (!order) {
            console.log(`[Rollback] Order ${checkout_id} not found, releasing tickets anyway`);
            const newCount = await releaseTickets(tier, quantity);
            await deleteReservation(checkout_id);
            return NextResponse.json({
                status: 'released_no_order',
                newAvailable: newCount,
            });
        }

        // If order is PAID, do nothing
        if (order.status === 'paid') {
            console.log(`[Rollback] Order ${checkout_id} already paid, no rollback needed`);
            await deleteReservation(checkout_id);
            return NextResponse.json({
                status: 'already_paid',
                message: 'Order already completed',
            });
        }

        // If order is already expired, do nothing (already rolled back)
        if (order.status === 'expired') {
            console.log(`[Rollback] Order ${checkout_id} already expired`);
            return NextResponse.json({
                status: 'already_expired',
                message: 'Order already rolled back',
            });
        }

        // Order is PENDING - proceed with rollback
        console.log(`[Rollback] Order ${checkout_id} is pending, releasing ${quantity} ${tier} tickets`);

        // Release tickets back to Redis
        const newCount = await releaseTickets(tier, quantity);

        // Update order status to expired
        const { error: updateError } = await supabase
            .from('concert_orders')
            .update({
                status: 'expired',
                expired_at: new Date().toISOString(),
            })
            .eq('checkout_id', checkout_id);

        if (updateError) {
            console.error('[Rollback] Error updating order status:', updateError);
            // Don't throw - tickets are already released
        }

        // Clean up reservation metadata
        await deleteReservation(checkout_id);

        console.log(`[Rollback] Successfully rolled back ${checkout_id}. New available: ${newCount}`);

        return NextResponse.json({
            status: 'rolled_back',
            checkout_id,
            tier,
            quantity,
            newAvailable: newCount,
        });

    } catch (error) {
        console.error('[Rollback] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process rollback' },
            { status: 500 }
        );
    }
}
