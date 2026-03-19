import { describe, it, expect } from "vitest"
import { getRepTier, isAdmin, type UserRole } from "./user"

describe("isAdmin", () => {
  it("returns true for admin role", () => {
    expect(isAdmin("admin")).toBe(true)
  })

  it("returns false for user role", () => {
    expect(isAdmin("user")).toBe(false)
  })
})

describe("UserRole", () => {
  it("accepts admin as a valid role", () => {
    const role: UserRole = "admin"
    expect(role).toBe("admin")
  })

  it("accepts user as a valid role", () => {
    const role: UserRole = "user"
    expect(role).toBe("user")
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
})
