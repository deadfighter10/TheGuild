import { describe, it, expect } from "vitest"
import {
  isSchoolEmail,
  calculateInitialRep,
  canContribute,
  canModerate,
  canAccessDiscord,
  REP_THRESHOLDS,
  REP_REASONS,
  type RepReason,
} from "./reputation"

describe("isSchoolEmail", () => {
  it("returns true for .edu emails", () => {
    expect(isSchoolEmail("student@mit.edu")).toBe(true)
  })

  it("returns true for .edu.xx country-code emails", () => {
    expect(isSchoolEmail("student@university.edu.au")).toBe(true)
  })

  it("returns true for .ac.xx academic emails", () => {
    expect(isSchoolEmail("researcher@oxford.ac.uk")).toBe(true)
  })

  it("returns false for regular emails", () => {
    expect(isSchoolEmail("user@gmail.com")).toBe(false)
  })

  it("returns false for emails that contain edu but are not academic", () => {
    expect(isSchoolEmail("user@education-company.com")).toBe(false)
  })
})

describe("calculateInitialRep", () => {
  it("returns 0 for school emails (bonus granted after verification)", () => {
    expect(calculateInitialRep("student@mit.edu")).toBe(0)
  })

  it("returns 0 for non-school emails", () => {
    expect(calculateInitialRep("user@gmail.com")).toBe(0)
  })
})

describe("Rep ladder access", () => {
  it("denies contribution below 100 Rep", () => {
    expect(canContribute(50, "user")).toBe(false)
  })

  it("allows contribution at 100 Rep", () => {
    expect(canContribute(100, "user")).toBe(true)
  })

  it("allows Discord access at 100 Rep", () => {
    expect(canAccessDiscord(100, "user")).toBe(true)
  })

  it("denies moderation below 3000 Rep", () => {
    expect(canModerate(2999, "user")).toBe(false)
  })

  it("allows moderation at 3000 Rep", () => {
    expect(canModerate(3000, "user")).toBe(true)
  })

  it("allows contribution for admin role regardless of rep", () => {
    expect(canContribute(0, "admin")).toBe(true)
  })

  it("allows moderation for admin role regardless of rep", () => {
    expect(canModerate(0, "admin")).toBe(true)
  })

  it("allows Discord access for admin role regardless of rep", () => {
    expect(canAccessDiscord(0, "admin")).toBe(true)
  })
})

describe("REP_THRESHOLDS", () => {
  it("defines school email bonus as 100", () => {
    expect(REP_THRESHOLDS.schoolEmailBonus).toBe(100)
  })

  it("defines vouch bonus as 100", () => {
    expect(REP_THRESHOLDS.vouchBonus).toBe(100)
  })

  it("defines support bonus as 10", () => {
    expect(REP_THRESHOLDS.supportBonus).toBe(10)
  })
})

describe("REP_REASONS", () => {
  it("contains no duplicate entries", () => {
    const unique = new Set(REP_REASONS)
    expect(unique.size).toBe(REP_REASONS.length)
  })

  it("contains all expected reason categories", () => {
    const nodeReasons = REP_REASONS.filter((r) => r.startsWith("node_"))
    expect(nodeReasons.length).toBeGreaterThanOrEqual(3)

    const vouchReasons = REP_REASONS.filter((r) => r.startsWith("vouch_"))
    expect(vouchReasons.length).toBeGreaterThanOrEqual(3)

    const breakthroughReasons = REP_REASONS.filter((r) => r.startsWith("breakthrough_"))
    expect(breakthroughReasons.length).toBeGreaterThanOrEqual(3)
  })

  it("every entry satisfies RepReason type", () => {
    const assertIsRepReason = (_reason: RepReason) => {}
    for (const reason of REP_REASONS) {
      assertIsRepReason(reason)
    }
  })
})
