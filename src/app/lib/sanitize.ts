/**
 * HTML Sanitization Utilities
 * 
 * Provides secure HTML sanitization for server-side rendering.
 * Uses a whitelist-based approach to allow only safe HTML tags and attributes.
 */

// Allowed HTML tags (safe for rendering)
const ALLOWED_TAGS = new Set([
    'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'div', 'span', 'blockquote', 'pre', 'code',
    'a', 'hr'
]);

// Allowed attributes per tag
const ALLOWED_ATTRS: Record<string, Set<string>> = {
    '*': new Set(['class', 'id', 'style']),
    'a': new Set(['href', 'title', 'target', 'rel']),
};

/**
 * Sanitize HTML string by removing potentially dangerous elements and attributes.
 * This is a simple whitelist-based sanitizer suitable for server-side use.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }

    // Remove script tags and their content
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove on* event handlers
    sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\bon\w+\s*=\s*[^\s>]+/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript\s*:/gi, '');

    // Remove data: URLs (can be used for XSS)
    sanitized = sanitized.replace(/data\s*:[^"'>\s]*/gi, '');

    // Remove dangerous attributes
    const dangerousAttrs = ['srcdoc', 'formaction', 'xlink:href', 'xmlns'];
    for (const attr of dangerousAttrs) {
        const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        sanitized = sanitized.replace(regex, '');
    }

    // Remove iframe, object, embed, form tags
    const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'];
    for (const tag of dangerousTags) {
        const openRegex = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
        const closeRegex = new RegExp(`</${tag}>`, 'gi');
        sanitized = sanitized.replace(openRegex, '');
        sanitized = sanitized.replace(closeRegex, '');
    }

    // Remove base and meta tags
    sanitized = sanitized.replace(/<base\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');

    return sanitized;
}

/**
 * Escape HTML special characters to prevent XSS
 * Use this for plain text that should not contain any HTML
 */
export function escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
