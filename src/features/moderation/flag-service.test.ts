import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-flag-id" }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}
let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1 || (args.length === 2 && typeof args[0] === "object" && (args[0] as Record<string, unknown>).__isCollection)) {
        return mockDocRef
      }
      const collectionName = args[1] as string
      const docId = args[2] as string
      return { __collection: collectionName, __id: docId }
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
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    writeBatch: vi.fn(() => mockBatch),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/lib/rate-limit", () => ({
  addRateLimitToBatch: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))
vi.mock("@/features/notifications/notification-service", () => ({
  createNotification: vi.fn(async () => {}),
}))

import { flagContent, resolveFlag, getPendingFlags } from "./flag-service"
import { updateDoc } from "firebase/firestore"
import { addRateLimitToBatch } from "@/lib/rate-limit"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = []
})

describe("flagContent", () => {
  const validParams = {
    targetCollection: "nodes" as const,
    targetId: "node-1",
    targetTitle: "Bad Node",
    reporterId: "user-1",
    reporterName: "Alice",
    reason: "spam" as const,
    details: "Clearly spam content",
  }

  it("creates a flag when user has not already flagged", async () => {
    mockDocSnapshots["nodes/node-1"] = {
      exists: true,
      id: "node-1",
      data: { authorId: "other-user", advancementId: "adv-1" },
    }

    const result = await flagContent(validParams)

    expect(result).toBe("new-flag-id")
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("adds rate limit to the batch", async () => {
    mockDocSnapshots["nodes/node-1"] = {
      exists: true,
      id: "node-1",
      data: { authorId: "other-user", advancementId: "adv-1" },
    }

    await flagContent(validParams)

    expect(addRateLimitToBatch).toHaveBeenCalledWith(mockBatch, "user-1", "flags")
  })

  it("throws when user has already flagged the same content", async () => {
    mockQueryResults = [{ id: "existing-flag", data: () => ({}) }]

    await expect(flagContent(validParams)).rejects.toThrow("You have already flagged this content")
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it("notifies content author when different from reporter", async () => {
    mockDocSnapshots["nodes/node-1"] = {
      exists: true,
      id: "node-1",
      data: { authorId: "other-user", advancementId: "adv-1" },
    }

    await flagContent(validParams)

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "other-user",
      type: "flag",
    }))
  })
})

describe("resolveFlag", () => {
  it("updates the flag status", async () => {
    await resolveFlag("flag-1", { status: "dismissed", resolvedBy: "admin-1" })

    expect(updateDoc).toHaveBeenCalled()
  })
})

describe("getPendingFlags", () => {
  it("returns empty when no flags exist", async () => {
    const result = await getPendingFlags()

    expect(result).toEqual([])
  })
})
