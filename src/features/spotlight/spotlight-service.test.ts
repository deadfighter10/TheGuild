import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-spotlight-id" }

let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []

vi.mock("firebase/firestore", () => {
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1 || (args.length === 2 && typeof args[0] === "object" && (args[0] as Record<string, unknown>).__isCollection)) {
        return mockDocRef
      }
      return { __collection: args[1], __id: args[2] }
    }),
    getDocs: vi.fn(async () => ({
      empty: queryResults().length === 0,
      docs: queryResults(),
    })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    writeBatch: vi.fn(() => mockBatch),
    increment: vi.fn((n: number) => ({ __increment: n })),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/features/notifications/notification-service", () => ({
  createNotification: vi.fn(async () => {}),
}))

import { nominateForSpotlight, voteForSpotlight, getCurrentSpotlights } from "./spotlight-service"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockQueryResults = []
})

describe("nominateForSpotlight", () => {
  const validParams = {
    contentType: "node" as const,
    contentId: "node-1",
    contentTitle: "Great Idea",
    advancementId: "adv-1",
    authorId: "user-1",
    authorName: "Alice",
    nominatedBy: "mod-1",
    nominatorName: "Dr. Bob",
  }

  it("creates a spotlight nomination", async () => {
    const result = await nominateForSpotlight(validParams)

    expect(result).toBe("new-spotlight-id")
    expect(mockBatch.set).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Great Idea",
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      nominatedBy: "mod-1",
      nominatorName: "Dr. Bob",
      votes: 1,
    }))
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("throws when content already nominated this week", async () => {
    mockQueryResults = [{ id: "existing", data: () => ({}) }]

    await expect(nominateForSpotlight(validParams)).rejects.toThrow("This content has already been nominated this week")
  })

  it("notifies the content author", async () => {
    await nominateForSpotlight(validParams)

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
    }))
  })
})

describe("voteForSpotlight", () => {
  it("increments the vote count and creates a vote record", async () => {
    await voteForSpotlight({ spotlightId: "spotlight-1", voterId: "voter-1" })

    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "spotlights", __id: "spotlight-1" }),
      expect.objectContaining({
        votes: { __increment: 1 },
      }),
    )
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "spotlightVotes", __id: "voter-1_spotlight-1" }),
      expect.objectContaining({
        spotlightId: "spotlight-1",
        voterId: "voter-1",
      }),
    )
    expect(mockBatch.commit).toHaveBeenCalled()
  })
})

describe("getCurrentSpotlights", () => {
  it("returns empty array when no spotlights exist", async () => {
    const result = await getCurrentSpotlights("adv-1")
    expect(result).toEqual([])
  })

  it("parses and returns spotlight documents", async () => {
    mockQueryResults = [
      {
        id: "spot-1",
        data: () => ({
          contentType: "node",
          contentId: "node-1",
          contentTitle: "Great Idea",
          advancementId: "adv-1",
          authorId: "user-1",
          authorName: "Alice",
          nominatedBy: "mod-1",
          nominatorName: "Dr. Bob",
          votes: 5,
          weekId: "2026-W12",
          createdAt: fakeTimestamp,
        }),
      },
    ]

    const result = await getCurrentSpotlights("adv-1")
    expect(result).toHaveLength(1)
    expect(result[0]?.contentTitle).toBe("Great Idea")
    expect(result[0]?.votes).toBe(5)
  })
})
