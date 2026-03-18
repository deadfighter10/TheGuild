import { describe, it, expect } from "vitest"
import { validateBookmark, bookmarkId } from "./bookmark"

describe("validateBookmark", () => {
  it("accepts a valid bookmark", () => {
    const result = validateBookmark({
      userId: "user-1",
      targetType: "node",
      targetId: "node-1",
    })

    expect(result).toEqual({ valid: true })
  })

  it("rejects empty userId", () => {
    const result = validateBookmark({
      userId: "",
      targetType: "node",
      targetId: "node-1",
    })

    expect(result).toEqual({ valid: false, reason: "User ID is required" })
  })

  it("rejects empty targetId", () => {
    const result = validateBookmark({
      userId: "user-1",
      targetType: "node",
      targetId: "",
    })

    expect(result).toEqual({ valid: false, reason: "Target ID is required" })
  })
})

describe("bookmarkId", () => {
  it("generates a deterministic composite ID", () => {
    const id = bookmarkId("user-1", "node", "node-42")

    expect(id).toBe("user-1_node_node-42")
  })
})
