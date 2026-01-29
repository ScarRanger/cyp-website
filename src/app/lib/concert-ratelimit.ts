import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

/**
 * Rate limiter for checking ticket availability
 * 30 requests per minute per IP
 */
export const availabilityRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'ratelimit:concert:availability',
    analytics: true,
});

/**
 * Rate limiter for ticket reservation attempts
 * 5 requests per minute per IP
 */
export const reservationRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'ratelimit:concert:reserve',
    analytics: true,
});

/**
 * Rate limiter for checkout attempts
 * 3 requests per 5 minutes per session
 */
export const checkoutRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '5 m'),
    prefix: 'ratelimit:concert:checkout',
    analytics: true,
});

/**
 * Rate limiter for order submissions
 * 2 requests per 10 minutes per IP
 */
export const orderRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '10 m'),
    prefix: 'ratelimit:concert:order',
    analytics: true,
});

/**
 * Check rate limit and return result
 */
export async function checkRateLimit(
    limiter: Ratelimit,
    identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
    const result = await limiter.limit(identifier);
    return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
    };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnecting = request.headers.get('cf-connecting-ip');

    if (cfConnecting) return cfConnecting;
    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIp) return realIp;

    return 'unknown';
}
