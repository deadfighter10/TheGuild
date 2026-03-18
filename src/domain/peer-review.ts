import { REP_THRESHOLDS } from "./reputation"
import { isAdmin } from "./user"

export type PeerReviewContentType = "node" | "libraryEntry"

export type PeerReviewStatus = "pending" | "in_review" | "approved" | "needs_revision" | "rejected"

export type PeerReviewDecision = "approved" | "needs_revision" | "rejected"

export type FeedbackScore = {
  readonly score: number
  readonly comment: string
}

export type ReviewFeedback = {
  readonly accuracy: FeedbackScore
  readonly clarity: FeedbackScore
  readonly novelty: FeedbackScore
  readonly evidenceQuality: FeedbackScore
  readonly summary: string
}

export type PeerReview = {
  readonly id: string
  readonly contentType: PeerReviewContentType
  readonly contentId: string
  readonly contentTitle: string
  readonly advancementId: string
  readonly authorId: string
  readonly authorName: string
  readonly status: PeerReviewStatus
  readonly reviewerId: string | null
  readonly reviewerName: string | null
  readonly feedback: ReviewFeedback | null
  readonly decision: PeerReviewDecision | null
  readonly submittedAt: Date
  readonly reviewedAt: Date | null
}

export const REVIEW_STATUSES: readonly { readonly value: PeerReviewStatus; readonly label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "rejected", label: "Rejected" },
] as const

export const FEEDBACK_CATEGORIES: readonly { readonly key: keyof Omit<ReviewFeedback, "summary">; readonly label: string; readonly description: string }[] = [
  { key: "accuracy", label: "Accuracy", description: "Is the content factually correct and well-researched?" },
  { key: "clarity", label: "Clarity", description: "Is the content clearly written and well-structured?" },
  { key: "novelty", label: "Novelty", description: "Does the content contribute new ideas or perspectives?" },
  { key: "evidenceQuality", label: "Evidence Quality", description: "Is the content supported by strong evidence?" },
] as const

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type SubmitForReviewRequest = {
  readonly authorId: string
  readonly userId: string
  readonly userRep: number
  readonly contentTitle: string
  readonly hasExistingReview: boolean
}

type ClaimReviewRequest = {
  readonly reviewerId: string
  readonly reviewerRep: number
  readonly authorId: string
  readonly currentStatus: PeerReviewStatus
}

type SubmitFeedbackRequest = {
  readonly reviewerId: string
  readonly assignedReviewerId: string
  readonly currentStatus: PeerReviewStatus
  readonly feedback: ReviewFeedback
  readonly decision: PeerReviewDecision
}

const VALID_DECISIONS: readonly PeerReviewDecision[] = ["approved", "needs_revision", "rejected"]

export function validateSubmitForReview(request: SubmitForReviewRequest): ValidationResult {
  if (request.authorId !== request.userId) {
    return { valid: false, reason: "Only the author can submit content for review" }
  }

  if (!isAdmin(request.userRep) && request.userRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to submit for review" }
  }

  if (!request.contentTitle.trim()) {
    return { valid: false, reason: "Content title is required" }
  }

  if (request.hasExistingReview) {
    return { valid: false, reason: "This content already has an active review" }
  }

  return { valid: true }
}

export function validateClaimReview(request: ClaimReviewRequest): ValidationResult {
  if (request.reviewerId === request.authorId) {
    return { valid: false, reason: "You cannot review your own content" }
  }

  if (!isAdmin(request.reviewerRep) && request.reviewerRep < REP_THRESHOLDS.moderatorMin) {
    return { valid: false, reason: "You need at least 3000 Rep to review content" }
  }

  if (request.currentStatus !== "pending") {
    return { valid: false, reason: "This review has already been claimed" }
  }

  return { valid: true }
}

export function validateSubmitFeedback(request: SubmitFeedbackRequest): ValidationResult {
  if (request.reviewerId !== request.assignedReviewerId) {
    return { valid: false, reason: "Only the assigned reviewer can submit feedback" }
  }

  if (request.currentStatus !== "in_review") {
    return { valid: false, reason: "This review is not currently in review" }
  }

  const scores = [
    request.feedback.accuracy.score,
    request.feedback.clarity.score,
    request.feedback.novelty.score,
    request.feedback.evidenceQuality.score,
  ]

  if (scores.some((s) => s < 1 || s > 5)) {
    return { valid: false, reason: "All scores must be between 1 and 5" }
  }

  if (!request.feedback.summary.trim()) {
    return { valid: false, reason: "A summary is required" }
  }

  if (!VALID_DECISIONS.includes(request.decision)) {
    return { valid: false, reason: "Decision must be approved, needs_revision, or rejected" }
  }

  return { valid: true }
}

export function canSubmitForReview(rep: number): boolean {
  return isAdmin(rep) || rep >= REP_THRESHOLDS.contributorMin
}

export function canReviewContent(rep: number): boolean {
  return isAdmin(rep) || rep >= REP_THRESHOLDS.moderatorMin
}
