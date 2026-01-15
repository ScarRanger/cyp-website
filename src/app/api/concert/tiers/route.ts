import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import type { TierAvailability } from '@/app/types/concert';

export async function GET() {
    try {
        const supabase = createServerSupabaseClient();

        // Get all tiers with their availability
        const { data: tiers, error: tiersError } = await supabase
            .from('concert_ticket_inventory')
            .select('*')
            .order('price', { ascending: false });

        if (tiersError) throw tiersError;

        // Calculate available tickets (total - sold)
        const availability: TierAvailability[] = (tiers || []).map(tier => ({
            tier: tier.tier,
            price: tier.price,
            description: tier.description,
            total: tier.total_tickets,
            available: Math.max(0, tier.total_tickets - tier.sold_tickets),
            sold: tier.sold_tickets,
        }));

        return NextResponse.json({
            success: true,
            tiers: availability,
        });

    } catch (error) {
        console.error('Error fetching tiers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ticket tiers' },
            { status: 500 }
        );
    }
}
