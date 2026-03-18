import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-link-id" }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
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
    getDocs: vi.fn(async () => ({ docs: [] })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/lib/rate-limit", () => ({
  addRateLimitToBatch: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

import { submitNewsLink, voteNewsLink, getUserVote } from "./news-service"
import { setDoc, updateDoc } from "firebase/firestore"
import { addRateLimitToBatch } from "@/lib/rate-limit"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
})

describe("submitNewsLink", () => {
  const validParams = {
    submitterId: "user-1",
    submitterRep: 200,
    advancementId: "adv-1",
    title: "Cool Research Paper",
    url: "https://example.com/paper",
  }

  it("submits a link when validation passes", async () => {
    const result = await submitNewsLink(validParams)

    expect(result).toEqual({ success: true, linkId: "new-link-id" })
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("adds rate limit to the batch", async () => {
    await submitNewsLink(validParams)

    expect(addRateLimitToBatch).toHaveBeenCalledWith(mockBatch, "user-1", "newsLinks")
  })

  it("rejects when rep is too low", async () => {
    const result = await submitNewsLink({ ...validParams, submitterRep: 50 })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it("rejects empty title", async () => {
    const result = await submitNewsLink({ ...validParams, title: "" })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("voteNewsLink", () => {
  function setupLink(overrides: Record<string, unknown> = {}) {
    mockDocSnapshots["newsLinks/link-1"] = {
      exists: true,
      id: "link-1",
      data: {
        advancementId: "adv-1",
        submitterId: "author-1",
        title: "Cool Link",
        url: "https://example.com",
        score: 5,
        createdAt: fakeTimestamp,
        ...overrides,
      },
    }
  }

  it("allows an upvote on a link", async () => {
    setupLink()

    const result = await voteNewsLink("user-1", 200, "link-1", 1)

    expect(result).toEqual({ success: true })
    expect(setDoc).toHaveBeenCalled()
    expect(updateDoc).toHaveBeenCalled()
  })

  it("allows a downvote on a link", async () => {
    setupLink()

    const result = await voteNewsLink("user-1", 200, "link-1", -1)

    expect(result).toEqual({ success: true })
  })

  it("rejects when link does not exist", async () => {
    const result = await voteNewsLink("user-1", 200, "link-1", 1)

    expect(result).toEqual({ success: false, reason: "Link not found" })
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("rejects when user votes on own link", async () => {
    setupLink({ submitterId: "user-1" })

    const result = await voteNewsLink("user-1", 200, "link-1", 1)

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("getUserVote", () => {
  it("returns the vote value when exists", async () => {
    mockDocSnapshots["newsVotes/user-1_link-1"] = {
      exists: true,
      id: "user-1_link-1",
      data: { value: 1 },
    }

    const result = await getUserVote("user-1", "link-1")

    expect(result).toBe(1)
  })

  it("returns null when no vote exists", async () => {
    const result = await getUserVote("user-1", "link-1")

    expect(result).toBeNull()
  })
})
