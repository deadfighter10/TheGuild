export const REP_THRESHOLDS = {
  schoolEmailBonus: 100,
  vouchBonus: 100,
  supportBonus: 10,
  contributorMin: 100,
  moderatorMin: 3000,
} as const

const SCHOOL_EMAIL_PATTERNS = [
  /\.edu$/,
  /\.edu\.[a-z]{2}$/,
  /\.ac\.[a-z]{2}$/,
]

export function isSchoolEmail(email: string): boolean {
  const domain = email.split("@")[1]
  if (!domain) return false
  return SCHOOL_EMAIL_PATTERNS.some((pattern) => pattern.test(domain))
}

export function calculateInitialRep(_email: string): number {
  return 0
}

import type { UserRole } from "./user"

export function canContribute(rep: number, role: UserRole): boolean {
  return role === "admin" || rep >= REP_THRESHOLDS.contributorMin
}

export function canModerate(rep: number, role: UserRole): boolean {
  return role === "admin" || rep >= REP_THRESHOLDS.moderatorMin
}

export function canAccessDiscord(rep: number, role: UserRole): boolean {
  return role === "admin" || rep >= REP_THRESHOLDS.contributorMin
}

export type RepReason =
  | "node_created"
  | "node_support_received"
  | "node_proven"
  | "node_breakthrough"
  | "library_entry_created"
  | "library_entry_approved"
  | "peer_review_completed"
  | "content_peer_reviewed"
  | "discussion_thread_created"
  | "discussion_reply_created"
  | "news_link_submitted"
  | "news_link_upvoted"
  | "spotlight_win"
  | "achievement_earned"
  | "streak_milestone"
  | "school_email_verified"
  | "vouch_received"
  | "vouch_liability"
  | "vouch_slots_revoked"
  | "vouch_freeze"
  | "onboarding_action"
  | "supervised_approval_bonus"
  | "supervised_reviewer"
  | "welcome_engagement"
  | "breadth_bonus"
  | "quality_multiplier"
  | "flag_accurate"
  | "flag_inaccurate"
  | "flag_abuse_penalty"
  | "moderation_penalty"
  | "moderation_warning"
  | "appeal_reversal"
  | "appeal_filing_fee"
  | "inactivity_decay"
  | "breakthrough_nomination"
  | "breakthrough_vote"
  | "breakthrough_reviewer"
  | "breakthrough_revocation"
  | "governance_vote"
  | "content_deleted_reversal"
  | "admin_adjustment"
  | "daily_cap_applied"
  | "support_given"

export const REP_REASONS: readonly RepReason[] = [
  "node_created",
  "node_support_received",
  "node_proven",
  "node_breakthrough",
  "library_entry_created",
  "library_entry_approved",
  "peer_review_completed",
  "content_peer_reviewed",
  "discussion_thread_created",
  "discussion_reply_created",
  "news_link_submitted",
  "news_link_upvoted",
  "spotlight_win",
  "achievement_earned",
  "streak_milestone",
  "school_email_verified",
  "vouch_received",
  "vouch_liability",
  "vouch_slots_revoked",
  "vouch_freeze",
  "onboarding_action",
  "supervised_approval_bonus",
  "supervised_reviewer",
  "welcome_engagement",
  "breadth_bonus",
  "quality_multiplier",
  "flag_accurate",
  "flag_inaccurate",
  "flag_abuse_penalty",
  "moderation_penalty",
  "moderation_warning",
  "appeal_reversal",
  "appeal_filing_fee",
  "inactivity_decay",
  "breakthrough_nomination",
  "breakthrough_vote",
  "breakthrough_reviewer",
  "breakthrough_revocation",
  "governance_vote",
  "content_deleted_reversal",
  "admin_adjustment",
  "daily_cap_applied",
  "support_given",
] as const

export type RepEvent = {
  readonly id: string
  readonly userId: string
  readonly delta: number
  readonly reason: RepReason
  readonly sourceId: string | null
  readonly sourceDescription: string
  readonly timestamp: Date
  readonly balanceAfter: number
}
