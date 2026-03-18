import { describe, it, expect } from "vitest"
import { timeAgo } from "./time"

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000)
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000)
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

describe("timeAgo", () => {
  it("returns 'just now' for dates less than 60 seconds ago", () => {
    const now = new Date()
    expect(timeAgo(now)).toBe("just now")
    expect(timeAgo(new Date(Date.now() - 30_000))).toBe("just now")
  })

  it("returns minutes for dates less than 60 minutes ago", () => {
    expect(timeAgo(minutesAgo(1))).toBe("1m ago")
    expect(timeAgo(minutesAgo(45))).toBe("45m ago")
  })

  it("returns hours for dates less than 24 hours ago", () => {
    expect(timeAgo(hoursAgo(1))).toBe("1h ago")
    expect(timeAgo(hoursAgo(23))).toBe("23h ago")
  })

  it("returns days for dates less than 30 days ago", () => {
    expect(timeAgo(daysAgo(1))).toBe("1d ago")
    expect(timeAgo(daysAgo(29))).toBe("29d ago")
  })

  it("returns months for dates 30+ days ago", () => {
    expect(timeAgo(daysAgo(30))).toBe("1mo ago")
    expect(timeAgo(daysAgo(90))).toBe("3mo ago")
  })

  describe("compact mode", () => {
    it("omits 'ago' suffix", () => {
      expect(timeAgo(minutesAgo(5), { compact: true })).toBe("5m")
      expect(timeAgo(hoursAgo(3), { compact: true })).toBe("3h")
      expect(timeAgo(daysAgo(7), { compact: true })).toBe("7d")
    })

    it("still returns 'just now' for very recent dates", () => {
      expect(timeAgo(new Date(), { compact: true })).toBe("just now")
    })

    it("returns months without suffix", () => {
      expect(timeAgo(daysAgo(60), { compact: true })).toBe("2mo")
    })
  })
})
