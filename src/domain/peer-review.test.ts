import { describe, it, expect } from "vitest"
import {
  validateSubmitForReview,
  validateClaimReview,
  validateSubmitFeedback,
  canSubmitForReview,
  canReviewContent,
  REVIEW_STATUSES,
  FEEDBACK_CATEGORIES,
  type PeerReviewStatus,
  type ReviewFeedback,
} from "./peer-review"

describe("validateSubmitForReview", () => {
  it("returns valid for a contributor submitting their own content", () => {
    const result = validateSubmitForReview({
      authorId: "user-1",
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      contentTitle: "My Idea",
      hasExistingReview: false,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when user is not the author", () => {
    const result = validateSubmitForReview({
      authorId: "user-1",
      userId: "user-2",
      userRep: 100,
      userRole: "user",
      contentTitle: "Someone Else's Idea",
      hasExistingReview: false,
    })
    expect(result).toEqual({ valid: false, reason: "Only the author can submit content for review" })
  })

  it("rejects when user has insufficient rep", () => {
    const result = validateSubmitForReview({
      authorId: "user-1",
      userId: "user-1",
      userRep: 50,
      userRole: "user",
      contentTitle: "My Idea",
      hasExistingReview: false,
    })
    expect(result).toEqual({ valid: false, reason: "You need at least 100 Rep to submit for review" })
  })

  it("allows admin regardless of rep", () => {
    const result = validateSubmitForReview({
      authorId: "user-1",
      userId: "user-1",
      userRep: 0,
      userRole: "admin",
      contentTitle: "My Idea",
      hasExistingReview: false,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when content already has a pending or in-review review", () => {
    const result = validateSubmitForReview({
      authorId: "user-1",
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      contentTitle: "My Idea",
      hasExistingReview: true,
    })
    expect(result).toEqual({ valid: false, reason: "This content already has an active review" })
  })

  it("rejects when content title is empty", () => {
    const result = validateSubmitForReview({
      authorId: "user-1",
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      contentTitle: "  ",
      hasExistingReview: false,
    })
    expect(result).toEqual({ valid: false, reason: "Content title is required" })
  })
})

describe("validateClaimReview", () => {
  it("returns valid for a moderator claiming a pending review", () => {
    const result = validateClaimReview({
      reviewerId: "mod-1",
      reviewerRep: 3000,
      reviewerRole: "user",
      authorId: "user-1",
      currentStatus: "pending",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when reviewer is the content author", () => {
    const result = validateClaimReview({
      reviewerId: "user-1",
      reviewerRep: 3000,
      reviewerRole: "user",
      authorId: "user-1",
      currentStatus: "pending",
    })
    expect(result).toEqual({ valid: false, reason: "You cannot review your own content" })
  })

  it("rejects when reviewer has insufficient rep", () => {
    const result = validateClaimReview({
      reviewerId: "user-2",
      reviewerRep: 2999,
      reviewerRole: "user",
      authorId: "user-1",
      currentStatus: "pending",
    })
    expect(result).toEqual({ valid: false, reason: "You need at least 3000 Rep to review content" })
  })

  it("allows admin regardless of rep", () => {
    const result = validateClaimReview({
      reviewerId: "admin-1",
      reviewerRep: 0,
      reviewerRole: "admin",
      authorId: "user-1",
      currentStatus: "pending",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when review is not in pending status", () => {
    const result = validateClaimReview({
      reviewerId: "mod-1",
      reviewerRep: 3000,
      reviewerRole: "user",
      authorId: "user-1",
      currentStatus: "in_review",
    })
    expect(result).toEqual({ valid: false, reason: "This review has already been claimed" })
  })

  it("rejects when review is already completed", () => {
    const statuses: PeerReviewStatus[] = ["approved", "needs_revision", "rejected"]
    for (const status of statuses) {
      const result = validateClaimReview({
        reviewerId: "mod-1",
        reviewerRep: 3000,
        reviewerRole: "user",
        authorId: "user-1",
        currentStatus: status,
      })
      expect(result).toEqual({ valid: false, reason: "This review has already been claimed" })
    }
  })
})

describe("validateSubmitFeedback", () => {
  const validFeedback: ReviewFeedback = {
    accuracy: { score: 4, comment: "Well-researched" },
    clarity: { score: 3, comment: "Could be clearer" },
    novelty: { score: 5, comment: "Highly original" },
    evidenceQuality: { score: 4, comment: "Strong evidence" },
    summary: "Good work overall",
  }

  it("returns valid for complete feedback with valid scores", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-1",
      assignedReviewerId: "mod-1",
      currentStatus: "in_review",
      feedback: validFeedback,
      decision: "approved",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects when submitter is not the assigned reviewer", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-2",
      assignedReviewerId: "mod-1",
      currentStatus: "in_review",
      feedback: validFeedback,
      decision: "approved",
    })
    expect(result).toEqual({ valid: false, reason: "Only the assigned reviewer can submit feedback" })
  })

  it("rejects when review is not in in_review status", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-1",
      assignedReviewerId: "mod-1",
      currentStatus: "pending",
      feedback: validFeedback,
      decision: "approved",
    })
    expect(result).toEqual({ valid: false, reason: "This review is not currently in review" })
  })

  it("rejects when a score is below 1", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-1",
      assignedReviewerId: "mod-1",
      currentStatus: "in_review",
      feedback: { ...validFeedback, accuracy: { score: 0, comment: "Bad" } },
      decision: "approved",
    })
    expect(result).toEqual({ valid: false, reason: "All scores must be between 1 and 5" })
  })

  it("rejects when a score is above 5", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-1",
      assignedReviewerId: "mod-1",
      currentStatus: "in_review",
      feedback: { ...validFeedback, novelty: { score: 6, comment: "Amazing" } },
      decision: "approved",
    })
    expect(result).toEqual({ valid: false, reason: "All scores must be between 1 and 5" })
  })

  it("rejects when summary is empty", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-1",
      assignedReviewerId: "mod-1",
      currentStatus: "in_review",
      feedback: { ...validFeedback, summary: "  " },
      decision: "approved",
    })
    expect(result).toEqual({ valid: false, reason: "A summary is required" })
  })

  it("rejects invalid decision", () => {
    const result = validateSubmitFeedback({
      reviewerId: "mod-1",
      assignedReviewerId: "mod-1",
      currentStatus: "in_review",
      feedback: validFeedback,
      decision: "pending" as "approved",
    })
    expect(result).toEqual({ valid: false, reason: "Decision must be approved, needs_revision, or rejected" })
  })

  it("accepts needs_revision and rejected as valid decisions", () => {
    for (const decision of ["needs_revision", "rejected"] as const) {
      const result = validateSubmitFeedback({
        reviewerId: "mod-1",
        assignedReviewerId: "mod-1",
        currentStatus: "in_review",
        feedback: validFeedback,
        decision,
      })
      expect(result).toEqual({ valid: true })
    }
  })
})

describe("canSubmitForReview", () => {
  it("returns true for contributors", () => {
    expect(canSubmitForReview(100, "user")).toBe(true)
    expect(canSubmitForReview(500, "user")).toBe(true)
  })

  it("returns true for admin regardless of rep", () => {
    expect(canSubmitForReview(0, "admin")).toBe(true)
  })

  it("returns false for observers", () => {
    expect(canSubmitForReview(0, "user")).toBe(false)
    expect(canSubmitForReview(99, "user")).toBe(false)
  })
})

describe("canReviewContent", () => {
  it("returns true for moderators", () => {
    expect(canReviewContent(3000, "user")).toBe(true)
    expect(canReviewContent(5000, "user")).toBe(true)
  })

  it("returns true for admin regardless of rep", () => {
    expect(canReviewContent(0, "admin")).toBe(true)
  })

  it("returns false for regular contributors", () => {
    expect(canReviewContent(100, "user")).toBe(false)
    expect(canReviewContent(2999, "user")).toBe(false)
  })

  it("returns false for observers", () => {
    expect(canReviewContent(0, "user")).toBe(false)
  })
})

describe("REVIEW_STATUSES", () => {
  it("defines 5 statuses", () => {
    expect(REVIEW_STATUSES).toHaveLength(5)
  })

  it("has unique values", () => {
    const values = REVIEW_STATUSES.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it("includes all expected statuses", () => {
    const values = REVIEW_STATUSES.map((s) => s.value)
    expect(values).toContain("pending")
    expect(values).toContain("in_review")
    expect(values).toContain("approved")
    expect(values).toContain("needs_revision")
    expect(values).toContain("rejected")
  })
})

describe("FEEDBACK_CATEGORIES", () => {
  it("defines 4 categories", () => {
    expect(FEEDBACK_CATEGORIES).toHaveLength(4)
  })

  it("includes accuracy, clarity, novelty, and evidence quality", () => {
    const keys = FEEDBACK_CATEGORIES.map((c) => c.key)
    expect(keys).toContain("accuracy")
    expect(keys).toContain("clarity")
    expect(keys).toContain("novelty")
    expect(keys).toContain("evidenceQuality")
  })
})
