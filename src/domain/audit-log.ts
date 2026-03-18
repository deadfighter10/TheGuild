export type AuditAction =
  | "delete_user"
  | "update_rep"
  | "delete_node"
  | "update_node_status"
  | "delete_library_entry"
  | "delete_news_link"
  | "delete_thread"
  | "delete_reply"
  | "resolve_flag"

export type AuditLogEntry = {
  readonly id: string
  readonly actorId: string
  readonly actorName: string
  readonly action: AuditAction
  readonly targetCollection: string
  readonly targetId: string
  readonly details: string
  readonly createdAt: Date
}
