import { useState, useEffect } from "react"
import { getAuditLog } from "./audit-service"
import type { AuditLogEntry } from "@/domain/audit-log"
import { timeAgo } from "@/shared/utils/time"

const ACTION_LABELS: Record<string, string> = {
  delete_user: "Delete User",
  update_rep: "Update Rep",
  delete_node: "Delete Idea",
  update_node_status: "Change Status",
  delete_library_entry: "Delete Entry",
  delete_news_link: "Delete Link",
  delete_thread: "Delete Thread",
  delete_reply: "Delete Reply",
}

const ACTION_COLORS: Record<string, string> = {
  delete_user: "text-red-400/70 bg-red-400/10",
  update_rep: "text-amber-400/70 bg-amber-400/10",
  delete_node: "text-red-400/70 bg-red-400/10",
  update_node_status: "text-cyan-400/70 bg-cyan-400/10",
  delete_library_entry: "text-red-400/70 bg-red-400/10",
  delete_news_link: "text-red-400/70 bg-red-400/10",
  delete_thread: "text-red-400/70 bg-red-400/10",
  delete_reply: "text-red-400/70 bg-red-400/10",
}

export function AuditPanel() {
  const [entries, setEntries] = useState<readonly AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLog(100).then(setEntries).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading audit log...</p>
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-white/30 mb-1">No audit events yet</p>
        <p className="text-xs text-white/20">Admin actions will be logged here.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
        Audit Log <span className="text-white/15">({entries.length} events)</span>
      </h2>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02]"
          >
            <span className={`shrink-0 mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded ${ACTION_COLORS[entry.action] ?? "text-white/50 bg-white/5"}`}>
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60">{entry.details}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-white/25">
                <span>by {entry.actorName}</span>
                <span className="font-mono">{entry.targetCollection}/{entry.targetId.slice(0, 8)}...</span>
                <span>{timeAgo(entry.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
