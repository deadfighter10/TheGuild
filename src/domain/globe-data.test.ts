import { describe, it, expect } from "vitest"
import { aggregateUsersByCountry } from "./globe-data"

describe("aggregateUsersByCountry", () => {
  it("returns an empty map for no users", () => {
    expect(aggregateUsersByCountry([])).toEqual(new Map())
  })

  it("counts users per country", () => {
    const result = aggregateUsersByCountry([
      { country: "United States" },
      { country: "Germany" },
      { country: "United States" },
      { country: "Japan" },
      { country: "Germany" },
      { country: "Germany" },
    ])
    expect(result.get("United States")).toBe(2)
    expect(result.get("Germany")).toBe(3)
    expect(result.get("Japan")).toBe(1)
    expect(result.size).toBe(3)
  })

  it("ignores users with null country", () => {
    const result = aggregateUsersByCountry([
      { country: "Brazil" },
      { country: null },
      { country: null },
    ])
    expect(result.size).toBe(1)
    expect(result.get("Brazil")).toBe(1)
  })

  it("ignores users with empty string country", () => {
    const result = aggregateUsersByCountry([
      { country: "" },
      { country: "France" },
    ])
    expect(result.size).toBe(1)
    expect(result.get("France")).toBe(1)
  })
})
