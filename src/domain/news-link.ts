import { REP_THRESHOLDS } from "./reputation"
import { isAdmin } from "./user"

export type VoteValue = 1 | -1

export type NewsLink = {
  readonly id: string
  readonly advancementId: string
  readonly submitterId: string
  readonly title: string
  readonly url: string
  readonly score: number
  readonly createdAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type SubmitNewsLinkRequest = {
  readonly submitterRep: number
  readonly title: string
  readonly url: string
  readonly advancementId: string
}

type VoteNewsLinkRequest = {
  readonly userId: string
  readonly userRep: number
  readonly link: NewsLink
  readonly existingVote: VoteValue | null
  readonly newVote: VoteValue
}

export function validateSubmitNewsLink(request: SubmitNewsLinkRequest): ValidationResult {
  if (!isAdmin(request.submitterRep) && request.submitterRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to submit news links" }
  }

  if (!request.title.trim()) {
    return { valid: false, reason: "Title is required" }
  }

  if (!request.url.trim()) {
    return { valid: false, reason: "URL is required" }
  }

  if (!request.url.startsWith("http://") && !request.url.startsWith("https://")) {
    return { valid: false, reason: "URL must start with http:// or https://" }
  }

  return { valid: true }
}

export function validateVoteNewsLink(request: VoteNewsLinkRequest): ValidationResult {
  if (!isAdmin(request.userRep) && request.userRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to vote" }
  }

  if (request.link.submitterId === request.userId) {
    return { valid: false, reason: "You cannot vote on your own submission" }
  }

  if (request.existingVote === request.newVote) {
    return { valid: false, reason: "You have already voted this way" }
  }

  return { valid: true }
}
