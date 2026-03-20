import { isAdmin, type UserRole } from "./user"
import { REP_THRESHOLDS } from "./reputation"

export type SpotlightContentType = "node" | "libraryEntry"

export type Spotlight = {
  readonly id: string
  readonly contentType: SpotlightContentType
  readonly contentId: string
  readonly contentTitle: string
  readonly advancementId: string
  readonly authorId: string
  readonly authorName: string
  readonly nominatedBy: string
  readonly nominatorName: string
  readonly votes: number
  readonly weekId: string
  readonly createdAt: Date
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

type NominationRequest = {
  readonly nominatorRep: number
  readonly nominatorRole: UserRole
  readonly nominatorId: string
  readonly authorId: string
  readonly contentTitle: string
  readonly hasExistingNomination: boolean
}

export function validateNomination(request: NominationRequest): ValidationResult {
  if (!isAdmin(request.nominatorRole) && request.nominatorRep < REP_THRESHOLDS.moderatorMin) {
    return { valid: false, reason: "You need at least 3000 Rep to nominate content" }
  }

  if (request.nominatorId === request.authorId) {
    return { valid: false, reason: "You cannot nominate your own content" }
  }

  if (!request.contentTitle.trim()) {
    return { valid: false, reason: "Content title is required" }
  }

  if (request.hasExistingNomination) {
    return { valid: false, reason: "This content has already been nominated this week" }
  }

  return { valid: true }
}

type VoteRequest = {
  readonly voterRep: number
  readonly voterRole: UserRole
  readonly voterId: string
  readonly nominatedBy: string
  readonly authorId: string
  readonly hasExistingVote: boolean
}

export function validateVote(request: VoteRequest): ValidationResult {
  if (request.hasExistingVote) {
    return { valid: false, reason: "You have already voted on this spotlight" }
  }

  if (request.voterId === request.nominatedBy) {
    return { valid: false, reason: "You cannot vote on your own nomination" }
  }

  if (!isAdmin(request.voterRole) && request.voterRep < REP_THRESHOLDS.contributorMin) {
    return { valid: false, reason: "You need at least 100 Rep to vote" }
  }

  return { valid: true }
}

export function canNominate(rep: number, role: UserRole): boolean {
  return isAdmin(role) || rep >= REP_THRESHOLDS.moderatorMin
}

export function spotlightWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`
}
