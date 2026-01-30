import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Headers Middleware
 * Adds security headers to all responses to protect against common web vulnerabilities
 */
export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Security Headers
    const securityHeaders = {
        // Prevent clickjacking attacks
        'X-Frame-Options': 'DENY',

        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',

        // Control referrer information
        'Referrer-Policy': 'strict-origin-when-cross-origin',

        // Prevent XSS attacks (legacy, CSP is more robust)
        'X-XSS-Protection': '1; mode=block',

        // DNS prefetch control
        'X-DNS-Prefetch-Control': 'on',

        // Permissions Policy (replaces Feature-Policy)
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',

        // Content Security Policy - Balanced for functionality
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com https://apis.google.com https://accounts.google.com https://*.firebaseapp.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https: wss:",
            "media-src 'self' https: blob:",
            "frame-src 'self' https://www.youtube.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self' https://accounts.google.com",
        ].join('; '),
    };

    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes that need different headers
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
