import { describe, it, expect } from "vitest"
import { getRepTier, isAdmin } from "./user"

describe("isAdmin", () => {
  it("returns true for -1 Rep", () => {
    expect(isAdmin(-1)).toBe(true)
  })

  it("returns false for 0 Rep", () => {
    expect(isAdmin(0)).toBe(false)
  })

  it("returns false for positive Rep", () => {
    expect(isAdmin(3000)).toBe(false)
  })
})

describe("getRepTier", () => {
  it("returns observer for 0 Rep", () => {
    expect(getRepTier(0)).toBe("observer")
  })

  it("returns observer for 99 Rep", () => {
    expect(getRepTier(99)).toBe("observer")
  })

  it("returns contributor for 100 Rep", () => {
    expect(getRepTier(100)).toBe("contributor")
  })

  it("returns contributor for 2999 Rep", () => {
    expect(getRepTier(2999)).toBe("contributor")
  })

  it("returns moderator for 3000 Rep", () => {
    expect(getRepTier(3000)).toBe("moderator")
  })

  it("returns moderator for 10000 Rep", () => {
    expect(getRepTier(10000)).toBe("moderator")
  })

  it("returns moderator for admin (-1 Rep)", () => {
    expect(getRepTier(-1)).toBe("moderator")
  })
})
