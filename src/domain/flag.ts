export type FlagReason =
  | "spam"
  | "harassment"
  | "misinformation"
  | "off-topic"
  | "plagiarism"
  | "other"

export const FLAG_REASONS: readonly { readonly value: FlagReason; readonly label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "misinformation", label: "Misinformation" },
  { value: "off-topic", label: "Off-topic" },
  { value: "plagiarism", label: "Plagiarism" },
  { value: "other", label: "Other" },
] as const

export type FlagTargetCollection =
  | "nodes"
  | "libraryEntries"
  | "newsLinks"
  | "discussionThreads"
  | "discussionReplies"

export type FlagStatus = "pending" | "dismissed" | "actioned"

export type ContentFlag = {
  readonly id: string
  readonly targetCollection: FlagTargetCollection
  readonly targetId: string
  readonly targetTitle: string
  readonly reporterId: string
  readonly reporterName: string
  readonly reason: FlagReason
  readonly details: string
  readonly status: FlagStatus
  readonly resolvedBy: string | null
  readonly resolvedAt: Date | null
  readonly createdAt: Date
}

export function validateFlag(params: {
  readonly reason: string
  readonly details: string
}): readonly string[] {
  const errors: string[] = []
  const validReasons: readonly string[] = FLAG_REASONS.map((r) => r.value)
  if (!validReasons.includes(params.reason)) {
    errors.push("Invalid flag reason")
  }
  if (params.details.length > 1000) {
    errors.push("Details must be 1000 characters or less")
  }
  return errors
}

export function canResolveFlag(userRep: number): boolean {
  return userRep === -1 || userRep >= 3000
}
