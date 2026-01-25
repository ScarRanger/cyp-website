import { Redis } from "@upstash/redis";

// Initialize Redis client using environment variables
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are automatically used
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const VIEW_COUNT_PREFIX = "views:";

/**
 * Get the Redis key for a talk's view count
 */
function getViewKey(talkKey: string): string {
    return `${VIEW_COUNT_PREFIX}${talkKey}`;
}

/**
 * Increment the view count for a talk
 * Returns the new view count
 */
export async function incrementViewCount(talkKey: string): Promise<number> {
    try {
        const key = getViewKey(talkKey);
        const newCount = await redis.incr(key);
        return newCount;
    } catch (error) {
        console.error("Error incrementing view count:", error);
        return 0;
    }
}

/**
 * Get the view count for a single talk
 */
export async function getViewCount(talkKey: string): Promise<number> {
    try {
        const key = getViewKey(talkKey);
        const count = await redis.get<number>(key);
        return count || 0;
    } catch (error) {
        console.error("Error getting view count:", error);
        return 0;
    }
}

/**
 * Get view counts for multiple talks in a single batch request
 * Returns a map of talkKey -> viewCount
 */
export async function getViewCounts(
    talkKeys: string[]
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (talkKeys.length === 0) {
        return result;
    }

    try {
        const keys = talkKeys.map(getViewKey);
        const counts = await redis.mget<(number | null)[]>(...keys);

        talkKeys.forEach((talkKey, index) => {
            result.set(talkKey, counts[index] || 0);
        });
    } catch (error) {
        console.error("Error getting view counts:", error);
        // Return zeros for all keys on error
        talkKeys.forEach((talkKey) => {
            result.set(talkKey, 0);
        });
    }

    return result;
}

export { redis };
