import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase';
import {
    initializeTierInventory,
    adjustTierInventory,
    getAvailableTickets,
    getAllTierAvailability,
} from '@/app/lib/concert-redis';

// Valid tiers (lowercase for consistency)
const VALID_TIERS = ['silver', 'gold', 'diamond'];

// Capitalize tier name for display
function capitalizeTier(tier: string): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

// GET - Fetch inventory, sales data, and tier configuration
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();

        // Get Redis inventory for real-time availability (admin view)
        const redisInventory = await getAllTierAvailability();

        // Get tier configuration from Supabase
        const { data: tierData, error: tierError } = await supabase
            .from('concert_ticket_inventory')
            .select('tier, price, description, total_tickets, sold_tickets')
            .order('tier');

        if (tierError) {
            console.error('[ConcertAdmin] Error fetching tier data:', tierError);
        }

        // Build tier prices from Supabase
        const tierPrices: Record<string, { name: string; price: number }> = {};
        const tierInventory: Record<string, { total: number; sold: number }> = {};

        if (tierData) {
            tierData.forEach((t) => {
                const normalizedTier = t.tier.toLowerCase();
                tierPrices[normalizedTier] = {
                    name: t.description || capitalizeTier(t.tier),
                    price: t.price || 0,
                };
                tierInventory[normalizedTier] = {
                    total: t.total_tickets || 0,
                    sold: t.sold_tickets || 0,
                };
            });
        }

        // Fill in missing tiers with placeholder values
        VALID_TIERS.forEach(tier => {
            if (!tierPrices[tier]) {
                tierPrices[tier] = { name: capitalizeTier(tier), price: 0 };
            }
            if (!tierInventory[tier]) {
                tierInventory[tier] = { total: 0, sold: 0 };
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
                total: number;
            }>,
            totalSold: 0,
            totalPending: 0,
            totalRevenue: 0,
            recentOrders: [] as typeof orders,
        };

        // Initialize tier stats - use Redis for available count (real-time)
        VALID_TIERS.forEach(tier => {
            const inv = tierInventory[tier];
            // Redis has the real-time available count
            const redisAvailable = redisInventory[tier] ?? 0;
            stats.tiers[tier] = {
                available: redisAvailable,
                total: inv.total,
                pending: 0,
                sold: inv.sold,
                revenue: inv.sold * (tierPrices[tier]?.price || 0),
            };
        });

        // Process orders to calculate pending count
        (orders || []).forEach(order => {
            const tier = order.tier?.toLowerCase();
            if (tier && stats.tiers[tier]) {
                if (order.status === 'pending') {
                    stats.tiers[tier].pending += order.quantity;
                    stats.totalPending += order.quantity;
                }
            }
        });

        // Calculate totals
        VALID_TIERS.forEach(tier => {
            stats.totalSold += stats.tiers[tier].sold;
            stats.totalRevenue += stats.tiers[tier].revenue;
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

        // Handle Redis sync action
        if (action === 'syncRedis') {
            const targetTier = tier?.toLowerCase();

            // Get inventory from Supabase
            const { data: tiers, error: tierError } = await supabase
                .from('concert_ticket_inventory')
                .select('tier, total_tickets, sold_tickets');

            if (tierError) throw tierError;

            const results: { tier: string; before: number; after: number; expected: number }[] = [];

            for (const t of (tiers || [])) {
                const normalizedTier = t.tier.toLowerCase();

                // Skip if a specific tier was requested and this isn't it
                if (targetTier && normalizedTier !== targetTier) continue;

                const expected = (t.total_tickets || 0) - (t.sold_tickets || 0);
                const currentRedis = await getAvailableTickets(normalizedTier);

                if (currentRedis !== expected) {
                    await initializeTierInventory(normalizedTier, expected);
                    results.push({
                        tier: normalizedTier,
                        before: currentRedis,
                        after: expected,
                        expected,
                    });
                    console.log(`[ConcertAdmin] Synced ${normalizedTier}: ${currentRedis} → ${expected}`);
                }
            }

            return NextResponse.json({
                success: true,
                message: results.length > 0
                    ? `Synced ${results.length} tier(s)`
                    : 'All tiers already in sync',
                synced: results,
            });
        }

        // Handle tier configuration updates
        if (action === 'updateTierConfig') {
            if (!tier || !VALID_TIERS.includes(tier.toLowerCase())) {
                return NextResponse.json(
                    { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
                    { status: 400 }
                );
            }

            const normalizedTier = tier.toLowerCase();
            const updates: { description?: string; price?: number; updated_at: string } = {
                updated_at: new Date().toISOString(),
            };

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

            if (Object.keys(updates).length === 1) {
                return NextResponse.json(
                    { error: 'No updates provided' },
                    { status: 400 }
                );
            }

            // Update in Supabase
            const { error: updateError } = await supabase
                .from('concert_ticket_inventory')
                .update(updates)
                .eq('tier', normalizedTier);

            if (updateError) {
                // If update fails (row doesn't exist), try insert
                const { error: insertError } = await supabase
                    .from('concert_ticket_inventory')
                    .insert({
                        tier: normalizedTier,
                        total_tickets: 0,
                        sold_tickets: 0,
                        price: price || 0,
                        description: name || capitalizeTier(normalizedTier),
                        updated_at: new Date().toISOString(),
                    });

                if (insertError) {
                    console.error('[ConcertAdmin] Error updating tier config:', insertError);
                    throw insertError;
                }
            }

            return NextResponse.json({
                success: true,
                message: `Tier "${capitalizeTier(normalizedTier)}" configuration updated`,
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

        // Get current inventory from Supabase
        const { data: currentData } = await supabase
            .from('concert_ticket_inventory')
            .select('total_tickets, sold_tickets, price, description')
            .eq('tier', normalizedTier)
            .single();

        const rowExists = !!currentData;
        const currentTotal = currentData?.total_tickets || 0;
        const currentSold = currentData?.sold_tickets || 0;
        let newTotal: number;
        let newAvailable: number;

        switch (action) {
            case 'initialize':
                // Set inventory to exact value
                if (quantity < 0) {
                    return NextResponse.json(
                        { error: 'Cannot initialize with negative quantity' },
                        { status: 400 }
                    );
                }

                // Update or insert in Supabase
                if (rowExists) {
                    const { error: updateError } = await supabase
                        .from('concert_ticket_inventory')
                        .update({
                            total_tickets: quantity,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('tier', normalizedTier);
                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('concert_ticket_inventory')
                        .insert({
                            tier: normalizedTier,
                            total_tickets: quantity,
                            sold_tickets: 0,
                            price: 0,
                            description: capitalizeTier(normalizedTier),
                            updated_at: new Date().toISOString(),
                        });
                    if (insertError) throw insertError;
                }

                // Sync Redis with available count (total - sold)
                newAvailable = quantity - currentSold;
                await initializeTierInventory(normalizedTier, newAvailable);
                newTotal = quantity;
                break;

            case 'add':
                // Add tickets to inventory
                if (quantity <= 0) {
                    return NextResponse.json(
                        { error: 'Add quantity must be positive' },
                        { status: 400 }
                    );
                }

                newTotal = currentTotal + quantity;

                // Update or insert in Supabase
                if (rowExists) {
                    const { error: updateError } = await supabase
                        .from('concert_ticket_inventory')
                        .update({
                            total_tickets: newTotal,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('tier', normalizedTier);
                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('concert_ticket_inventory')
                        .insert({
                            tier: normalizedTier,
                            total_tickets: newTotal,
                            sold_tickets: 0,
                            price: 0,
                            description: capitalizeTier(normalizedTier),
                            updated_at: new Date().toISOString(),
                        });
                    if (insertError) throw insertError;
                }

                // Add to Redis as well
                newAvailable = await adjustTierInventory(normalizedTier, quantity);
                break;

            case 'remove':
                // Remove tickets from inventory
                if (quantity <= 0) {
                    return NextResponse.json(
                        { error: 'Remove quantity must be positive' },
                        { status: 400 }
                    );
                }

                // Check Redis for actual available count
                const redisAvailable = await getAvailableTickets(normalizedTier);
                if (quantity > redisAvailable) {
                    return NextResponse.json(
                        { error: `Cannot remove ${quantity} tickets. Only ${redisAvailable} available in Redis.` },
                        { status: 400 }
                    );
                }

                newTotal = currentTotal - quantity;

                // Update Supabase
                const { error: removeError } = await supabase
                    .from('concert_ticket_inventory')
                    .update({
                        total_tickets: newTotal,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('tier', normalizedTier);

                if (removeError) throw removeError;

                // Remove from Redis as well
                newAvailable = await adjustTierInventory(normalizedTier, -quantity);
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
            newCount: newAvailable!,
            newTotal: newTotal!,
            storage: {
                redis: 'Updated',
                supabase: 'Updated',
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
