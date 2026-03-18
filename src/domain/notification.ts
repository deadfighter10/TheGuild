export type NotificationType =
  | "reply"
  | "support"
  | "vouch"
  | "flag"
  | "rep_change"
  | "status_change"

export type Notification = {
  readonly id: string
  readonly userId: string
  readonly type: NotificationType
  readonly message: string
  readonly link: string
  readonly read: boolean
  readonly createdAt: Date
}

export function formatNotificationMessage(params: {
  readonly type: NotificationType
  readonly actorName: string
  readonly targetTitle?: string
}): string {
  switch (params.type) {
    case "reply":
      return `${params.actorName} replied to "${params.targetTitle}"`
    case "support":
      return `${params.actorName} supported your idea "${params.targetTitle}"`
    case "vouch":
      return `${params.actorName} vouched for you`
    case "flag":
      return `Your content "${params.targetTitle}" was flagged for review`
    case "rep_change":
      return `Your reputation was updated`
    case "status_change":
      return `Your idea "${params.targetTitle}" status was changed`
  }
}

export function notificationLink(params: {
  readonly type: NotificationType
  readonly advancementId?: string | undefined
  readonly targetId?: string | undefined
}): string {
  switch (params.type) {
    case "reply":
    case "status_change":
      return params.advancementId ? `/advancements/${params.advancementId}` : "/"
    case "support":
      return params.advancementId ? `/advancements/${params.advancementId}` : "/"
    case "vouch":
    case "rep_change":
      return "/profile"
    case "flag":
      return params.advancementId ? `/advancements/${params.advancementId}` : "/"
  }
}
