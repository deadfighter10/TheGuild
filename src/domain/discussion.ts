import { REP_THRESHOLDS } from "./reputation"
import { isAdmin } from "./user"

export type DiscussionThread = {
  readonly id: string
  readonly advancementId: string
  readonly authorId: string
  readonly authorName: string
  readonly title: string
  readonly body: string
  readonly replyCount: number
  readonly lastActivityAt: Date
  readonly createdAt: Date
}

export type DiscussionReply = {
  readonly id: string
  readonly threadId: string
  readonly authorId: string
  readonly authorName: string
  readonly body: string
  readonly createdAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type CreateThreadRequest = {
  readonly authorRep: number
  readonly title: string
  readonly body: string
}

type CreateReplyRequest = {
  readonly authorRep: number
  readonly body: string
}

export function validateCreateThread(request: CreateThreadRequest): ValidationResult {
  if (!isAdmin(request.authorRep) && request.authorRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to start a discussion" }
  }

  if (!request.title.trim()) {
    return { valid: false, reason: "Title is required" }
  }

  if (request.title.trim().length < 5) {
    return { valid: false, reason: "Title must be at least 5 characters" }
  }

  if (!request.body.trim()) {
    return { valid: false, reason: "Body is required" }
  }

  return { valid: true }
}

export function validateCreateReply(request: CreateReplyRequest): ValidationResult {
  if (!isAdmin(request.authorRep) && request.authorRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to reply" }
  }

  if (!request.body.trim()) {
    return { valid: false, reason: "Reply cannot be empty" }
  }

  return { valid: true }
}
