import { describe, it, expect } from "vitest"
import { isWithinRateLimit, RATE_LIMITS } from "./rate-limit"

describe("RATE_LIMITS", () => {
  it("defines limits for all content collections", () => {
    expect(RATE_LIMITS["nodes"]).toBeDefined()
    expect(RATE_LIMITS["discussionThreads"]).toBeDefined()
    expect(RATE_LIMITS["discussionReplies"]).toBeDefined()
    expect(RATE_LIMITS["newsLinks"]).toBeDefined()
    expect(RATE_LIMITS["libraryEntries"]).toBeDefined()
    expect(RATE_LIMITS["flags"]).toBeDefined()
  })

  it("has hourly and daily limits for each collection", () => {
    for (const limits of Object.values(RATE_LIMITS)) {
      expect(limits.perHour).toBeGreaterThan(0)
      expect(limits.perDay).toBeGreaterThan(0)
      expect(limits.perDay).toBeGreaterThanOrEqual(limits.perHour)
    }
  })
})

describe("isWithinRateLimit", () => {
  it("allows writes when no previous timestamps exist", () => {
    const result = isWithinRateLimit("nodes", [])
    expect(result).toEqual({ allowed: true })
  })

  it("allows writes below hourly limit", () => {
    const now = Date.now()
    const timestamps = Array.from({ length: 5 }, (_, i) =>
      new Date(now - (i + 1) * 60_000),
    )
    const result = isWithinRateLimit("nodes", timestamps)
    expect(result).toEqual({ allowed: true })
  })

  it("blocks writes at hourly limit", () => {
    const now = Date.now()
    const hourlyLimit = RATE_LIMITS["nodes"]?.perHour ?? 10
    const timestamps = Array.from({ length: hourlyLimit }, (_, i) =>
      new Date(now - i * 60_000),
    )
    const result = isWithinRateLimit("nodes", timestamps)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toContain("hour")
    }
  })

  it("blocks writes at daily limit", () => {
    const now = Date.now()
    const dailyLimit = RATE_LIMITS["nodes"]?.perDay ?? 30
    const timestamps = Array.from({ length: dailyLimit }, (_, i) =>
      new Date(now - i * 120_000),
    )
    const result = isWithinRateLimit("nodes", timestamps)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toContain("day")
    }
  })

  it("does not count timestamps older than 24 hours", () => {
    const now = Date.now()
    const oldTimestamps = Array.from({ length: 50 }, (_, i) =>
      new Date(now - 25 * 60 * 60_000 - i * 1000),
    )
    const result = isWithinRateLimit("nodes", oldTimestamps)
    expect(result).toEqual({ allowed: true })
  })

  it("uses per-collection limits", () => {
    const now = Date.now()
    const timestamps = Array.from({ length: 4 }, (_, i) =>
      new Date(now - i * 60_000),
    )
    const libraryResult = isWithinRateLimit("libraryEntries", timestamps)
    expect(libraryResult.allowed).toBe(false)

    const repliesResult = isWithinRateLimit("discussionReplies", timestamps)
    expect(repliesResult.allowed).toBe(true)
  })
})
