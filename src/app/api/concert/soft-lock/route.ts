import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';

const MAX_TICKETS_PER_SESSION = 10;
const LOCK_DURATION_MINUTES = 5;

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIp) {
        return realIp;
    }
    return 'unknown';
}

export async function POST(request: NextRequest) {
    try {
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

        const clientIP = getClientIP(request);
        const supabase = createServerSupabaseClient();

        // Check how many tickets this session already has locked
        const { data: existingLocks, error: locksError } = await supabase
            .from('concert_soft_locks')
            .select('quantity')
            .eq('session_id', sessionId)
            .gt('expires_at', new Date().toISOString());

        if (locksError) throw locksError;

        const currentlyLocked = (existingLocks || []).reduce((sum, lock) => sum + lock.quantity, 0);

        if (currentlyLocked + quantity > MAX_TICKETS_PER_SESSION) {
            return NextResponse.json(
                { error: `Maximum ${MAX_TICKETS_PER_SESSION} tickets can be selected at once. You have ${currentlyLocked} already selected.` },
                { status: 400 }
            );
        }

        // Get tier inventory
        const { data: tierData, error: tierError } = await supabase
            .from('concert_ticket_inventory')
            .select('*')
            .eq('tier', tier)
            .single();

        if (tierError || !tierData) {
            return NextResponse.json(
                { error: 'Tier not found' },
                { status: 404 }
            );
        }

        // Check availability
        const available = tierData.total_tickets - tierData.sold_tickets - tierData.soft_locked;

        if (available < quantity) {
            return NextResponse.json(
                { error: `Only ${available} tickets available in ${tier} tier` },
                { status: 400 }
            );
        }

        // Create soft lock with expiry
        const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();

        // Start transaction: increment soft_locked count and create lock record
        const { error: updateError } = await supabase
            .from('concert_ticket_inventory')
            .update({
                soft_locked: tierData.soft_locked + quantity,
                updated_at: new Date().toISOString(),
            })
            .eq('tier', tier)
            .eq('soft_locked', tierData.soft_locked); // Optimistic lock

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to reserve tickets. Please try again.' },
                { status: 409 }
            );
        }

        // Create soft lock record
        const { data: lockData, error: lockError } = await supabase
            .from('concert_soft_locks')
            .insert({
                tier,
                quantity,
                session_id: sessionId,
                client_ip: clientIP,
                expires_at: expiresAt,
            })
            .select()
            .single();

        if (lockError) {
            // Rollback the inventory update
            await supabase
                .from('concert_ticket_inventory')
                .update({ soft_locked: tierData.soft_locked })
                .eq('tier', tier);

            throw lockError;
        }

        return NextResponse.json({
            success: true,
            message: `${quantity} ${tier} ticket(s) reserved for ${LOCK_DURATION_MINUTES} minutes`,
            lockId: lockData.id,
            expiresAt,
        });

    } catch (error) {
        console.error('Error soft-locking tickets:', error);
        return NextResponse.json(
            { error: 'Failed to reserve tickets' },
            { status: 500 }
        );
    }
}
