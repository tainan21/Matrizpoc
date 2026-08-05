export interface RateLimitPolicy {
  limit: number
  windowMs: number
}

export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

interface Bucket {
  attempts: number[]
  touchedAt: number
}

const MAX_BUCKETS = 128

export class LocalRateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly now: () => number = Date.now) {}

  consume(key: string, policy: RateLimitPolicy): RateLimitDecision {
    if (!key || policy.limit < 1 || policy.windowMs < 1) {
      throw new Error("Política de rate limit inválida.")
    }
    const timestamp = this.now()
    const threshold = timestamp - policy.windowMs
    const current = this.buckets.get(key)
    const attempts = (current?.attempts ?? []).filter((attempt) => attempt > threshold)

    if (attempts.length >= policy.limit) {
      this.buckets.set(key, { attempts, touchedAt: timestamp })
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((attempts[0] + policy.windowMs - timestamp) / 1_000)),
      }
    }

    attempts.push(timestamp)
    this.buckets.set(key, { attempts, touchedAt: timestamp })
    this.prune(timestamp, policy.windowMs)
    return {
      allowed: true,
      remaining: Math.max(0, policy.limit - attempts.length),
      retryAfterSeconds: 0,
    }
  }

  reset(key: string): void {
    this.buckets.delete(key)
  }

  private prune(timestamp: number, windowMs: number): void {
    if (this.buckets.size <= MAX_BUCKETS) return
    const staleBefore = timestamp - windowMs
    for (const [key, bucket] of this.buckets) {
      if (bucket.touchedAt <= staleBefore) this.buckets.delete(key)
    }
    if (this.buckets.size <= MAX_BUCKETS) return
    const oldest = [...this.buckets.entries()]
      .sort((left, right) => left[1].touchedAt - right[1].touchedAt)
      .slice(0, this.buckets.size - MAX_BUCKETS)
    for (const [key] of oldest) this.buckets.delete(key)
  }
}

const globalLimiter = globalThis as typeof globalThis & {
  __matrizLocalRateLimiter?: LocalRateLimiter
}

export function getLocalRateLimiter(): LocalRateLimiter {
  globalLimiter.__matrizLocalRateLimiter ??= new LocalRateLimiter()
  return globalLimiter.__matrizLocalRateLimiter
}
