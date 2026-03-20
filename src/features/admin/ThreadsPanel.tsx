import { useState, useEffect, useCallback } from "react"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import type { DiscussionThread } from "@/domain/discussion"
import { getAllThreads, deleteThread } from "./admin-service"
import { logAuditEvent } from "./audit-service"
import { timeAgo } from "@/shared/utils/time"
import { ConfirmButton } from "./ConfirmButton"
import { useToast } from "@/shared/components/Toast"
import type { ActorInfo } from "./UsersPanel"

function advancementLabel(id: string): string {
  return ADVANCEMENT_THEMES[id]?.shortName ?? id
}

function advancementColor(id: string): string {
  return ADVANCEMENT_THEMES[id]?.colorClass ?? "text-white/50"
}

export function ThreadsPanel({ actor }: { readonly actor: ActorInfo }) {
  const [threads, setThreads] = useState<readonly DiscussionThread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const { toast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    getAllThreads().then(setThreads).catch(() => toast("Failed to load threads", "error")).finally(() => setLoading(false))
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    try {
      const thread = threads.find((t) => t.id === id)
      await deleteThread(id)
      await logAuditEvent({ ...actor, action: "delete_thread", targetCollection: "discussionThreads", targetId: id, details: `Deleted thread "${thread?.title ?? id}"` })
      load()
    } catch {
      toast("Failed to delete thread", "error")
    }
  }

  const filtered = search
    ? threads.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : threads

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading threads...</p>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Discussion Threads <span className="text-white/15">({threads.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-full sm:w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((thread) => (
          <div key={thread.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-white/70 font-medium truncate">{thread.title}</p>
                <span className={`text-[10px] font-mono ${advancementColor(thread.advancementId)}`}>
                  {advancementLabel(thread.advancementId)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span>by {thread.authorName}</span>
                <span className="font-mono">{thread.replyCount} replies</span>
                <span>{timeAgo(thread.createdAt)}</span>
              </div>
            </div>
            <ConfirmButton label="Delete" onConfirm={() => handleDelete(thread.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/20 text-center py-8">
            {search ? "No threads match your search" : "No threads found"}
          </p>
        )}
      </div>
    </div>
  )
}
