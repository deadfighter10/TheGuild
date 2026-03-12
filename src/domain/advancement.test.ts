import { describe, it, expect } from "vitest"
import { ADVANCEMENTS } from "./advancement"

describe("ADVANCEMENTS", () => {
  it("contains exactly 6 advancements", () => {
    expect(ADVANCEMENTS).toHaveLength(6)
  })

  it("includes Telomerase Activation and Senolytics", () => {
    expect(ADVANCEMENTS.some((a) => a.name.includes("Telomerase"))).toBe(true)
  })

  it("includes Brain-Machine Interfaces", () => {
    expect(ADVANCEMENTS.some((a) => a.name.includes("Brain-Machine"))).toBe(
      true,
    )
  })

  it("includes Tissue Engineering", () => {
    expect(ADVANCEMENTS.some((a) => a.name.includes("Tissue Engineering"))).toBe(
      true,
    )
  })

  it("includes Nuclear Fusion", () => {
    expect(ADVANCEMENTS.some((a) => a.name.includes("Nuclear Fusion"))).toBe(
      true,
    )
  })

  it("includes CRISPR", () => {
    expect(ADVANCEMENTS.some((a) => a.name.includes("CRISPR"))).toBe(true)
  })

  it("includes AAGI", () => {
    expect(ADVANCEMENTS.some((a) => a.name.includes("AAGI"))).toBe(true)
  })

  it("each advancement has an id, name, and description", () => {
    for (const advancement of ADVANCEMENTS) {
      expect(advancement.id).toBeTruthy()
      expect(advancement.name).toBeTruthy()
      expect(advancement.description).toBeTruthy()
    }
  })
})
