import { describe, it, expect } from "vitest"
import {
  getDateRangeStart,
  dateToKey,
  groupByDate,
  TIME_RANGES,
} from "./analytics"

describe("TIME_RANGES", () => {
  it("defines 4 time ranges", () => {
    expect(TIME_RANGES).toHaveLength(4)
  })

  it("has unique values", () => {
    const values = TIME_RANGES.map((t) => t.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it("includes 7d, 30d, 90d, and all", () => {
    const values = TIME_RANGES.map((t) => t.value)
    expect(values).toContain("7d")
    expect(values).toContain("30d")
    expect(values).toContain("90d")
    expect(values).toContain("all")
  })
})

describe("getDateRangeStart", () => {
  it("returns a date 7 days ago for 7d", () => {
    const now = new Date()
    const start = getDateRangeStart("7d")
    const diffMs = now.getTime() - start.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(7)
  })

  it("returns a date 30 days ago for 30d", () => {
    const now = new Date()
    const start = getDateRangeStart("30d")
    const diffMs = now.getTime() - start.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(30)
  })

  it("returns a date 90 days ago for 90d", () => {
    const now = new Date()
    const start = getDateRangeStart("90d")
    const diffMs = now.getTime() - start.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(90)
  })

  it("returns a very old date for all", () => {
    const start = getDateRangeStart("all")
    expect(start.getFullYear()).toBeLessThanOrEqual(2020)
  })
})

describe("dateToKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 2, 18)
    expect(dateToKey(date)).toBe("2026-03-18")
  })

  it("zero-pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5)
    expect(dateToKey(date)).toBe("2026-01-05")
  })
})

describe("groupByDate", () => {
  it("returns empty map for empty array", () => {
    const result = groupByDate([])
    expect(result.size).toBe(0)
  })

  it("groups dates by day", () => {
    const d1 = new Date(2026, 2, 18, 10, 0)
    const d2 = new Date(2026, 2, 18, 14, 0)
    const d3 = new Date(2026, 2, 19, 9, 0)

    const result = groupByDate([d1, d2, d3])
    expect(result.get("2026-03-18")).toBe(2)
    expect(result.get("2026-03-19")).toBe(1)
  })

  it("counts correctly across different days", () => {
    const dates = [
      new Date(2026, 0, 1),
      new Date(2026, 0, 1),
      new Date(2026, 0, 1),
      new Date(2026, 0, 2),
    ]
    const result = groupByDate(dates)
    expect(result.get("2026-01-01")).toBe(3)
    expect(result.get("2026-01-02")).toBe(1)
  })
})
