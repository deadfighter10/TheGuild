import { REP_THRESHOLDS } from "./reputation"
import { isAdmin, type UserRole } from "./user"

export type BountyType =
  | "research"
  | "writing"
  | "review"
  | "data"
  | "discussion"
  | "translation"
  | "curation"

export type BountyDifficulty = "newcomer" | "standard" | "advanced" | "expert"

export type BountyStatus =
  | "draft"
  | "open"
  | "claimed"
  | "submitted"
  | "accepted"
  | "rejected"
  | "abandoned"
  | "expired"
  | "cancelled"

export type SubmissionStatus = "pending" | "accepted" | "rejected"

export const BOUNTY_TYPES: readonly BountyType[] = [
  "research",
  "writing",
  "review",
  "data",
  "discussion",
  "translation",
  "curation",
]

export const BOUNTY_DIFFICULTIES: readonly BountyDifficulty[] = [
  "newcomer",
  "standard",
  "advanced",
  "expert",
]

export const BOUNTY_STATUSES: readonly BountyStatus[] = [
  "draft",
  "open",
  "claimed",
  "submitted",
  "accepted",
  "rejected",
  "abandoned",
  "expired",
  "cancelled",
]

export const SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  "pending",
  "accepted",
  "rejected",
]

type RewardRange = { readonly min: number; readonly max: number }

export const REWARD_RANGES: Record<BountyDifficulty, RewardRange> = {
  newcomer: { min: 15, max: 75 },
  standard: { min: 30, max: 150 },
  advanced: { min: 75, max: 333 },
  expert: { min: 150, max: 666 },
}

export const POSTER_BONUSES: Record<BountyDifficulty, number> = {
  newcomer: 3,
  standard: 5,
  advanced: 7,
  expert: 10,
}

export const CLAIM_WINDOW_DAYS: Record<BountyDifficulty, number> = {
  newcomer: 3,
  standard: 7,
  advanced: 14,
  expert: 21,
}

export type Bounty = {
  readonly id: string
  readonly posterId: string
  readonly posterName: string
  readonly title: string
  readonly description: string
  readonly advancementId: string | null
  readonly bountyType: BountyType
  readonly difficulty: BountyDifficulty
  readonly rewardAmount: number
  readonly status: BountyStatus
  readonly deadline: Date | null
  readonly claimWindowDays: number
  readonly currentHunterId: string | null
  readonly currentHunterName: string | null
  readonly claimedAt: Date | null
  readonly claimCount: number
  readonly relatedContentIds: readonly string[]
  readonly isSystemBounty: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type BountySubmission = {
  readonly id: string
  readonly bountyId: string
  readonly hunterId: string
  readonly hunterName: string
  readonly summary: string
  readonly contentLinks: readonly string[]
  readonly externalLinks: readonly string[]
  readonly revisionNumber: number
  readonly status: SubmissionStatus
  readonly rejectionFeedback: string | null
  readonly submittedAt: Date
  readonly reviewedAt: Date | null
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
export type ValidationResult = ValidationSuccess | ValidationFailure

type CreateBountyRequest = {
  readonly authorRep: number
  readonly authorRole: UserRole
  readonly title: string
  readonly description: string
  readonly difficulty: BountyDifficulty
  readonly rewardAmount: number
}

function validateFieldConstraints(request: {
  readonly title: string
  readonly description: string
  readonly difficulty: BountyDifficulty
  readonly rewardAmount: number
}): ValidationResult {
  const trimmedTitle = request.title.trim()
  if (trimmedTitle.length < 15 || trimmedTitle.length > 200) {
    return { valid: false, reason: "Title must be between 15 and 200 characters" }
  }

  const trimmedDesc = request.description.trim()
  if (trimmedDesc.length < 100 || trimmedDesc.length > 5000) {
    return { valid: false, reason: "Description must be between 100 and 5000 characters" }
  }

  const range = REWARD_RANGES[request.difficulty]
  if (request.rewardAmount < range.min || request.rewardAmount > range.max) {
    return {
      valid: false,
      reason: `Reward must be between ${range.min} and ${range.max} for ${request.difficulty} bounties`,
    }
  }

  return { valid: true }
}

export function validateCreateBounty(request: CreateBountyRequest): ValidationResult {
  if (!isAdmin(request.authorRole) && request.authorRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to post bounties" }
  }

  return validateFieldConstraints(request)
}

type ClaimBountyRequest = {
  readonly hunterRep: number
  readonly hunterRole: UserRole
  readonly hunterId: string
  readonly bounty: Bounty
}

export function validateClaimBounty(request: ClaimBountyRequest): ValidationResult {
  if (!isAdmin(request.hunterRole) && request.hunterRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to claim bounties" }
  }

  if (request.hunterId === request.bounty.posterId) {
    return { valid: false, reason: "You cannot claim your own bounty" }
  }

  if (request.bounty.status !== "open") {
    return { valid: false, reason: "This bounty is not available for claiming" }
  }

  return { valid: true }
}

type SubmitWorkRequest = {
  readonly hunterId: string
  readonly bounty: Bounty
  readonly summary: string
  readonly revisionNumber: number
}

export function validateSubmitWork(request: SubmitWorkRequest): ValidationResult {
  if (request.bounty.status !== "claimed" && request.bounty.status !== "rejected") {
    return { valid: false, reason: "This bounty is not in a submittable state" }
  }

  if (request.hunterId !== request.bounty.currentHunterId) {
    return { valid: false, reason: "Only the current hunter can submit work" }
  }

  const trimmedSummary = request.summary.trim()
  if (trimmedSummary.length < 100 || trimmedSummary.length > 2000) {
    return { valid: false, reason: "Summary must be between 100 and 2000 characters" }
  }

  if (request.revisionNumber > 2) {
    return { valid: false, reason: "Maximum of 2 revisions allowed" }
  }

  return { valid: true }
}

type ReviewSubmissionRequest = {
  readonly reviewerId: string
  readonly posterId: string
  readonly submission: BountySubmission
  readonly action: "accept" | "reject"
  readonly rejectionFeedback?: string
}

export function validateReviewSubmission(request: ReviewSubmissionRequest): ValidationResult {
  if (request.reviewerId !== request.posterId) {
    return { valid: false, reason: "Only the bounty poster can review submissions" }
  }

  if (request.submission.status !== "pending") {
    return { valid: false, reason: "This submission is not pending review" }
  }

  if (request.action === "reject") {
    const feedback = request.rejectionFeedback?.trim() ?? ""
    if (feedback.length < 100) {
      return { valid: false, reason: "Rejection feedback must be at least 100 characters" }
    }
  }

  return { valid: true }
}

type CancelBountyRequest = {
  readonly userId: string
  readonly bounty: Bounty
}

export function validateCancelBounty(request: CancelBountyRequest): ValidationResult {
  if (request.userId !== request.bounty.posterId) {
    return { valid: false, reason: "Only the poster can cancel this bounty" }
  }

  if (request.bounty.status !== "draft" && request.bounty.status !== "open") {
    return { valid: false, reason: "Can only cancel draft or open bounties" }
  }

  return { valid: true }
}

type UpdateBountyRequest = {
  readonly userId: string
  readonly bounty: Bounty
  readonly title: string
  readonly description: string
  readonly difficulty: BountyDifficulty
  readonly rewardAmount: number
}

export function validateUpdateBounty(request: UpdateBountyRequest): ValidationResult {
  if (request.userId !== request.bounty.posterId) {
    return { valid: false, reason: "Only the poster can update this bounty" }
  }

  if (request.bounty.status !== "draft") {
    return { valid: false, reason: "Can only update draft bounties" }
  }

  return validateFieldConstraints(request)
}

const VALID_TRANSITIONS: Record<BountyStatus, readonly BountyStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["claimed", "expired", "cancelled"],
  claimed: ["submitted", "abandoned"],
  submitted: ["accepted", "rejected"],
  accepted: [],
  rejected: ["submitted", "open"],
  abandoned: ["open"],
  expired: [],
  cancelled: [],
}

export function isValidTransition(from: BountyStatus, to: BountyStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}
