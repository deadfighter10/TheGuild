import { describe, it, expect } from "vitest"
import {
  validateNomination,
  canNominate,
  spotlightWeekId,
} from "./spotlight"

describe("validateNomination", () => {
  it("returns valid for a moderator nominating content", () => {
    const result = validateNomination({
      nominatorRep: 3000,
      nominatorRole: "user",
      nominatorId: "mod-1",
      authorId: "user-1",
      contentTitle: "Great Idea",
      hasExistingNomination: false,
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows admin to nominate regardless of rep", () => {
    const result = validateNomination({
      nominatorRep: 0,
      nominatorRole: "admin",
      nominatorId: "admin-1",
      authorId: "user-1",
      contentTitle: "Great Idea",
      hasExistingNomination: false,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when nominator has insufficient rep", () => {
    const result = validateNomination({
      nominatorRep: 2999,
      nominatorRole: "user",
      nominatorId: "user-1",
      authorId: "user-2",
      contentTitle: "Great Idea",
      hasExistingNomination: false,
    })
    expect(result).toEqual({ valid: false, reason: "You need at least 3000 Rep to nominate content" })
  })

  it("rejects self-nomination", () => {
    const result = validateNomination({
      nominatorRep: 3000,
      nominatorRole: "user",
      nominatorId: "user-1",
      authorId: "user-1",
      contentTitle: "My Idea",
      hasExistingNomination: false,
    })
    expect(result).toEqual({ valid: false, reason: "You cannot nominate your own content" })
  })

  it("rejects when content already nominated this week", () => {
    const result = validateNomination({
      nominatorRep: 3000,
      nominatorRole: "user",
      nominatorId: "mod-1",
      authorId: "user-1",
      contentTitle: "Great Idea",
      hasExistingNomination: true,
    })
    expect(result).toEqual({ valid: false, reason: "This content has already been nominated this week" })
  })

  it("rejects when content title is empty", () => {
    const result = validateNomination({
      nominatorRep: 3000,
      nominatorRole: "user",
      nominatorId: "mod-1",
      authorId: "user-1",
      contentTitle: "  ",
      hasExistingNomination: false,
    })
    expect(result).toEqual({ valid: false, reason: "Content title is required" })
  })
})

describe("canNominate", () => {
  it("returns true for moderators", () => {
    expect(canNominate(3000, "user")).toBe(true)
    expect(canNominate(5000, "user")).toBe(true)
  })

  it("returns true for admin regardless of rep", () => {
    expect(canNominate(0, "admin")).toBe(true)
  })

  it("returns false for regular contributors", () => {
    expect(canNominate(100, "user")).toBe(false)
    expect(canNominate(2999, "user")).toBe(false)
  })
})

describe("spotlightWeekId", () => {
  it("returns a consistent week id for dates in the same week", () => {
    const monday = new Date("2026-03-16T10:00:00Z")
    const friday = new Date("2026-03-20T10:00:00Z")
    expect(spotlightWeekId(monday)).toBe(spotlightWeekId(friday))
  })

  it("returns different ids for dates in different weeks", () => {
    const thisWeek = new Date("2026-03-16T10:00:00Z")
    const nextWeek = new Date("2026-03-23T10:00:00Z")
    expect(spotlightWeekId(thisWeek)).not.toBe(spotlightWeekId(nextWeek))
  })

  it("returns a string in YYYY-WNN format", () => {
    const date = new Date("2026-03-18T10:00:00Z")
    const weekId = spotlightWeekId(date)
    expect(weekId).toMatch(/^\d{4}-W\d{2}$/)
  })
})
