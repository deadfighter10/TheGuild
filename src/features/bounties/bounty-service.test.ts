import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2026-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-bounty-id" }

let mockDocSnapshots: Record<
  string,
  { exists: boolean; id: string; data: Record<string, unknown> }
> = {}

let mockQueryResults: Array<{
  id: string
  data: () => Record<string, unknown>
  ref: object
}> = []

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (
        args.length === 1 ||
        (args.length === 2 &&
          typeof args[0] === "object" &&
          (args[0] as Record<string, unknown>).__isCollection)
      ) {
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
      docs: mockQueryResults,
      size: mockQueryResults.length,
    })),
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    increment: vi.fn((n: number) => ({ __increment: n })),
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
  createBounty,
  publishBounty,
  updateBounty,
  cancelBounty,
  claimBounty,
  abandonBounty,
  submitWork,
  reviewSubmission,
  getBounties,
  getBounty,
  getSubmissionsForBounty,
} from "./bounty-service"
import { updateDoc } from "firebase/firestore"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = []
})

function setupBountyDoc(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  mockDocSnapshots[`bounties/${id}`] = {
    exists: true,
    id,
    data: {
      posterId: "poster-1",
      posterName: "Dr. Chen",
      title: "Summarize 3 recent papers on telomere extension",
      description:
        "Read three 2025-2026 papers on telomere extension using TERT activation. Write a 500-word summary comparing their methodologies and results.",
      advancementId: "telomerase",
      bountyType: "research",
      difficulty: "newcomer",
      rewardAmount: 50,
      status: "open",
      deadline: null,
      claimWindowDays: 3,
      currentHunterId: null,
      currentHunterName: null,
      claimedAt: null,
      claimCount: 0,
      relatedContentIds: [],
      isSystemBounty: false,
      createdAt: fakeTimestamp,
      updatedAt: fakeTimestamp,
      ...overrides,
    },
  }
}

describe("createBounty", () => {
  const validParams = {
    posterId: "poster-1",
    posterName: "Dr. Chen",
    posterRep: 200,
    posterRole: "user" as const,
    title: "Summarize 3 recent papers on telomere extension",
    description:
      "Read three 2025-2026 papers on telomere extension using TERT activation. Write a 500-word summary comparing their methodologies and results.",
    advancementId: "telomerase",
    bountyType: "research" as const,
    difficulty: "newcomer" as const,
    rewardAmount: 50,
    deadline: null,
  }

  it("creates a bounty as draft", async () => {
    const result = await createBounty(validParams)
    expect(result).toEqual({ success: true, bountyId: "new-bounty-id" })
    expect(mockBatch.set).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        posterId: "poster-1",
        posterName: "Dr. Chen",
        title: "Summarize 3 recent papers on telomere extension",
        status: "draft",
        difficulty: "newcomer",
        rewardAmount: 50,
        claimWindowDays: 3,
        claimCount: 0,
        isSystemBounty: false,
      }),
    )
  })

  it("adds rate limit to the batch", async () => {
    await createBounty(validParams)
    expect(addRateLimitToBatch).toHaveBeenCalledWith(
      mockBatch,
      "poster-1",
      "bounties",
    )
  })

  it("rejects when rep is below 100", async () => {
    const result = await createBounty({ ...validParams, posterRep: 99 })
    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it("rejects when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      reason: "Hourly limit reached",
    })
    const result = await createBounty(validParams)
    expect(result).toEqual({ success: false, reason: "Hourly limit reached" })
  })

  it("sets claimWindowDays from difficulty", async () => {
    await createBounty({ ...validParams, difficulty: "expert", rewardAmount: 300 })
    expect(mockBatch.set).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({ claimWindowDays: 21 }),
    )
  })
})

describe("publishBounty", () => {
  it("transitions draft to open", async () => {
    setupBountyDoc("bounty-1", { status: "draft", posterId: "poster-1" })
    const result = await publishBounty({
      userId: "poster-1",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({ status: "open" }),
    )
  })

  it("rejects if user is not the poster", async () => {
    setupBountyDoc("bounty-1", { status: "draft", posterId: "poster-1" })
    const result = await publishBounty({
      userId: "other-user",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({
      success: false,
      reason: "Only the poster can publish this bounty",
    })
  })

  it("rejects if bounty is not in draft", async () => {
    setupBountyDoc("bounty-1", { status: "open", posterId: "poster-1" })
    const result = await publishBounty({
      userId: "poster-1",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({
      success: false,
      reason: "Only draft bounties can be published",
    })
  })

  it("returns failure if bounty not found", async () => {
    const result = await publishBounty({
      userId: "poster-1",
      bountyId: "nonexistent",
    })
    expect(result).toEqual({ success: false, reason: "Bounty not found" })
  })
})

describe("updateBounty", () => {
  it("updates a draft bounty", async () => {
    setupBountyDoc("bounty-1", { status: "draft", posterId: "poster-1" })
    const result = await updateBounty({
      userId: "poster-1",
      bountyId: "bounty-1",
      title: "Updated bounty title here",
      description:
        "An updated description that is long enough to pass validation. It must be at least 100 characters to satisfy the constraint.",
      difficulty: "standard",
      rewardAmount: 100,
    })
    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({
        title: "Updated bounty title here",
        difficulty: "standard",
        rewardAmount: 100,
        claimWindowDays: 7,
      }),
    )
  })

  it("rejects updating non-draft bounty", async () => {
    setupBountyDoc("bounty-1", { status: "open", posterId: "poster-1" })
    const result = await updateBounty({
      userId: "poster-1",
      bountyId: "bounty-1",
      title: "Updated bounty title here",
      description:
        "An updated description that is long enough to pass validation. It must be at least 100 characters to satisfy the constraint.",
      difficulty: "standard",
      rewardAmount: 100,
    })
    expect(result).toEqual({
      success: false,
      reason: "Can only update draft bounties",
    })
  })
})

describe("cancelBounty", () => {
  it("cancels an open bounty", async () => {
    setupBountyDoc("bounty-1", { status: "open", posterId: "poster-1" })
    const result = await cancelBounty({
      userId: "poster-1",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({ status: "cancelled" }),
    )
  })

  it("rejects cancelling a claimed bounty", async () => {
    setupBountyDoc("bounty-1", { status: "claimed", posterId: "poster-1" })
    const result = await cancelBounty({
      userId: "poster-1",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({
      success: false,
      reason: "Can only cancel draft or open bounties",
    })
  })
})

describe("claimBounty", () => {
  it("claims an open bounty", async () => {
    setupBountyDoc("bounty-1", { status: "open", posterId: "poster-1" })
    const result = await claimBounty({
      hunterId: "hunter-1",
      hunterName: "HunterX",
      hunterRep: 200,
      hunterRole: "user",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({
        status: "claimed",
        currentHunterId: "hunter-1",
        currentHunterName: "HunterX",
      }),
    )
  })

  it("sends notification to poster", async () => {
    setupBountyDoc("bounty-1", { status: "open", posterId: "poster-1" })
    await claimBounty({
      hunterId: "hunter-1",
      hunterName: "HunterX",
      hunterRep: 200,
      hunterRole: "user",
      bountyId: "bounty-1",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "poster-1",
        type: "bounty_claimed",
      }),
    )
  })

  it("rejects claiming own bounty", async () => {
    setupBountyDoc("bounty-1", { status: "open", posterId: "poster-1" })
    const result = await claimBounty({
      hunterId: "poster-1",
      hunterName: "Dr. Chen",
      hunterRep: 200,
      hunterRole: "user",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({
      success: false,
      reason: "You cannot claim your own bounty",
    })
  })
})

describe("abandonBounty", () => {
  it("returns bounty to open and clears hunter fields", async () => {
    setupBountyDoc("bounty-1", {
      status: "claimed",
      posterId: "poster-1",
      currentHunterId: "hunter-1",
      currentHunterName: "HunterX",
      claimedAt: fakeTimestamp,
    })
    const result = await abandonBounty({
      hunterId: "hunter-1",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({
        status: "open",
        currentHunterId: null,
        currentHunterName: null,
        claimedAt: null,
      }),
    )
  })

  it("rejects if user is not the current hunter", async () => {
    setupBountyDoc("bounty-1", {
      status: "claimed",
      currentHunterId: "hunter-1",
    })
    const result = await abandonBounty({
      hunterId: "other-user",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({
      success: false,
      reason: "Only the current hunter can abandon this bounty",
    })
  })

  it("rejects if bounty is not claimed", async () => {
    setupBountyDoc("bounty-1", { status: "open" })
    const result = await abandonBounty({
      hunterId: "hunter-1",
      bountyId: "bounty-1",
    })
    expect(result).toEqual({
      success: false,
      reason: "This bounty is not currently claimed",
    })
  })
})

describe("submitWork", () => {
  it("creates a submission and updates bounty status", async () => {
    setupBountyDoc("bounty-1", {
      status: "claimed",
      currentHunterId: "hunter-1",
    })
    const result = await submitWork({
      hunterId: "hunter-1",
      hunterName: "HunterX",
      bountyId: "bounty-1",
      summary:
        "I completed the research as described. Here are the three papers I found and summarized with key findings on telomere extension.",
      contentLinks: ["/advancements/telomerase/library/entry-1"],
      externalLinks: ["https://example.com/paper1"],
      revisionNumber: 0,
    })
    expect(result).toEqual({ success: true })
    expect(mockBatch.set).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        status: "pending",
        revisionNumber: 0,
      }),
    )
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({ status: "submitted" }),
    )
  })

  it("sends notification to poster", async () => {
    setupBountyDoc("bounty-1", {
      status: "claimed",
      currentHunterId: "hunter-1",
      posterId: "poster-1",
    })
    await submitWork({
      hunterId: "hunter-1",
      hunterName: "HunterX",
      bountyId: "bounty-1",
      summary:
        "I completed the research as described. Here are the three papers I found and summarized with key findings on telomere extension.",
      contentLinks: [],
      externalLinks: [],
      revisionNumber: 0,
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "poster-1",
        type: "bounty_submitted",
      }),
    )
  })

  it("rejects if summary is too short", async () => {
    setupBountyDoc("bounty-1", {
      status: "claimed",
      currentHunterId: "hunter-1",
    })
    const result = await submitWork({
      hunterId: "hunter-1",
      hunterName: "HunterX",
      bountyId: "bounty-1",
      summary: "Too short.",
      contentLinks: [],
      externalLinks: [],
      revisionNumber: 0,
    })
    expect(result).toEqual({
      success: false,
      reason: "Summary must be between 100 and 2000 characters",
    })
  })
})

describe("reviewSubmission (accept)", () => {
  it("accepts a submission and calls completeBounty", async () => {
    setupBountyDoc("bounty-1", {
      status: "submitted",
      posterId: "poster-1",
      currentHunterId: "hunter-1",
      difficulty: "newcomer",
      rewardAmount: 50,
    })
    mockDocSnapshots["bountySubmissions/sub-1"] = {
      exists: true,
      id: "sub-1",
      data: {
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        summary: "Good work.",
        contentLinks: [],
        externalLinks: [],
        revisionNumber: 0,
        status: "pending",
        rejectionFeedback: null,
        submittedAt: fakeTimestamp,
        reviewedAt: null,
      },
    }
    const result = await reviewSubmission({
      reviewerId: "poster-1",
      bountyId: "bounty-1",
      submissionId: "sub-1",
      action: "accept",
    })
    expect(result).toEqual({ success: true })
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "sub-1" }),
      expect.objectContaining({ status: "accepted" }),
    )
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({ status: "accepted" }),
    )
  })

  it("sends notification to hunter on accept", async () => {
    setupBountyDoc("bounty-1", {
      status: "submitted",
      posterId: "poster-1",
      currentHunterId: "hunter-1",
    })
    mockDocSnapshots["bountySubmissions/sub-1"] = {
      exists: true,
      id: "sub-1",
      data: {
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        summary: "Done.",
        contentLinks: [],
        externalLinks: [],
        revisionNumber: 0,
        status: "pending",
        rejectionFeedback: null,
        submittedAt: fakeTimestamp,
        reviewedAt: null,
      },
    }
    await reviewSubmission({
      reviewerId: "poster-1",
      bountyId: "bounty-1",
      submissionId: "sub-1",
      action: "accept",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "hunter-1",
        type: "bounty_accepted",
      }),
    )
  })
})

describe("reviewSubmission (reject)", () => {
  it("rejects a submission with feedback", async () => {
    setupBountyDoc("bounty-1", {
      status: "submitted",
      posterId: "poster-1",
      currentHunterId: "hunter-1",
    })
    mockDocSnapshots["bountySubmissions/sub-1"] = {
      exists: true,
      id: "sub-1",
      data: {
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        summary: "Done.",
        contentLinks: [],
        externalLinks: [],
        revisionNumber: 0,
        status: "pending",
        rejectionFeedback: null,
        submittedAt: fakeTimestamp,
        reviewedAt: null,
      },
    }
    const result = await reviewSubmission({
      reviewerId: "poster-1",
      bountyId: "bounty-1",
      submissionId: "sub-1",
      action: "reject",
      rejectionFeedback:
        "The summary misses the key methodology comparison that was explicitly requested. Please revise to include a direct comparison of TERT activation approaches.",
    })
    expect(result).toEqual({ success: true })
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "sub-1" }),
      expect.objectContaining({
        status: "rejected",
        rejectionFeedback: expect.any(String),
      }),
    )
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({ status: "rejected" }),
    )
  })

  it("returns bounty to open when max revisions reached", async () => {
    setupBountyDoc("bounty-1", {
      status: "submitted",
      posterId: "poster-1",
      currentHunterId: "hunter-1",
    })
    mockDocSnapshots["bountySubmissions/sub-1"] = {
      exists: true,
      id: "sub-1",
      data: {
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        summary: "Done.",
        contentLinks: [],
        externalLinks: [],
        revisionNumber: 2,
        status: "pending",
        rejectionFeedback: null,
        submittedAt: fakeTimestamp,
        reviewedAt: null,
      },
    }
    const result = await reviewSubmission({
      reviewerId: "poster-1",
      bountyId: "bounty-1",
      submissionId: "sub-1",
      action: "reject",
      rejectionFeedback:
        "The summary misses the key methodology comparison that was explicitly requested. Please revise to include a direct comparison of TERT activation approaches.",
    })
    expect(result).toEqual({ success: true })
    expect(mockBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __id: "bounty-1" }),
      expect.objectContaining({
        status: "open",
        currentHunterId: null,
        currentHunterName: null,
        claimedAt: null,
      }),
    )
  })

  it("sends notification to hunter on reject", async () => {
    setupBountyDoc("bounty-1", {
      status: "submitted",
      posterId: "poster-1",
      currentHunterId: "hunter-1",
    })
    mockDocSnapshots["bountySubmissions/sub-1"] = {
      exists: true,
      id: "sub-1",
      data: {
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        summary: "Done.",
        contentLinks: [],
        externalLinks: [],
        revisionNumber: 0,
        status: "pending",
        rejectionFeedback: null,
        submittedAt: fakeTimestamp,
        reviewedAt: null,
      },
    }
    await reviewSubmission({
      reviewerId: "poster-1",
      bountyId: "bounty-1",
      submissionId: "sub-1",
      action: "reject",
      rejectionFeedback:
        "The summary misses the key methodology comparison that was explicitly requested. Please revise to include a direct comparison of TERT activation approaches.",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "hunter-1",
        type: "bounty_rejected",
      }),
    )
  })

  it("rejects rejection without sufficient feedback", async () => {
    setupBountyDoc("bounty-1", {
      status: "submitted",
      posterId: "poster-1",
    })
    mockDocSnapshots["bountySubmissions/sub-1"] = {
      exists: true,
      id: "sub-1",
      data: {
        bountyId: "bounty-1",
        hunterId: "hunter-1",
        hunterName: "HunterX",
        summary: "Done.",
        contentLinks: [],
        externalLinks: [],
        revisionNumber: 0,
        status: "pending",
        rejectionFeedback: null,
        submittedAt: fakeTimestamp,
        reviewedAt: null,
      },
    }
    const result = await reviewSubmission({
      reviewerId: "poster-1",
      bountyId: "bounty-1",
      submissionId: "sub-1",
      action: "reject",
      rejectionFeedback: "Not good enough",
    })
    expect(result).toEqual({
      success: false,
      reason: "Rejection feedback must be at least 100 characters",
    })
  })
})

describe("getBounties", () => {
  it("returns parsed bounties", async () => {
    mockQueryResults = [
      {
        id: "bounty-1",
        data: () => ({
          posterId: "poster-1",
          posterName: "Dr. Chen",
          title: "Test Bounty",
          description: "A description",
          advancementId: "telomerase",
          bountyType: "research",
          difficulty: "newcomer",
          rewardAmount: 50,
          status: "open",
          deadline: null,
          claimWindowDays: 3,
          currentHunterId: null,
          currentHunterName: null,
          claimedAt: null,
          claimCount: 0,
          relatedContentIds: [],
          isSystemBounty: false,
          createdAt: fakeTimestamp,
          updatedAt: fakeTimestamp,
        }),
        ref: {},
      },
    ]
    const result = await getBounties({})
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("bounty-1")
    expect(result[0]?.title).toBe("Test Bounty")
  })

  it("returns empty array when no bounties", async () => {
    mockQueryResults = []
    const result = await getBounties({})
    expect(result).toEqual([])
  })
})

describe("getBounty", () => {
  it("returns a single parsed bounty", async () => {
    setupBountyDoc("bounty-1")
    const result = await getBounty("bounty-1")
    expect(result?.id).toBe("bounty-1")
    expect(result?.title).toBe("Summarize 3 recent papers on telomere extension")
  })

  it("returns null for nonexistent bounty", async () => {
    const result = await getBounty("nonexistent")
    expect(result).toBeNull()
  })
})

describe("getSubmissionsForBounty", () => {
  it("returns parsed submissions", async () => {
    mockQueryResults = [
      {
        id: "sub-1",
        data: () => ({
          bountyId: "bounty-1",
          hunterId: "hunter-1",
          hunterName: "HunterX",
          summary: "Summary of work done.",
          contentLinks: [],
          externalLinks: [],
          revisionNumber: 0,
          status: "pending",
          rejectionFeedback: null,
          submittedAt: fakeTimestamp,
          reviewedAt: null,
        }),
        ref: {},
      },
    ]
    const result = await getSubmissionsForBounty("bounty-1")
    expect(result).toHaveLength(1)
    expect(result[0]?.bountyId).toBe("bounty-1")
  })

  it("returns empty array when no submissions", async () => {
    mockQueryResults = []
    const result = await getSubmissionsForBounty("bounty-1")
    expect(result).toEqual([])
  })
})
