import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lockId, sessionId, tier } = body;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Missing sessionId' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // Find and delete the lock(s) for this session
        let query = supabase
            .from('concert_soft_locks')
            .select('*')
            .eq('session_id', sessionId);

        if (lockId) {
            query = query.eq('id', lockId);
        }
        if (tier) {
            query = query.eq('tier', tier);
        }

        const { data: locks, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (!locks || locks.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No locks found to release',
            });
        }

        // Group quantities by tier
        const tierQuantities: Record<string, number> = {};
        for (const lock of locks) {
            tierQuantities[lock.tier] = (tierQuantities[lock.tier] || 0) + lock.quantity;
        }

        // Delete the locks
        let deleteQuery = supabase
            .from('concert_soft_locks')
            .delete()
            .eq('session_id', sessionId);

        if (lockId) {
            deleteQuery = deleteQuery.eq('id', lockId);
        }
        if (tier) {
            deleteQuery = deleteQuery.eq('tier', tier);
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) throw deleteError;

        // Decrement soft_locked counts for each tier
        for (const [tierName, quantity] of Object.entries(tierQuantities)) {
            const { data: tierData } = await supabase
                .from('concert_ticket_inventory')
                .select('soft_locked')
                .eq('tier', tierName)
                .single();

            if (tierData) {
                await supabase
                    .from('concert_ticket_inventory')
                    .update({
                        soft_locked: Math.max(0, tierData.soft_locked - quantity),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('tier', tierName);
            }
        }

        const totalReleased = locks.reduce((sum, lock) => sum + lock.quantity, 0);

        return NextResponse.json({
            success: true,
            message: `Released ${totalReleased} ticket(s)`,
            released: totalReleased,
        });

    } catch (error) {
        console.error('Error releasing lock:', error);
        return NextResponse.json(
            { error: 'Failed to release lock' },
            { status: 500 }
        );
    }
}
