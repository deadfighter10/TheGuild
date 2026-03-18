import { describe, it, expect } from "vitest"
import {
  calculateStreak,
  generateHeatmapData,
} from "./contribution-stats"

describe("calculateStreak", () => {
  it("returns 0 for empty activity", () => {
    expect(calculateStreak([])).toBe(0)
  })

  it("returns 1 for activity only today", () => {
    const today = new Date()
    expect(calculateStreak([today])).toBe(1)
  })

  it("returns consecutive day count from today backwards", () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    expect(calculateStreak([today, yesterday, twoDaysAgo])).toBe(3)
  })

  it("stops counting at gaps", () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    expect(calculateStreak([today, yesterday, threeDaysAgo])).toBe(2)
  })

  it("returns 0 if no activity today or yesterday", () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    expect(calculateStreak([threeDaysAgo])).toBe(0)
  })

  it("counts streak starting from yesterday if no activity today", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    expect(calculateStreak([yesterday, twoDaysAgo])).toBe(2)
  })

  it("handles multiple activities on the same day", () => {
    const today = new Date()
    const alsoToday = new Date(today)
    alsoToday.setHours(today.getHours() - 2)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    expect(calculateStreak([today, alsoToday, yesterday])).toBe(2)
  })
})

describe("generateHeatmapData", () => {
  it("returns 365 days of data", () => {
    const result = generateHeatmapData([])
    expect(result).toHaveLength(365)
  })

  it("all days have 0 count when no activity", () => {
    const result = generateHeatmapData([])
    expect(result.every((d) => d.count === 0)).toBe(true)
  })

  it("counts contributions per day", () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const result = generateHeatmapData([today, today, today])
    const todayData = result.find((d) => d.date === todayStr)
    expect(todayData?.count).toBe(3)
  })

  it("each entry has date and count", () => {
    const result = generateHeatmapData([])
    for (const day of result) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(typeof day.count).toBe("number")
    }
  })
})
