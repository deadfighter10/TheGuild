import { describe, it, expect } from "vitest"
import {
  BOUNTY_TYPES,
  BOUNTY_DIFFICULTIES,
  BOUNTY_STATUSES,
  SUBMISSION_STATUSES,
  REWARD_RANGES,
  POSTER_BONUSES,
  CLAIM_WINDOW_DAYS,
  validateCreateBounty,
  validateClaimBounty,
  validateSubmitWork,
  validateReviewSubmission,
  validateCancelBounty,
  validateUpdateBounty,
  isValidTransition,
  type BountyType,
  type BountyDifficulty,
  type BountyStatus,
  type SubmissionStatus,
  type Bounty,
  type BountySubmission,
} from "./bounty"

function makeBounty(overrides: Partial<Bounty> = {}): Bounty {
  return {
    id: "bounty-1",
    posterId: "poster-1",
    posterName: "Dr. Chen",
    title: "Summarize 3 recent papers on telomere extension",
    description: "Read three 2025-2026 papers on telomere extension using TERT activation and write a summary.",
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
    createdAt: new Date("2026-03-20"),
    updatedAt: new Date("2026-03-20"),
    ...overrides,
  }
}

function makeSubmission(overrides: Partial<BountySubmission> = {}): BountySubmission {
  return {
    id: "sub-1",
    bountyId: "bounty-1",
    hunterId: "hunter-1",
    hunterName: "HunterX",
    summary: "I summarized the three papers as requested, covering key findings on telomere extension in human cell lines.",
    contentLinks: [],
    externalLinks: [],
    revisionNumber: 0,
    status: "pending",
    rejectionFeedback: null,
    submittedAt: new Date("2026-03-21"),
    reviewedAt: null,
    ...overrides,
  }
}

describe("Bounty types and constants", () => {
  it("defines seven bounty types", () => {
    expect(BOUNTY_TYPES).toEqual([
      "research",
      "writing",
      "review",
      "data",
      "discussion",
      "translation",
      "curation",
    ])
  })

  it("defines four difficulty tiers", () => {
    expect(BOUNTY_DIFFICULTIES).toEqual([
      "newcomer",
      "standard",
      "advanced",
      "expert",
    ])
  })

  it("defines all bounty statuses", () => {
    expect(BOUNTY_STATUSES).toEqual([
      "draft",
      "open",
      "claimed",
      "submitted",
      "accepted",
      "rejected",
      "abandoned",
      "expired",
      "cancelled",
    ])
  })

  it("defines submission statuses", () => {
    expect(SUBMISSION_STATUSES).toEqual(["pending", "accepted", "rejected"])
  })

  it("maps reward ranges per difficulty", () => {
    expect(REWARD_RANGES).toEqual({
      newcomer: { min: 15, max: 75 },
      standard: { min: 30, max: 150 },
      advanced: { min: 75, max: 333 },
      expert: { min: 150, max: 666 },
    })
  })

  it("maps poster bonuses per difficulty", () => {
    expect(POSTER_BONUSES).toEqual({
      newcomer: 3,
      standard: 5,
      advanced: 7,
      expert: 10,
    })
  })

  it("maps claim window days per difficulty", () => {
    expect(CLAIM_WINDOW_DAYS).toEqual({
      newcomer: 3,
      standard: 7,
      advanced: 14,
      expert: 21,
    })
  })

  it("Bounty type satisfies readonly shape", () => {
    const bounty: Bounty = {
      id: "bounty-1",
      posterId: "user-1",
      posterName: "Dr. Chen",
      title: "Summarize 3 recent papers",
      description: "Read three 2025-2026 papers on telomere extension and write a summary.",
      advancementId: "telomerase",
      bountyType: "research",
      difficulty: "newcomer",
      rewardAmount: 50,
      status: "draft",
      deadline: null,
      claimWindowDays: 3,
      currentHunterId: null,
      currentHunterName: null,
      claimedAt: null,
      claimCount: 0,
      relatedContentIds: [],
      isSystemBounty: false,
      createdAt: new Date("2026-03-20"),
      updatedAt: new Date("2026-03-20"),
    }
    expect(bounty.id).toBe("bounty-1")
    expect(bounty.status).toBe("draft")
  })

  it("BountySubmission type satisfies readonly shape", () => {
    const submission: BountySubmission = {
      id: "sub-1",
      bountyId: "bounty-1",
      hunterId: "user-2",
      hunterName: "HunterX",
      summary: "I summarized the three papers as requested, covering key findings on telomere extension.",
      contentLinks: ["/advancements/telomerase/library/entry-1"],
      externalLinks: ["https://example.com/paper1"],
      revisionNumber: 0,
      status: "pending",
      rejectionFeedback: null,
      submittedAt: new Date("2026-03-21"),
      reviewedAt: null,
    }
    expect(submission.id).toBe("sub-1")
    expect(submission.status).toBe("pending")
  })

  it("type unions are exhaustive", () => {
    const type: BountyType = "research"
    const diff: BountyDifficulty = "newcomer"
    const status: BountyStatus = "draft"
    const subStatus: SubmissionStatus = "pending"
    expect([type, diff, status, subStatus]).toHaveLength(4)
  })
})

describe("validateCreateBounty", () => {
  const validRequest = {
    authorRep: 100,
    authorRole: "user" as const,
    title: "Summarize 3 papers on telomere extension",
    description:
      "Read three 2025-2026 papers on telomere extension using TERT activation. Write a 500-word summary comparing their methodologies and results.",
    difficulty: "newcomer" as const,
    rewardAmount: 50,
  }

  it("accepts a valid bounty from a contributor", () => {
    expect(validateCreateBounty(validRequest)).toEqual({ valid: true })
  })

  it("accepts a valid bounty from an admin with 0 rep", () => {
    expect(
      validateCreateBounty({ ...validRequest, authorRep: 0, authorRole: "admin" }),
    ).toEqual({ valid: true })
  })

  it("rejects when rep is below 100", () => {
    expect(
      validateCreateBounty({ ...validRequest, authorRep: 99 }),
    ).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to post bounties",
    })
  })

  it("rejects a title shorter than 15 characters", () => {
    expect(
      validateCreateBounty({ ...validRequest, title: "Short title" }),
    ).toEqual({
      valid: false,
      reason: "Title must be between 15 and 200 characters",
    })
  })

  it("rejects a title longer than 200 characters", () => {
    expect(
      validateCreateBounty({ ...validRequest, title: "A".repeat(201) }),
    ).toEqual({
      valid: false,
      reason: "Title must be between 15 and 200 characters",
    })
  })

  it("rejects a title that is only whitespace", () => {
    expect(
      validateCreateBounty({ ...validRequest, title: "               " }),
    ).toEqual({
      valid: false,
      reason: "Title must be between 15 and 200 characters",
    })
  })

  it("rejects a description shorter than 100 characters", () => {
    expect(
      validateCreateBounty({ ...validRequest, description: "Too short." }),
    ).toEqual({
      valid: false,
      reason: "Description must be between 100 and 5000 characters",
    })
  })

  it("rejects a description longer than 5000 characters", () => {
    expect(
      validateCreateBounty({ ...validRequest, description: "A".repeat(5001) }),
    ).toEqual({
      valid: false,
      reason: "Description must be between 100 and 5000 characters",
    })
  })

  it("rejects a reward below the difficulty minimum", () => {
    expect(
      validateCreateBounty({ ...validRequest, rewardAmount: 14 }),
    ).toEqual({
      valid: false,
      reason: "Reward must be between 15 and 75 for newcomer bounties",
    })
  })

  it("rejects a reward above the difficulty maximum", () => {
    expect(
      validateCreateBounty({ ...validRequest, rewardAmount: 76 }),
    ).toEqual({
      valid: false,
      reason: "Reward must be between 15 and 75 for newcomer bounties",
    })
  })

  it("accepts reward at exact boundary (min)", () => {
    expect(
      validateCreateBounty({ ...validRequest, rewardAmount: 15 }),
    ).toEqual({ valid: true })
  })

  it("accepts reward at exact boundary (max)", () => {
    expect(
      validateCreateBounty({ ...validRequest, rewardAmount: 75 }),
    ).toEqual({ valid: true })
  })

  it("validates reward against the correct difficulty range", () => {
    expect(
      validateCreateBounty({
        ...validRequest,
        difficulty: "expert",
        rewardAmount: 666,
      }),
    ).toEqual({ valid: true })

    expect(
      validateCreateBounty({
        ...validRequest,
        difficulty: "expert",
        rewardAmount: 667,
      }),
    ).toEqual({
      valid: false,
      reason: "Reward must be between 150 and 666 for expert bounties",
    })
  })
})

describe("validateClaimBounty", () => {
  it("allows a contributor to claim an open bounty", () => {
    const bounty = makeBounty({ status: "open", posterId: "poster-1" })
    expect(
      validateClaimBounty({ hunterRep: 100, hunterRole: "user", hunterId: "hunter-1", bounty }),
    ).toEqual({ valid: true })
  })

  it("allows an admin to claim regardless of rep", () => {
    const bounty = makeBounty({ status: "open", posterId: "poster-1" })
    expect(
      validateClaimBounty({ hunterRep: 0, hunterRole: "admin", hunterId: "hunter-1", bounty }),
    ).toEqual({ valid: true })
  })

  it("rejects when rep is below 100", () => {
    const bounty = makeBounty({ status: "open" })
    expect(
      validateClaimBounty({ hunterRep: 99, hunterRole: "user", hunterId: "hunter-1", bounty }),
    ).toEqual({ valid: false, reason: "You need at least 100 Rep to claim bounties" })
  })

  it("rejects claiming your own bounty", () => {
    const bounty = makeBounty({ status: "open", posterId: "hunter-1" })
    expect(
      validateClaimBounty({ hunterRep: 100, hunterRole: "user", hunterId: "hunter-1", bounty }),
    ).toEqual({ valid: false, reason: "You cannot claim your own bounty" })
  })

  it("rejects claiming a non-open bounty", () => {
    const bounty = makeBounty({ status: "claimed" })
    expect(
      validateClaimBounty({ hunterRep: 100, hunterRole: "user", hunterId: "hunter-1", bounty }),
    ).toEqual({ valid: false, reason: "This bounty is not available for claiming" })
  })

  it("rejects claiming a draft bounty", () => {
    const bounty = makeBounty({ status: "draft" })
    expect(
      validateClaimBounty({ hunterRep: 100, hunterRole: "user", hunterId: "hunter-1", bounty }),
    ).toEqual({ valid: false, reason: "This bounty is not available for claiming" })
  })
})

describe("validateSubmitWork", () => {
  it("allows the current hunter to submit work on a claimed bounty", () => {
    const bounty = makeBounty({ status: "claimed", currentHunterId: "hunter-1" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-1",
        bounty,
        summary: "I completed the research as described. Here are the three papers I found and summarized with key findings.",
        revisionNumber: 0,
      }),
    ).toEqual({ valid: true })
  })

  it("allows resubmission on a rejected bounty", () => {
    const bounty = makeBounty({ status: "rejected", currentHunterId: "hunter-1" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-1",
        bounty,
        summary: "I revised the submission based on the feedback. Here are the updated findings with additional citations.",
        revisionNumber: 1,
      }),
    ).toEqual({ valid: true })
  })

  it("rejects if bounty is not claimed or rejected", () => {
    const bounty = makeBounty({ status: "open" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-1",
        bounty,
        summary: "Some work that was done on this bounty summarizing the three papers on telomere extension.",
        revisionNumber: 0,
      }),
    ).toEqual({ valid: false, reason: "This bounty is not in a submittable state" })
  })

  it("rejects if submitter is not the current hunter", () => {
    const bounty = makeBounty({ status: "claimed", currentHunterId: "hunter-1" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-2",
        bounty,
        summary: "Some work that was done on this bounty summarizing the three papers on telomere extension.",
        revisionNumber: 0,
      }),
    ).toEqual({ valid: false, reason: "Only the current hunter can submit work" })
  })

  it("rejects a summary shorter than 100 characters", () => {
    const bounty = makeBounty({ status: "claimed", currentHunterId: "hunter-1" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-1",
        bounty,
        summary: "Too short.",
        revisionNumber: 0,
      }),
    ).toEqual({ valid: false, reason: "Summary must be between 100 and 2000 characters" })
  })

  it("rejects a summary longer than 2000 characters", () => {
    const bounty = makeBounty({ status: "claimed", currentHunterId: "hunter-1" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-1",
        bounty,
        summary: "A".repeat(2001),
        revisionNumber: 0,
      }),
    ).toEqual({ valid: false, reason: "Summary must be between 100 and 2000 characters" })
  })

  it("rejects revision number greater than 2", () => {
    const bounty = makeBounty({ status: "rejected", currentHunterId: "hunter-1" })
    expect(
      validateSubmitWork({
        hunterId: "hunter-1",
        bounty,
        summary: "I completed the research as described. Here are the three papers I found and summarized with key findings.",
        revisionNumber: 3,
      }),
    ).toEqual({ valid: false, reason: "Maximum of 2 revisions allowed" })
  })
})

describe("validateReviewSubmission", () => {
  it("allows the poster to accept a pending submission", () => {
    const submission = makeSubmission({ status: "pending" })
    expect(
      validateReviewSubmission({
        reviewerId: "poster-1",
        posterId: "poster-1",
        submission,
        action: "accept",
      }),
    ).toEqual({ valid: true })
  })

  it("allows the poster to reject with sufficient feedback", () => {
    const submission = makeSubmission({ status: "pending" })
    expect(
      validateReviewSubmission({
        reviewerId: "poster-1",
        posterId: "poster-1",
        submission,
        action: "reject",
        rejectionFeedback: "The summary misses the key methodology comparison that was explicitly requested. Please revise to include a direct comparison of TERT activation approaches.",
      }),
    ).toEqual({ valid: true })
  })

  it("rejects review by non-poster", () => {
    const submission = makeSubmission({ status: "pending" })
    expect(
      validateReviewSubmission({
        reviewerId: "random-user",
        posterId: "poster-1",
        submission,
        action: "accept",
      }),
    ).toEqual({ valid: false, reason: "Only the bounty poster can review submissions" })
  })

  it("rejects accepting a non-pending submission", () => {
    const submission = makeSubmission({ status: "accepted" })
    expect(
      validateReviewSubmission({
        reviewerId: "poster-1",
        posterId: "poster-1",
        submission,
        action: "accept",
      }),
    ).toEqual({ valid: false, reason: "This submission is not pending review" })
  })

  it("rejects rejection without feedback", () => {
    const submission = makeSubmission({ status: "pending" })
    expect(
      validateReviewSubmission({
        reviewerId: "poster-1",
        posterId: "poster-1",
        submission,
        action: "reject",
      }),
    ).toEqual({ valid: false, reason: "Rejection feedback must be at least 100 characters" })
  })

  it("rejects rejection with feedback shorter than 100 characters", () => {
    const submission = makeSubmission({ status: "pending" })
    expect(
      validateReviewSubmission({
        reviewerId: "poster-1",
        posterId: "poster-1",
        submission,
        action: "reject",
        rejectionFeedback: "Not good enough",
      }),
    ).toEqual({ valid: false, reason: "Rejection feedback must be at least 100 characters" })
  })
})

describe("validateCancelBounty", () => {
  it("allows the poster to cancel a draft bounty", () => {
    const bounty = makeBounty({ status: "draft", posterId: "poster-1" })
    expect(
      validateCancelBounty({ userId: "poster-1", bounty }),
    ).toEqual({ valid: true })
  })

  it("allows the poster to cancel an open bounty", () => {
    const bounty = makeBounty({ status: "open", posterId: "poster-1" })
    expect(
      validateCancelBounty({ userId: "poster-1", bounty }),
    ).toEqual({ valid: true })
  })

  it("rejects cancellation by non-poster", () => {
    const bounty = makeBounty({ status: "open", posterId: "poster-1" })
    expect(
      validateCancelBounty({ userId: "other-user", bounty }),
    ).toEqual({ valid: false, reason: "Only the poster can cancel this bounty" })
  })

  it("rejects cancelling a claimed bounty", () => {
    const bounty = makeBounty({ status: "claimed", posterId: "poster-1" })
    expect(
      validateCancelBounty({ userId: "poster-1", bounty }),
    ).toEqual({ valid: false, reason: "Can only cancel draft or open bounties" })
  })

  it("rejects cancelling an accepted bounty", () => {
    const bounty = makeBounty({ status: "accepted", posterId: "poster-1" })
    expect(
      validateCancelBounty({ userId: "poster-1", bounty }),
    ).toEqual({ valid: false, reason: "Can only cancel draft or open bounties" })
  })
})

describe("validateUpdateBounty", () => {
  const validUpdate = {
    userId: "poster-1",
    bounty: makeBounty({ status: "draft", posterId: "poster-1" }),
    title: "Updated title for the bounty",
    description:
      "An updated description that is long enough to pass validation. It must be at least 100 characters to satisfy the constraint.",
    difficulty: "standard" as const,
    rewardAmount: 100,
  }

  it("allows the poster to update a draft bounty", () => {
    expect(validateUpdateBounty(validUpdate)).toEqual({ valid: true })
  })

  it("rejects update by non-poster", () => {
    expect(
      validateUpdateBounty({ ...validUpdate, userId: "other-user" }),
    ).toEqual({ valid: false, reason: "Only the poster can update this bounty" })
  })

  it("rejects updating a non-draft bounty", () => {
    expect(
      validateUpdateBounty({
        ...validUpdate,
        bounty: makeBounty({ status: "open", posterId: "poster-1" }),
      }),
    ).toEqual({ valid: false, reason: "Can only update draft bounties" })
  })

  it("applies the same field constraints as create", () => {
    expect(
      validateUpdateBounty({ ...validUpdate, title: "Short" }),
    ).toEqual({
      valid: false,
      reason: "Title must be between 15 and 200 characters",
    })

    expect(
      validateUpdateBounty({ ...validUpdate, description: "Too short." }),
    ).toEqual({
      valid: false,
      reason: "Description must be between 100 and 5000 characters",
    })

    expect(
      validateUpdateBounty({
        ...validUpdate,
        difficulty: "standard",
        rewardAmount: 151,
      }),
    ).toEqual({
      valid: false,
      reason: "Reward must be between 30 and 150 for standard bounties",
    })
  })
})

describe("isValidTransition", () => {
  it("allows draft -> open", () => {
    expect(isValidTransition("draft", "open")).toBe(true)
  })

  it("allows draft -> cancelled", () => {
    expect(isValidTransition("draft", "cancelled")).toBe(true)
  })

  it("allows open -> claimed", () => {
    expect(isValidTransition("open", "claimed")).toBe(true)
  })

  it("allows open -> expired", () => {
    expect(isValidTransition("open", "expired")).toBe(true)
  })

  it("allows open -> cancelled", () => {
    expect(isValidTransition("open", "cancelled")).toBe(true)
  })

  it("allows claimed -> submitted", () => {
    expect(isValidTransition("claimed", "submitted")).toBe(true)
  })

  it("allows claimed -> abandoned", () => {
    expect(isValidTransition("claimed", "abandoned")).toBe(true)
  })

  it("allows submitted -> accepted", () => {
    expect(isValidTransition("submitted", "accepted")).toBe(true)
  })

  it("allows submitted -> rejected", () => {
    expect(isValidTransition("submitted", "rejected")).toBe(true)
  })

  it("allows rejected -> submitted (revision)", () => {
    expect(isValidTransition("rejected", "submitted")).toBe(true)
  })

  it("allows rejected -> open (max revisions reached)", () => {
    expect(isValidTransition("rejected", "open")).toBe(true)
  })

  it("allows abandoned -> open", () => {
    expect(isValidTransition("abandoned", "open")).toBe(true)
  })

  it("rejects invalid transitions", () => {
    expect(isValidTransition("draft", "claimed")).toBe(false)
    expect(isValidTransition("open", "submitted")).toBe(false)
    expect(isValidTransition("claimed", "accepted")).toBe(false)
    expect(isValidTransition("accepted", "open")).toBe(false)
    expect(isValidTransition("cancelled", "open")).toBe(false)
    expect(isValidTransition("expired", "open")).toBe(false)
  })
})
