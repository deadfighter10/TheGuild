import { describe, it, expect } from "vitest"
import { isWithinRateLimit, RATE_LIMITS } from "./rate-limit"

function timestampsAgo(count: number, intervalMs: number): Date[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => new Date(now - i * intervalMs))
}

const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE

describe("isWithinRateLimit boundary tests", () => {
  describe("nodes (10/hour, 30/day)", () => {
    it("allows at exactly 9 in the last hour", () => {
      const timestamps = timestampsAgo(9, ONE_MINUTE)
      expect(isWithinRateLimit("nodes", timestamps)).toEqual({ allowed: true })
    })

    it("blocks at exactly 10 in the last hour", () => {
      const timestamps = timestampsAgo(10, ONE_MINUTE)
      const result = isWithinRateLimit("nodes", timestamps)
      expect(result.allowed).toBe(false)
    })

    it("allows at exactly 29 in the last day", () => {
      const timestamps = timestampsAgo(29, 30 * ONE_MINUTE)
      expect(isWithinRateLimit("nodes", timestamps)).toEqual({ allowed: true })
    })

    it("blocks at exactly 30 in the last day", () => {
      const timestamps = timestampsAgo(30, 30 * ONE_MINUTE)
      const result = isWithinRateLimit("nodes", timestamps)
      expect(result.allowed).toBe(false)
    })

    it("allows after timestamps expire beyond 1 hour", () => {
      const oldTimestamps = [new Date(Date.now() - ONE_HOUR - 1000)]
      expect(isWithinRateLimit("nodes", oldTimestamps)).toEqual({ allowed: true })
    })
  })

  describe("discussionReplies (30/hour, 100/day)", () => {
    it("allows at exactly 29 in the last hour", () => {
      const timestamps = timestampsAgo(29, ONE_MINUTE)
      expect(isWithinRateLimit("discussionReplies", timestamps)).toEqual({ allowed: true })
    })

    it("blocks at exactly 30 in the last hour", () => {
      const timestamps = timestampsAgo(30, ONE_MINUTE)
      const result = isWithinRateLimit("discussionReplies", timestamps)
      expect(result.allowed).toBe(false)
    })
  })

  describe("libraryEntries (3/hour, 10/day)", () => {
    it("allows at exactly 2 in the last hour", () => {
      const timestamps = timestampsAgo(2, ONE_MINUTE)
      expect(isWithinRateLimit("libraryEntries", timestamps)).toEqual({ allowed: true })
    })

    it("blocks at exactly 3 in the last hour", () => {
      const timestamps = timestampsAgo(3, ONE_MINUTE)
      const result = isWithinRateLimit("libraryEntries", timestamps)
      expect(result.allowed).toBe(false)
    })

    it("blocks at exactly 10 in the last day", () => {
      const timestamps = timestampsAgo(10, 30 * ONE_MINUTE)
      const result = isWithinRateLimit("libraryEntries", timestamps)
      expect(result.allowed).toBe(false)
    })
  })

  describe("unknown collection (no limits)", () => {
    it("always allows unknown collection names", () => {
      const timestamps = timestampsAgo(1000, 1000)
      expect(isWithinRateLimit("unknownCollection", timestamps)).toEqual({ allowed: true })
    })
  })

  describe("empty timestamps", () => {
    it("allows when no prior timestamps exist", () => {
      expect(isWithinRateLimit("nodes", [])).toEqual({ allowed: true })
    })
  })

  describe("daily limit takes precedence over hourly when both hit", () => {
    it("reports daily reason when both limits exceeded", () => {
      const timestamps = timestampsAgo(30, ONE_MINUTE)
      const result = isWithinRateLimit("nodes", timestamps)
      expect(result.allowed).toBe(false)
      if (!result.allowed) {
        expect(result.reason).toContain("Daily limit")
      }
    })
  })

  describe("RATE_LIMITS config integrity", () => {
    it("has expected collections configured", () => {
      expect(RATE_LIMITS).toHaveProperty("nodes")
      expect(RATE_LIMITS).toHaveProperty("discussionThreads")
      expect(RATE_LIMITS).toHaveProperty("discussionReplies")
      expect(RATE_LIMITS).toHaveProperty("newsLinks")
      expect(RATE_LIMITS).toHaveProperty("libraryEntries")
      expect(RATE_LIMITS).toHaveProperty("flags")
      expect(RATE_LIMITS).toHaveProperty("peerReviews")
    })

    it("all limits have positive perHour and perDay", () => {
      for (const [name, config] of Object.entries(RATE_LIMITS)) {
        expect(config.perHour, `${name}.perHour`).toBeGreaterThan(0)
        expect(config.perDay, `${name}.perDay`).toBeGreaterThan(0)
        expect(config.perDay, `${name}.perDay >= perHour`).toBeGreaterThanOrEqual(config.perHour)
      }
    })
  })
})
