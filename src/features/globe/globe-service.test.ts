import { describe, it, expect, vi, beforeEach } from "vitest"

let mockDocs: readonly { data: () => Record<string, unknown> }[] = []
let mockCounts: readonly number[] = []
let countIndex = 0

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: mockDocs })),
  getCountFromServer: vi.fn(async () => {
    const count = mockCounts[countIndex] ?? 0
    countIndex++
    return { data: () => ({ count }) }
  }),
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

import { fetchCountryUserCounts, fetchLiveStats } from "./globe-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocs = []
  mockCounts = []
  countIndex = 0
})

describe("fetchCountryUserCounts", () => {
  it("aggregates users by country", async () => {
    mockDocs = [
      { data: () => ({ country: "US" }) },
      { data: () => ({ country: "US" }) },
      { data: () => ({ country: "DE" }) },
    ]
    const counts = await fetchCountryUserCounts()
    expect(counts.get("US")).toBe(2)
    expect(counts.get("DE")).toBe(1)
  })

  it("returns empty map on error", async () => {
    const { getDocs } = await import("firebase/firestore")
    vi.mocked(getDocs).mockRejectedValueOnce(new Error("Network error"))
    const counts = await fetchCountryUserCounts()
    expect(counts.size).toBe(0)
  })
})

describe("fetchLiveStats", () => {
  it("returns counts from all collections", async () => {
    mockCounts = [42, 15, 8, 3]
    const stats = await fetchLiveStats()
    expect(stats).toEqual({
      members: 42,
      nodes: 15,
      libraryEntries: 8,
      newsLinks: 3,
    })
  })

  it("returns zeros on error", async () => {
    const { getCountFromServer } = await import("firebase/firestore")
    vi.mocked(getCountFromServer).mockRejectedValueOnce(new Error("fail"))
    const stats = await fetchLiveStats()
    expect(stats).toEqual({ members: 0, nodes: 0, libraryEntries: 0, newsLinks: 0 })
  })
})
