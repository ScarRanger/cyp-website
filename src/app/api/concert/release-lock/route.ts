import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { releaseTickets, deleteReservation } from '@/app/lib/concert-redis';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { checkoutId } = body;

        if (!checkoutId) {
            return NextResponse.json(
                { error: 'Missing checkoutId' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // Get the pending order
        const { data: order, error: orderError } = await supabase
            .from('concert_orders')
            .select('tier, quantity, status')
            .eq('checkout_id', checkoutId)
            .single();

        if (orderError || !order) {
            // If order doesn't exist, try to clean up Redis anyway
            await deleteReservation(checkoutId);
            return NextResponse.json({
                success: true,
                message: 'Reservation not found or already released',
            });
        }

        // Only release if still pending
        if (order.status === 'pending') {
            // Release tickets back to Redis
            const newCount = await releaseTickets(order.tier, order.quantity);

            // Update order status to cancelled
            await supabase
                .from('concert_orders')
                .update({
                    status: 'cancelled',
                    expired_at: new Date().toISOString(),
                })
                .eq('checkout_id', checkoutId);

            // Clean up Redis reservation
            await deleteReservation(checkoutId);

            console.log(`[ReleaseLock] Released ${order.quantity} ${order.tier} tickets. New available: ${newCount}`);

            return NextResponse.json({
                success: true,
                message: `Released ${order.quantity} ${order.tier} ticket(s)`,
                newAvailable: newCount,
            });
        }

        // Already paid or expired
        await deleteReservation(checkoutId);

        return NextResponse.json({
            success: true,
            message: `Order already ${order.status}`,
        });

    } catch (error) {
        console.error('[ReleaseLock] Error:', error);
        return NextResponse.json(
            { error: 'Failed to release lock' },
            { status: 500 }
        );
    }
}
