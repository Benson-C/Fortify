/**
 * Simple in-memory rate limiting utility
 * 
 * NOTE: For production, consider using:
 * - Vercel Edge Config
 * - Redis
 * - Upstash Rate Limit
 * - Cloudflare Rate Limiting
 * 
 * This is a basic implementation for development/testing.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., IP address, user ID, email)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false if allowed
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // No entry or expired - create new entry
    const resetAt = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });

    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
      for (const [k, e] of rateLimitStore.entries()) {
        if (now > e.resetAt) {
          rateLimitStore.delete(k);
        }
      }
    }

    return {
      limited: false,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Entry exists and is valid
  if (entry.count >= maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Try various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (won't work in serverless, but useful for local dev)
  return 'unknown';
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Registration: 3 attempts per 15 minutes per IP
  registration: { maxRequests: 3, windowMs: 15 * 60 * 1000 },
  
  // Login: 5 attempts per 15 minutes per IP
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  
  // Email resend: 3 attempts per hour per email
  emailResend: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  
  // General API: 100 requests per minute per IP
  api: { maxRequests: 100, windowMs: 60 * 1000 },
} as const;
