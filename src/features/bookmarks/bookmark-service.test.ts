import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}
let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 2 && typeof args[1] === "string") {
        return { __collection: "direct", __id: args[1] }
      }
      if (args.length === 3) {
        const collectionName = args[1] as string
        const docId = args[2] as string
        return { __collection: collectionName, __id: docId }
      }
      return { __collection: "unknown", __id: "unknown" }
    }),
    getDoc: vi.fn(async (ref: { __collection?: string; __id?: string }) => {
      const key = `${ref.__collection}/${ref.__id}`
      const snap = docSnapshots()[key]
      return {
        exists: () => snap?.exists ?? false,
        id: snap?.id ?? ref.__id ?? "",
        data: () => snap?.data ?? {},
      }
    }),
    getDocs: vi.fn(async () => ({
      empty: queryResults().length === 0,
      docs: queryResults(),
    })),
    setDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => fakeTimestamp),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))

import { toggleBookmark, isBookmarked, getUserBookmarks } from "./bookmark-service"
import { setDoc, deleteDoc } from "firebase/firestore"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = []
})

describe("toggleBookmark", () => {
  it("creates a bookmark when not already bookmarked", async () => {
    const result = await toggleBookmark({
      userId: "user-1",
      targetType: "node",
      targetId: "node-1",
      targetTitle: "Cool Idea",
      advancementId: "adv-1",
    })

    expect(result).toBe(true)
    expect(setDoc).toHaveBeenCalled()
  })

  it("removes a bookmark when already bookmarked", async () => {
    mockDocSnapshots["bookmarks/user-1_node_node-1"] = {
      exists: true,
      id: "user-1_node_node-1",
      data: {},
    }

    const result = await toggleBookmark({
      userId: "user-1",
      targetType: "node",
      targetId: "node-1",
      targetTitle: "Cool Idea",
      advancementId: "adv-1",
    })

    expect(result).toBe(false)
    expect(deleteDoc).toHaveBeenCalled()
  })
})

describe("isBookmarked", () => {
  it("returns true when bookmark exists", async () => {
    mockDocSnapshots["bookmarks/user-1_node_node-1"] = {
      exists: true,
      id: "user-1_node_node-1",
      data: {},
    }

    const result = await isBookmarked("user-1", "node", "node-1")

    expect(result).toBe(true)
  })

  it("returns false when bookmark does not exist", async () => {
    const result = await isBookmarked("user-1", "node", "node-1")

    expect(result).toBe(false)
  })
})

describe("getUserBookmarks", () => {
  it("returns bookmarks for a user", async () => {
    mockQueryResults = [
      {
        id: "user-1_node_node-1",
        data: () => ({
          userId: "user-1",
          targetType: "node",
          targetId: "node-1",
          targetTitle: "Cool Idea",
          advancementId: "adv-1",
          createdAt: fakeTimestamp,
        }),
      },
    ]

    const result = await getUserBookmarks("user-1")

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({
      targetType: "node",
      targetId: "node-1",
      targetTitle: "Cool Idea",
    }))
  })

  it("returns empty array when no bookmarks", async () => {
    const result = await getUserBookmarks("user-1")

    expect(result).toEqual([])
  })
})
