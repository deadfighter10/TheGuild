import { describe, it, expect } from "vitest"
import { validateFlag, canResolveFlag, FLAG_REASONS } from "./flag"

describe("validateFlag", () => {
  it("returns no errors for valid flag", () => {
    expect(validateFlag({ reason: "spam", details: "This is spam content" })).toEqual([])
  })

  it("returns error for invalid reason", () => {
    const errors = validateFlag({ reason: "invalid-reason", details: "" })
    expect(errors).toContain("Invalid flag reason")
  })

  it("returns error for details exceeding 1000 characters", () => {
    const errors = validateFlag({ reason: "spam", details: "a".repeat(1001) })
    expect(errors).toContain("Details must be 1000 characters or less")
  })

  it("allows empty details", () => {
    expect(validateFlag({ reason: "harassment", details: "" })).toEqual([])
  })

  it("allows details at exactly 1000 characters", () => {
    expect(validateFlag({ reason: "spam", details: "a".repeat(1000) })).toEqual([])
  })

  it("accepts all defined flag reasons", () => {
    for (const reason of FLAG_REASONS) {
      expect(validateFlag({ reason: reason.value, details: "" })).toEqual([])
    }
  })
})

describe("canResolveFlag", () => {
  it("allows admin to resolve flags", () => {
    expect(canResolveFlag(-1)).toBe(true)
  })

  it("allows moderators to resolve flags", () => {
    expect(canResolveFlag(3000)).toBe(true)
    expect(canResolveFlag(5000)).toBe(true)
  })

  it("denies contributors from resolving flags", () => {
    expect(canResolveFlag(100)).toBe(false)
    expect(canResolveFlag(2999)).toBe(false)
  })

  it("denies observers from resolving flags", () => {
    expect(canResolveFlag(0)).toBe(false)
    expect(canResolveFlag(50)).toBe(false)
  })
})

describe("FLAG_REASONS", () => {
  it("defines 6 flag reasons", () => {
    expect(FLAG_REASONS).toHaveLength(6)
  })

  it("has unique values", () => {
    const values = FLAG_REASONS.map((r) => r.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
