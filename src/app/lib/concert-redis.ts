import { redis } from './redis';

// Redis key prefixes for concert tickets
const AVAILABLE_KEY_PREFIX = 'tickets:available:';
const RESERVED_KEY_PREFIX = 'tickets:reserved:';

/**
 * Lua script for atomic ticket reservation
 * Returns new available count on success, -1 if insufficient tickets
 */
const RESERVE_TICKETS_LUA = `
local available = tonumber(redis.call('GET', KEYS[1]) or '0')
local requested = tonumber(ARGV[1])

if available >= requested then
  redis.call('DECRBY', KEYS[1], requested)
  return available - requested
else
  return -1
end
`;

/**
 * Lua script for atomic ticket release (rollback)
 * Always succeeds, returns new available count
 */
const RELEASE_TICKETS_LUA = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local toRelease = tonumber(ARGV[1])
redis.call('INCRBY', KEYS[1], toRelease)
return current + toRelease
`;

/**
 * Get the Redis key for a tier's available tickets
 */
export function getAvailableKey(tier: string): string {
    return `${AVAILABLE_KEY_PREFIX}${tier.toLowerCase()}`;
}

/**
 * Get the Redis key for a checkout's reserved tickets
 */
export function getReservedKey(checkoutId: string): string {
    return `${RESERVED_KEY_PREFIX}${checkoutId}`;
}

/**
 * Get current available tickets for a tier
 */
export async function getAvailableTickets(tier: string): Promise<number> {
    try {
        const key = getAvailableKey(tier);
        const count = await redis.get<number>(key);
        return count ?? 0;
    } catch (error) {
        console.error(`[ConcertRedis] Error getting available tickets for ${tier}:`, error);
        return 0;
    }
}

/**
 * Get available tickets for all tiers
 */
export async function getAllTierAvailability(): Promise<Record<string, number>> {
    try {
        // Assuming standard tiers - adjust as needed
        const tiers = ['silver', 'gold', 'diamond'];
        const keys = tiers.map(getAvailableKey);
        const values = await redis.mget<(number | null)[]>(...keys);

        const result: Record<string, number> = {};
        tiers.forEach((tier, i) => {
            result[tier] = values[i] ?? 0;
        });
        return result;
    } catch (error) {
        console.error('[ConcertRedis] Error getting all tier availability:', error);
        return {};
    }
}

/**
 * Atomically reserve tickets for a tier
 * Returns { success: true, newAvailable } on success
 * Returns { success: false, available } on insufficient tickets
 */
export async function reserveTicketsAtomic(
    tier: string,
    quantity: number
): Promise<{ success: boolean; available: number }> {
    try {
        const key = getAvailableKey(tier);

        // Execute Lua script atomically
        const result = await redis.eval(
            RESERVE_TICKETS_LUA,
            [key],
            [quantity.toString()]
        ) as number;

        if (result === -1) {
            // Insufficient tickets - get current count
            const current = await getAvailableTickets(tier);
            return { success: false, available: current };
        }

        return { success: true, available: result };
    } catch (error) {
        console.error(`[ConcertRedis] Error reserving tickets for ${tier}:`, error);
        throw error;
    }
}

/**
 * Release tickets back to a tier (for rollback/cancellation)
 * Returns new available count
 */
export async function releaseTickets(
    tier: string,
    quantity: number
): Promise<number> {
    try {
        const key = getAvailableKey(tier);

        const result = await redis.eval(
            RELEASE_TICKETS_LUA,
            [key],
            [quantity.toString()]
        ) as number;

        return result;
    } catch (error) {
        console.error(`[ConcertRedis] Error releasing tickets for ${tier}:`, error);
        throw error;
    }
}

/**
 * Store reservation metadata (for tracking pending checkouts)
 */
export async function storeReservation(
    checkoutId: string,
    data: { tier: string; quantity: number; createdAt: string }
): Promise<void> {
    try {
        const key = getReservedKey(checkoutId);
        // Store with 15 min TTL (slightly longer than rollback timer)
        await redis.hset(key, data);
        await redis.expire(key, 15 * 60);
    } catch (error) {
        console.error(`[ConcertRedis] Error storing reservation ${checkoutId}:`, error);
        throw error;
    }
}

/**
 * Get reservation metadata
 */
export async function getReservation(
    checkoutId: string
): Promise<{ tier: string; quantity: number; createdAt: string } | null> {
    try {
        const key = getReservedKey(checkoutId);
        const data = await redis.hgetall<{ tier: string; quantity: string; createdAt: string }>(key);

        if (!data || !data.tier) return null;

        return {
            tier: data.tier,
            quantity: parseInt(data.quantity, 10),
            createdAt: data.createdAt,
        };
    } catch (error) {
        console.error(`[ConcertRedis] Error getting reservation ${checkoutId}:`, error);
        return null;
    }
}

/**
 * Delete reservation metadata
 */
export async function deleteReservation(checkoutId: string): Promise<void> {
    try {
        const key = getReservedKey(checkoutId);
        await redis.del(key);
    } catch (error) {
        console.error(`[ConcertRedis] Error deleting reservation ${checkoutId}:`, error);
    }
}

/**
 * Initialize tier inventory (admin use only)
 * Sets the available ticket count for a tier
 */
export async function initializeTierInventory(
    tier: string,
    totalTickets: number
): Promise<void> {
    try {
        const key = getAvailableKey(tier);
        await redis.set(key, totalTickets);
        console.log(`[ConcertRedis] Initialized ${tier} with ${totalTickets} tickets`);
    } catch (error) {
        console.error(`[ConcertRedis] Error initializing ${tier} inventory:`, error);
        throw error;
    }
}

/**
 * Adjust tier inventory (admin use - for corrections)
 */
export async function adjustTierInventory(
    tier: string,
    adjustment: number
): Promise<number> {
    try {
        const key = getAvailableKey(tier);
        const newCount = await redis.incrby(key, adjustment);
        console.log(`[ConcertRedis] Adjusted ${tier} by ${adjustment}, new count: ${newCount}`);
        return newCount;
    } catch (error) {
        console.error(`[ConcertRedis] Error adjusting ${tier} inventory:`, error);
        throw error;
    }
}
