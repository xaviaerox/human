/**
 * Rate Limiter for MIRA API endpoints.
 * Supports Upstash Redis REST API when configured,
 * with a zero-config in-memory sliding-window fallback for local development.
 */

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

interface MemoryBucket {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryBucket>();

// Periodic memory cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      bucket.timestamps = bucket.timestamps.filter(t => now - t < 60000);
      if (bucket.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export async function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const key = `ratelimit:${identifier}`;
      const now = Date.now();
      const clearBefore = now - windowMs;

      // Pipeline Redis commands via REST API: ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE
      const pipelineRes = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', key, 0, clearBefore],
          ['ZADD', key, now, `${now}-${Math.random()}`],
          ['ZCARD', key],
          ['EXPIRE', key, Math.ceil(windowMs / 1000)],
        ]),
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const currentCount = results[2]?.result ?? 1;
        const success = currentCount <= maxRequests;
        return {
          success,
          remaining: Math.max(0, maxRequests - currentCount),
          resetMs: now + windowMs,
        };
      }
    } catch (err) {
      console.warn('[RateLimiter] Redis rate limit check failed, falling back to in-memory:', err);
    }
  }

  // Fallback: In-memory sliding window
  const now = Date.now();
  let bucket = memoryStore.get(identifier);

  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(identifier, bucket);
  }

  // Remove timestamps outside window
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] || now;
    return {
      success: false,
      remaining: 0,
      resetMs: oldest + windowMs,
    };
  }

  bucket.timestamps.push(now);
  return {
    success: true,
    remaining: maxRequests - bucket.timestamps.length,
    resetMs: now + windowMs,
  };
}
