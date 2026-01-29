import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import { getAllTierAvailability, getAvailableTickets } from '@/app/lib/concert-redis';
import { availabilityRatelimit, getClientIP } from '@/app/lib/concert-ratelimit';
import type { TierAvailability } from '@/app/types/concert';

export async function GET(request: NextRequest) {
    try {
        const clientIP = getClientIP(request);

        // Rate limit check
        const rateLimitResult = await availabilityRatelimit.limit(clientIP);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                {
                    error: 'Too many requests. Please wait before trying again.',
                    retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
                },
                { status: 429 }
            );
        }

        const supabase = createServerSupabaseClient();

        // Get tier metadata from Supabase (price, description, etc.)
        const { data: tiers, error: tiersError } = await supabase
            .from('concert_ticket_inventory')
            .select('tier, price, description, total_tickets, sold_tickets')
            .order('price', { ascending: false });

        if (tiersError) throw tiersError;

        // Get live availability from Redis
        const redisAvailability = await getAllTierAvailability();

        // Combine metadata from Supabase with live counts from Redis
        const availability: TierAvailability[] = (tiers || []).map(tier => {
            const tierKey = tier.tier.toLowerCase();
            // Use Redis count if available, otherwise fall back to Supabase calculation
            const redisCount = redisAvailability[tierKey];
            const available = redisCount !== undefined
                ? redisCount
                : Math.max(0, tier.total_tickets - tier.sold_tickets);

            return {
                tier: tier.tier,
                price: tier.price,
                description: tier.description,
                total: tier.total_tickets,
                available,
                sold: tier.total_tickets - available,
                source: redisCount !== undefined ? 'redis' : 'supabase', // For debugging
            };
        });

        return NextResponse.json({
            success: true,
            tiers: availability,
        });

    } catch (error) {
        console.error('[Tiers] Error fetching tiers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ticket tiers' },
            { status: 500 }
        );
    }
}
