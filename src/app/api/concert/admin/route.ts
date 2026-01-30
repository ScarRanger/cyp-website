import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import {
    getAvailableTickets,
    getAllTierAvailability,
    initializeTierInventory,
    adjustTierInventory,
} from '@/app/lib/concert-redis';

// Valid tiers
const VALID_TIERS = ['silver', 'gold', 'diamond'];

// Default tier config (fallback if Supabase table doesn't exist)
const DEFAULT_TIER_PRICES: Record<string, { name: string; price: number }> = {
    silver: { name: 'Silver', price: 200 },
    gold: { name: 'Gold', price: 500 },
    diamond: { name: 'Diamond', price: 1000 },
};

// GET - Fetch inventory, sales data, and tier configuration
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();

        // Get Redis inventory for all tiers
        const redisInventory = await getAllTierAvailability();

        // Get tier configuration from Supabase
        const { data: tierConfig, error: tierConfigError } = await supabase
            .from('concert_ticket_inventory')
            .select('tier, price, description')
            .order('tier');

        // Build tier prices from DB or defaults
        const tierPrices: Record<string, { name: string; price: number }> = {};
        if (tierConfig && !tierConfigError) {
            tierConfig.forEach((t: { tier: string; price: number; description: string | null }) => {
                tierPrices[t.tier.toLowerCase()] = {
                    name: t.description || DEFAULT_TIER_PRICES[t.tier.toLowerCase()]?.name || t.tier,
                    price: t.price,
                };
            });
        }
        // Fill in missing tiers with defaults
        VALID_TIERS.forEach(tier => {
            if (!tierPrices[tier]) {
                tierPrices[tier] = DEFAULT_TIER_PRICES[tier] || { name: tier, price: 0 };
            }
        });

        // Get sales statistics from Supabase
        const { data: orders, error: ordersError } = await supabase
            .from('concert_orders')
            .select('tier, quantity, status, created_at, paid_at, name, email')
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('[ConcertAdmin] Error fetching orders:', ordersError);
        }

        // Calculate statistics
        const stats = {
            tiers: {} as Record<string, {
                available: number;
                pending: number;
                sold: number;
                revenue: number;
            }>,
            totalSold: 0,
            totalPending: 0,
            totalRevenue: 0,
            recentOrders: [] as typeof orders,
        };

        // Initialize tier stats
        VALID_TIERS.forEach(tier => {
            stats.tiers[tier] = {
                available: redisInventory[tier] || 0,
                pending: 0,
                sold: 0,
                revenue: 0,
            };
        });

        // Process orders
        (orders || []).forEach(order => {
            const tier = order.tier?.toLowerCase();
            if (tier && stats.tiers[tier]) {
                if (order.status === 'paid') {
                    stats.tiers[tier].sold += order.quantity;
                    stats.tiers[tier].revenue += order.quantity * (tierPrices[tier]?.price || 0);
                    stats.totalSold += order.quantity;
                    stats.totalRevenue += order.quantity * (tierPrices[tier]?.price || 0);
                } else if (order.status === 'pending') {
                    stats.tiers[tier].pending += order.quantity;
                    stats.totalPending += order.quantity;
                }
            }
        });

        // Recent orders (last 20)
        stats.recentOrders = (orders || []).slice(0, 20);

        return NextResponse.json({
            success: true,
            stats,
            tierConfig: tierPrices,
            lastUpdated: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[ConcertAdmin] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory data' },
            { status: 500 }
        );
    }
}

// POST - Initialize/adjust inventory or update tier config
export async function POST(request: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();
        const body = await request.json();
        const { action, tier, quantity, name, price } = body;

        // Handle tier configuration updates
        if (action === 'updateTierConfig') {
            if (!tier || !VALID_TIERS.includes(tier.toLowerCase())) {
                return NextResponse.json(
                    { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
                    { status: 400 }
                );
            }

            const normalizedTier = tier.toLowerCase();
            const updates: { description?: string; price?: number } = {};

            if (name !== undefined) {
                updates.description = name;
            }
            if (price !== undefined) {
                if (typeof price !== 'number' || price < 0) {
                    return NextResponse.json(
                        { error: 'Price must be a positive number' },
                        { status: 400 }
                    );
                }
                updates.price = price;
            }

            if (Object.keys(updates).length === 0) {
                return NextResponse.json(
                    { error: 'No updates provided' },
                    { status: 400 }
                );
            }

            // Upsert to Supabase (update if exists, insert if not)
            const { error: upsertError } = await supabase
                .from('concert_ticket_inventory')
                .upsert({
                    tier: normalizedTier,
                    total_tickets: 0, // Default for new rows
                    sold_tickets: 0,  // Default for new rows
                    ...updates,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'tier', ignoreDuplicates: false });

            if (upsertError) {
                console.error('[ConcertAdmin] Error updating tier config:', upsertError);
                throw upsertError;
            }

            return NextResponse.json({
                success: true,
                message: `Tier "${normalizedTier}" configuration updated`,
                tier: normalizedTier,
                updates,
            });
        }

        // Handle inventory actions
        if (!tier || !VALID_TIERS.includes(tier.toLowerCase())) {
            return NextResponse.json(
                { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
                { status: 400 }
            );
        }

        if (typeof quantity !== 'number' || isNaN(quantity)) {
            return NextResponse.json(
                { error: 'Quantity must be a valid number' },
                { status: 400 }
            );
        }

        const normalizedTier = tier.toLowerCase();
        let newCount: number;

        switch (action) {
            case 'initialize':
                // Set inventory to exact value in Redis
                if (quantity < 0) {
                    return NextResponse.json(
                        { error: 'Cannot initialize with negative quantity' },
                        { status: 400 }
                    );
                }
                await initializeTierInventory(normalizedTier, quantity);

                // Also update total_tickets in Supabase for reference
                await supabase
                    .from('concert_ticket_inventory')
                    .upsert({
                        tier: normalizedTier,
                        total_tickets: quantity,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'tier' });

                newCount = quantity;
                break;

            case 'add':
                // Add tickets to Redis inventory
                if (quantity <= 0) {
                    return NextResponse.json(
                        { error: 'Add quantity must be positive' },
                        { status: 400 }
                    );
                }
                newCount = await adjustTierInventory(normalizedTier, quantity);
                break;

            case 'remove':
                // Remove tickets from Redis inventory
                if (quantity <= 0) {
                    return NextResponse.json(
                        { error: 'Remove quantity must be positive' },
                        { status: 400 }
                    );
                }
                const currentCount = await getAvailableTickets(normalizedTier);
                if (quantity > currentCount) {
                    return NextResponse.json(
                        { error: `Cannot remove ${quantity} tickets. Only ${currentCount} available.` },
                        { status: 400 }
                    );
                }
                newCount = await adjustTierInventory(normalizedTier, -quantity);
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Must be: initialize, add, remove, or updateTierConfig' },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            message: `${action} completed successfully`,
            tier: normalizedTier,
            newCount,
            storage: {
                redis: 'Updated (real-time inventory)',
                supabase: action === 'initialize' ? 'Updated (total_tickets reference)' : 'No change',
            },
        });

    } catch (error) {
        console.error('[ConcertAdmin] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update' },
            { status: 500 }
        );
    }
}
