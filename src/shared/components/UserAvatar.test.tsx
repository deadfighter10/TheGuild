import { describe, it, expect } from "vitest"
import { avatarInitials, avatarColor } from "./UserAvatar"

describe("avatarInitials", () => {
  it("returns first character uppercased for a single name", () => {
    expect(avatarInitials("alice")).toBe("A")
  })

  it("returns first character of first and last name", () => {
    expect(avatarInitials("Alice Smith")).toBe("AS")
  })

  it("returns ? for empty name", () => {
    expect(avatarInitials("")).toBe("?")
  })

  it("trims whitespace", () => {
    expect(avatarInitials("  Bob  ")).toBe("B")
  })
})

describe("avatarColor", () => {
  it("returns a consistent color for the same name", () => {
    const color1 = avatarColor("alice")
    const color2 = avatarColor("alice")

    expect(color1).toBe(color2)
  })

  it("returns different colors for different names", () => {
    const color1 = avatarColor("alice")
    const color2 = avatarColor("bob")

    expect(color1).not.toBe(color2)
  })
})
