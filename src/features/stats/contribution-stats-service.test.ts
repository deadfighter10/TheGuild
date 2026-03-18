import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-06-15") }

let mockQueryResults: Record<string, readonly { id: string; data: () => Record<string, unknown> }[]> = {}
let callCount = 0

vi.mock("firebase/firestore", () => {
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn((_db: unknown, name: string) => ({ __collection: name })),
    getDocs: vi.fn(async () => {
      const keys = Object.keys(queryResults())
      const key = keys[callCount] ?? keys[0] ?? "default"
      const results = queryResults()[key] ?? []
      callCount++
      return {
        empty: results.length === 0,
        docs: results,
      }
    }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))

import { getUserContributionDates } from "./contribution-stats-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockQueryResults = {}
  callCount = 0
})

describe("getUserContributionDates", () => {
  it("returns empty array when user has no contributions", async () => {
    mockQueryResults = {
      nodes: [],
      threads: [],
      replies: [],
      newsLinks: [],
      libraryEntries: [],
    }

    const result = await getUserContributionDates("user-1")
    expect(result).toEqual([])
  })

  it("collects dates from multiple collections", async () => {
    mockQueryResults = {
      nodes: [{ id: "n1", data: () => ({ createdAt: fakeTimestamp }) }],
      threads: [{ id: "t1", data: () => ({ createdAt: fakeTimestamp }) }],
      replies: [],
      newsLinks: [],
      libraryEntries: [],
    }

    const result = await getUserContributionDates("user-1")
    expect(result.length).toBeGreaterThanOrEqual(2)
  })
})
