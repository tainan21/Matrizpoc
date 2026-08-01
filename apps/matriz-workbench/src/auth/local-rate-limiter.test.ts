import { describe, expect, it } from "vitest"
import { LocalRateLimiter } from "./local-rate-limiter"

describe("LocalRateLimiter", () => {
  it("blocks the first request above the limit and reports retry time", () => {
    let now = 1_000
    const limiter = new LocalRateLimiter(() => now)
    const policy = { limit: 2, windowMs: 10_000 }

    expect(limiter.consume("unlock", policy)).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.consume("unlock", policy)).toMatchObject({ allowed: true, remaining: 0 })
    expect(limiter.consume("unlock", policy)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 10,
    })

    now += 10_001
    expect(limiter.consume("unlock", policy)).toMatchObject({ allowed: true, remaining: 1 })
  })

  it("isolates buckets and can reset a successful authentication", () => {
    const limiter = new LocalRateLimiter(() => 5_000)
    const policy = { limit: 1, windowMs: 60_000 }

    expect(limiter.consume("unlock", policy).allowed).toBe(true)
    expect(limiter.consume("codex-start", policy).allowed).toBe(true)
    expect(limiter.consume("unlock", policy).allowed).toBe(false)
    limiter.reset("unlock")
    expect(limiter.consume("unlock", policy).allowed).toBe(true)
  })

  it("rejects invalid policies instead of silently disabling protection", () => {
    const limiter = new LocalRateLimiter()
    expect(() => limiter.consume("unlock", { limit: 0, windowMs: 1 })).toThrow()
    expect(() => limiter.consume("", { limit: 1, windowMs: 1 })).toThrow()
  })
})
