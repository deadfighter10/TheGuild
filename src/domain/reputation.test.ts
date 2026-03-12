import { describe, it, expect } from "vitest"
import {
  isSchoolEmail,
  calculateInitialRep,
  canContribute,
  canModerate,
  canAccessDiscord,
  REP_THRESHOLDS,
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
  it("returns 100 for school emails", () => {
    expect(calculateInitialRep("student@mit.edu")).toBe(100)
  })

  it("returns 0 for non-school emails", () => {
    expect(calculateInitialRep("user@gmail.com")).toBe(0)
  })
})

describe("Rep ladder access", () => {
  it("denies contribution below 100 Rep", () => {
    expect(canContribute(50)).toBe(false)
  })

  it("allows contribution at 100 Rep", () => {
    expect(canContribute(100)).toBe(true)
  })

  it("allows Discord access at 100 Rep", () => {
    expect(canAccessDiscord(100)).toBe(true)
  })

  it("denies moderation below 3000 Rep", () => {
    expect(canModerate(2999)).toBe(false)
  })

  it("allows moderation at 3000 Rep", () => {
    expect(canModerate(3000)).toBe(true)
  })

  it("allows contribution for admin (-1 Rep)", () => {
    expect(canContribute(-1)).toBe(true)
  })

  it("allows moderation for admin (-1 Rep)", () => {
    expect(canModerate(-1)).toBe(true)
  })

  it("allows Discord access for admin (-1 Rep)", () => {
    expect(canAccessDiscord(-1)).toBe(true)
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
