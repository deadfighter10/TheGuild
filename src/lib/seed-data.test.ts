import { describe, it, expect } from "vitest"
import { ADVANCEMENTS } from "@/domain/advancement"

describe("seed advancements data integrity", () => {
  it("contains exactly 6 advancements", () => {
    expect(ADVANCEMENTS).toHaveLength(6)
  })

  it("has unique ids", () => {
    const ids = ADVANCEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has unique names", () => {
    const names = ADVANCEMENTS.map((a) => a.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("each advancement has a non-empty id", () => {
    for (const a of ADVANCEMENTS) {
      expect(a.id.length).toBeGreaterThan(0)
    }
  })

  it("each advancement has a non-empty name", () => {
    for (const a of ADVANCEMENTS) {
      expect(a.name.length).toBeGreaterThan(0)
    }
  })

  it("each advancement has a non-empty description", () => {
    for (const a of ADVANCEMENTS) {
      expect(a.description.length).toBeGreaterThan(0)
    }
  })

  it("contains expected advancement ids", () => {
    const ids = ADVANCEMENTS.map((a) => a.id)
    expect(ids).toContain("telomerase")
    expect(ids).toContain("bci")
    expect(ids).toContain("tissue-engineering")
    expect(ids).toContain("fusion")
    expect(ids).toContain("crispr")
    expect(ids).toContain("aagi")
  })

  it("ids are lowercase kebab-case", () => {
    for (const a of ADVANCEMENTS) {
      expect(a.id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it("descriptions are at least 20 characters", () => {
    for (const a of ADVANCEMENTS) {
      expect(a.description.length).toBeGreaterThanOrEqual(20)
    }
  })
})
