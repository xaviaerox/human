// Simple sliding window in-memory rate limiter for Next.js Route Handlers
interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const trackerStore = new Map<string, RateLimitTracker>();

/**
 * Rate limits requests per key (e.g. IP address or User ID).
 * @param key Unique identifier for the requester
 * @param maxRequests Max requests allowed within the window
 * @param windowMs Window duration in milliseconds (default 60000ms = 1 minute)
 * @returns { success: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = trackerStore.get(key);

  if (!entry || now > entry.resetAt) {
    trackerStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= maxRequests) {
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, remaining: 0, resetInSeconds };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}
