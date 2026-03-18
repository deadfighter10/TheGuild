import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []

vi.mock("firebase/firestore", () => {
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length >= 3) {
        return { __collection: args[1], __id: args[2] }
      }
      return { id: "new-achievement-id" }
    }),
    getDoc: vi.fn(async (ref: { __id?: string }) => ({
      exists: () => false,
      id: ref.__id ?? "",
      data: () => ({}),
    })),
    getDocs: vi.fn(async () => ({
      empty: queryResults().length === 0,
      docs: queryResults(),
    })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    writeBatch: vi.fn(() => mockBatch),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))

import { getUserAchievements, awardAchievement } from "./achievement-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockQueryResults = []
})

describe("getUserAchievements", () => {
  it("returns empty array when user has no achievements", async () => {
    const result = await getUserAchievements("user-1")
    expect(result).toEqual([])
  })

  it("parses and returns achievement documents", async () => {
    mockQueryResults = [
      {
        id: "user-1_first-node",
        data: () => ({
          userId: "user-1",
          achievementId: "first-node",
          earnedAt: fakeTimestamp,
        }),
      },
    ]

    const result = await getUserAchievements("user-1")
    expect(result).toHaveLength(1)
    expect(result[0]?.achievementId).toBe("first-node")
  })
})

describe("awardAchievement", () => {
  it("creates an achievement document with correct id", async () => {
    await awardAchievement("user-1", "first-node")

    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "achievements", __id: "user-1_first-node" }),
      expect.objectContaining({
        userId: "user-1",
        achievementId: "first-node",
        earnedAt: fakeTimestamp,
      }),
    )
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("does not overwrite existing achievement", async () => {
    vi.mocked((await import("firebase/firestore")).getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: "user-1_first-node",
      data: () => ({ userId: "user-1", achievementId: "first-node" }),
    } as ReturnType<typeof import("firebase/firestore").getDoc> extends Promise<infer T> ? T : never)

    await awardAchievement("user-1", "first-node")

    expect(mockBatch.set).not.toHaveBeenCalled()
  })
})
