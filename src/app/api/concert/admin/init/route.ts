import { NextRequest, NextResponse } from 'next/server';
import { initializeTierInventory, getAllTierAvailability, adjustTierInventory } from '@/app/lib/concert-redis';

// Admin-only route to initialize or adjust Redis ticket inventory
// In production, add proper authentication

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, tier, count } = body;

        if (!action) {
            return NextResponse.json(
                { error: 'Missing action' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'initialize': {
                // Initialize a tier with a specific count
                if (!tier || typeof count !== 'number') {
                    return NextResponse.json(
                        { error: 'Missing tier or count' },
                        { status: 400 }
                    );
                }

                await initializeTierInventory(tier, count);

                return NextResponse.json({
                    success: true,
                    message: `Initialized ${tier} tier with ${count} tickets`,
                    tier,
                    available: count,
                });
            }

            case 'initialize_all': {
                // Initialize all tiers at once
                const tiers = body.tiers as { tier: string; count: number }[];

                if (!tiers || !Array.isArray(tiers)) {
                    return NextResponse.json(
                        { error: 'Missing tiers array' },
                        { status: 400 }
                    );
                }

                const results = [];
                for (const t of tiers) {
                    await initializeTierInventory(t.tier, t.count);
                    results.push({ tier: t.tier, available: t.count });
                }

                return NextResponse.json({
                    success: true,
                    message: `Initialized ${tiers.length} tiers`,
                    tiers: results,
                });
            }

            case 'adjust': {
                // Adjust a tier by a delta (positive or negative)
                if (!tier || typeof count !== 'number') {
                    return NextResponse.json(
                        { error: 'Missing tier or adjustment count' },
                        { status: 400 }
                    );
                }

                const newCount = await adjustTierInventory(tier, count);

                return NextResponse.json({
                    success: true,
                    message: `Adjusted ${tier} by ${count}`,
                    tier,
                    newAvailable: newCount,
                });
            }

            case 'status': {
                // Get current availability for all tiers
                const availability = await getAllTierAvailability();

                return NextResponse.json({
                    success: true,
                    tiers: availability,
                });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('[Admin/Init] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

// GET to check current status
export async function GET() {
    try {
        const availability = await getAllTierAvailability();

        return NextResponse.json({
            success: true,
            tiers: availability,
        });
    } catch (error) {
        console.error('[Admin/Init] Error getting status:', error);
        return NextResponse.json(
            { error: 'Failed to get status' },
            { status: 500 }
        );
    }
}
