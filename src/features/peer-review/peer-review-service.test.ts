import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-review-id" }

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

import {
  submitForReview,
  claimReview,
  submitFeedback,
  getReviewQueue,
  getReviewsForContent,
  getUserReviews,
} from "./peer-review-service"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = []
})

describe("submitForReview", () => {
  const validParams = {
    contentType: "node" as const,
    contentId: "node-1",
    contentTitle: "Telomere Extension",
    advancementId: "adv-1",
    authorId: "user-1",
    authorName: "Alice",
  }

  it("creates a peer review document with pending status", async () => {
    const result = await submitForReview(validParams)

    expect(result).toBe("new-review-id")
    expect(mockBatch.set).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Telomere Extension",
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      status: "pending",
      reviewerId: null,
      reviewerName: null,
      feedback: null,
      decision: null,
      submittedAt: fakeTimestamp,
      reviewedAt: null,
    }))
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("adds rate limit to the batch", async () => {
    await submitForReview(validParams)

    expect(addRateLimitToBatch).toHaveBeenCalledWith(mockBatch, "user-1", "peerReviews")
  })

  it("throws when content already has an active review", async () => {
    mockQueryResults = [{ id: "existing-review", data: () => ({}) }]

    await expect(submitForReview(validParams)).rejects.toThrow("This content already has an active review")
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it("throws when rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, reason: "Too many submissions" })

    await expect(submitForReview(validParams)).rejects.toThrow("Too many submissions")
  })
})

describe("claimReview", () => {
  it("updates review with reviewer info and in_review status", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: {
        status: "pending",
        authorId: "user-1",
        authorName: "Alice",
        contentTitle: "Test Idea",
        advancementId: "adv-1",
      },
    }

    await claimReview({
      reviewId: "review-1",
      reviewerId: "mod-1",
      reviewerName: "Dr. Bob",
    })

    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "peerReviews", __id: "review-1" }),
      expect.objectContaining({
        reviewerId: "mod-1",
        reviewerName: "Dr. Bob",
        status: "in_review",
      }),
    )
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("throws when review does not exist", async () => {
    await expect(claimReview({
      reviewId: "nonexistent",
      reviewerId: "mod-1",
      reviewerName: "Dr. Bob",
    })).rejects.toThrow("Review not found")
  })

  it("throws when review is not in pending status", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: { status: "in_review", authorId: "user-1" },
    }

    await expect(claimReview({
      reviewId: "review-1",
      reviewerId: "mod-1",
      reviewerName: "Dr. Bob",
    })).rejects.toThrow("This review has already been claimed")
  })

  it("throws when reviewer is the content author", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: { status: "pending", authorId: "mod-1" },
    }

    await expect(claimReview({
      reviewId: "review-1",
      reviewerId: "mod-1",
      reviewerName: "Dr. Bob",
    })).rejects.toThrow("You cannot review your own content")
  })

  it("notifies the author when review is claimed", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: {
        status: "pending",
        authorId: "user-1",
        authorName: "Alice",
        contentTitle: "Test Idea",
        advancementId: "adv-1",
      },
    }

    await claimReview({
      reviewId: "review-1",
      reviewerId: "mod-1",
      reviewerName: "Dr. Bob",
    })

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      type: "review",
    }))
  })
})

describe("submitFeedback", () => {
  const validFeedback = {
    accuracy: { score: 4, comment: "Good" },
    clarity: { score: 3, comment: "Okay" },
    novelty: { score: 5, comment: "Great" },
    evidenceQuality: { score: 4, comment: "Strong" },
    summary: "Well done",
  }

  it("updates review with feedback, decision, and reviewed timestamp", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: {
        status: "in_review",
        reviewerId: "mod-1",
        authorId: "user-1",
        authorName: "Alice",
        contentTitle: "Test Idea",
        advancementId: "adv-1",
      },
    }

    await submitFeedback({
      reviewId: "review-1",
      reviewerId: "mod-1",
      feedback: validFeedback,
      decision: "approved",
    })

    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "peerReviews", __id: "review-1" }),
      expect.objectContaining({
        feedback: validFeedback,
        decision: "approved",
        status: "approved",
        reviewedAt: fakeTimestamp,
      }),
    )
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("throws when review does not exist", async () => {
    await expect(submitFeedback({
      reviewId: "nonexistent",
      reviewerId: "mod-1",
      feedback: validFeedback,
      decision: "approved",
    })).rejects.toThrow("Review not found")
  })

  it("throws when submitter is not the assigned reviewer", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: { status: "in_review", reviewerId: "mod-1", authorId: "user-1" },
    }

    await expect(submitFeedback({
      reviewId: "review-1",
      reviewerId: "mod-2",
      feedback: validFeedback,
      decision: "approved",
    })).rejects.toThrow("Only the assigned reviewer can submit feedback")
  })

  it("throws when review is not in in_review status", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: { status: "pending", reviewerId: "mod-1", authorId: "user-1" },
    }

    await expect(submitFeedback({
      reviewId: "review-1",
      reviewerId: "mod-1",
      feedback: validFeedback,
      decision: "approved",
    })).rejects.toThrow("This review is not currently in review")
  })

  it("notifies the author with the decision", async () => {
    mockDocSnapshots["peerReviews/review-1"] = {
      exists: true,
      id: "review-1",
      data: {
        status: "in_review",
        reviewerId: "mod-1",
        authorId: "user-1",
        authorName: "Alice",
        contentTitle: "Test Idea",
        advancementId: "adv-1",
      },
    }

    await submitFeedback({
      reviewId: "review-1",
      reviewerId: "mod-1",
      feedback: validFeedback,
      decision: "approved",
    })

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      type: "review",
    }))
  })
})

describe("getReviewQueue", () => {
  it("returns empty array when no reviews exist", async () => {
    const result = await getReviewQueue()
    expect(result).toEqual([])
  })

  it("parses and returns review documents", async () => {
    mockQueryResults = [
      {
        id: "review-1",
        data: () => ({
          contentType: "node",
          contentId: "node-1",
          contentTitle: "Test",
          advancementId: "adv-1",
          authorId: "user-1",
          authorName: "Alice",
          status: "pending",
          reviewerId: null,
          reviewerName: null,
          feedback: null,
          decision: null,
          submittedAt: fakeTimestamp,
          reviewedAt: null,
        }),
      },
    ]

    const result = await getReviewQueue()
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("review-1")
    expect(result[0]?.status).toBe("pending")
  })
})

describe("getReviewsForContent", () => {
  it("returns empty array when no reviews exist for content", async () => {
    const result = await getReviewsForContent("node-1")
    expect(result).toEqual([])
  })
})

describe("getUserReviews", () => {
  it("returns empty array when user has no assigned reviews", async () => {
    const result = await getUserReviews("mod-1")
    expect(result).toEqual([])
  })
})
