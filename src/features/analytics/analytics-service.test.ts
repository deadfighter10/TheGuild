import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2026-03-15") }
const oldTimestamp = { toDate: () => new Date("2026-01-01") }

let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []
let queryCallCount = 0

vi.mock("firebase/firestore", () => {
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn((_db: unknown, name: string) => ({ __collection: name })),
    getDocs: vi.fn(async () => {
      const results = queryResults()
      queryCallCount++
      return {
        empty: results.length === 0,
        size: results.length,
        docs: results,
      }
    }),
    getCountFromServer: vi.fn(async () => ({ data: () => ({ count: 42 }) })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    Timestamp: {
      fromDate: vi.fn((d: Date) => d),
    },
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))

import {
  getPageViewStats,
  getUserGrowthStats,
  getContentTrends,
  getModerationStats,
  getOverviewMetrics,
} from "./analytics-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockQueryResults = []
  queryCallCount = 0
})

describe("getPageViewStats", () => {
  it("returns empty array when no page views exist", async () => {
    const result = await getPageViewStats("7d")
    expect(result).toEqual([])
  })

  it("returns time series data from page view documents", async () => {
    mockQueryResults = [
      { id: "pv1", data: () => ({ path: "/advancements", timestamp: fakeTimestamp }) },
      { id: "pv2", data: () => ({ path: "/profile", timestamp: fakeTimestamp }) },
      { id: "pv3", data: () => ({ path: "/advancements", timestamp: oldTimestamp }) },
    ]

    const result = await getPageViewStats("all")
    expect(result.length).toBeGreaterThan(0)
    const totalViews = result.reduce((sum, p) => sum + p.value, 0)
    expect(totalViews).toBe(3)
  })
})

describe("getUserGrowthStats", () => {
  it("returns empty array when no users exist", async () => {
    const result = await getUserGrowthStats("7d")
    expect(result).toEqual([])
  })

  it("returns time series data from user creation dates", async () => {
    mockQueryResults = [
      { id: "u1", data: () => ({ createdAt: fakeTimestamp, displayName: "Alice", repPoints: 100, isSchoolEmail: false, email: "a@b.com" }) },
      { id: "u2", data: () => ({ createdAt: fakeTimestamp, displayName: "Bob", repPoints: 0, isSchoolEmail: false, email: "b@b.com" }) },
    ]

    const result = await getUserGrowthStats("all")
    const totalUsers = result.reduce((sum, p) => sum + p.value, 0)
    expect(totalUsers).toBe(2)
  })
})

describe("getContentTrends", () => {
  it("returns trends per advancement", async () => {
    mockQueryResults = [
      { id: "n1", data: () => ({ advancementId: "fusion", createdAt: fakeTimestamp }) },
      { id: "n2", data: () => ({ advancementId: "fusion", createdAt: fakeTimestamp }) },
      { id: "n3", data: () => ({ advancementId: "crispr", createdAt: fakeTimestamp }) },
    ]

    const result = await getContentTrends("all")
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns empty array when no content exists", async () => {
    const result = await getContentTrends("7d")
    expect(result).toEqual([])
  })
})

describe("getModerationStats", () => {
  it("returns zeroed stats when no flags exist", async () => {
    const result = await getModerationStats()
    expect(result).toEqual({
      pending: 0,
      dismissed: 0,
      actioned: 0,
      avgResolutionMs: null,
    })
  })

  it("counts flags by status", async () => {
    const resolvedTimestamp = { toDate: () => new Date("2026-03-16") }
    mockQueryResults = [
      { id: "f1", data: () => ({ status: "pending", createdAt: fakeTimestamp }) },
      { id: "f2", data: () => ({ status: "pending", createdAt: fakeTimestamp }) },
      { id: "f3", data: () => ({ status: "actioned", createdAt: fakeTimestamp, resolvedAt: resolvedTimestamp }) },
      { id: "f4", data: () => ({ status: "dismissed", createdAt: fakeTimestamp, resolvedAt: resolvedTimestamp }) },
    ]

    const result = await getModerationStats()
    expect(result.pending).toBe(2)
    expect(result.actioned).toBe(1)
    expect(result.dismissed).toBe(1)
  })

  it("calculates average resolution time", async () => {
    const createdAt = { toDate: () => new Date("2026-03-15T00:00:00Z") }
    const resolvedAt = { toDate: () => new Date("2026-03-16T00:00:00Z") }
    mockQueryResults = [
      { id: "f1", data: () => ({ status: "actioned", createdAt, resolvedAt }) },
    ]

    const result = await getModerationStats()
    expect(result.avgResolutionMs).toBe(24 * 60 * 60 * 1000)
  })
})

describe("getOverviewMetrics", () => {
  it("returns metric objects with labels and values", async () => {
    const result = await getOverviewMetrics()
    expect(result.length).toBeGreaterThanOrEqual(4)
    for (const metric of result) {
      expect(metric.label).toBeTruthy()
      expect(typeof metric.value).toBe("number")
    }
  })
})
