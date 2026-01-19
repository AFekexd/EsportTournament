import type { Request } from 'express';

/**
 * Get the real client IP address from a request
 * This properly handles X-Forwarded-For headers from reverse proxies (nginx, Docker, etc.)
 */
export function getClientIp(req: Request): string {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first one is the original client
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0];
        return ips.trim();
    }

    // X-Real-IP is sometimes set by nginx
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to Express's ip (which uses trust proxy if set)
    return req.ip || req.socket?.remoteAddress || 'unknown';
}
