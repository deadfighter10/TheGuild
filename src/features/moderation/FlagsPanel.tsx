import { useState, useEffect } from "react"
import { getPendingFlags, getAllFlags, resolveFlag } from "./flag-service"
import { FLAG_REASONS, type ContentFlag, type FlagStatus } from "@/domain/flag"
import { logAuditEvent } from "@/features/admin/audit-service"

type FlagsPanelProps = {
  readonly actorId: string
  readonly actorName: string
}

const STATUS_TABS: readonly { readonly value: FlagStatus | "all"; readonly label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
]

function getReasonLabel(reason: string): string {
  return FLAG_REASONS.find((r) => r.value === reason)?.label ?? reason
}

function getCollectionLabel(col: string): string {
  const labels: Record<string, string> = {
    nodes: "Idea",
    libraryEntries: "Library Entry",
    newsLinks: "News Link",
    discussionThreads: "Thread",
    discussionReplies: "Reply",
  }
  return labels[col] ?? col
}

export function FlagsPanel({ actorId, actorName }: FlagsPanelProps) {
  const [flags, setFlags] = useState<readonly ContentFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FlagStatus | "all">("pending")
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const fetch = tab === "pending" ? getPendingFlags() : tab === "all" ? getAllFlags() : getAllFlags(tab)
    fetch.then(setFlags).finally(() => setLoading(false))
  }, [tab])

  const handleResolve = async (flag: ContentFlag, status: FlagStatus) => {
    setResolving(flag.id)
    try {
      await resolveFlag(flag.id, { status, resolvedBy: actorId })
      await logAuditEvent({
        actorId,
        actorName,
        action: "resolve_flag",
        targetCollection: "flags",
        targetId: flag.id,
        details: `Flag ${status}: ${flag.reason} on ${getCollectionLabel(flag.targetCollection)} "${flag.targetTitle}"`,
      })
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, status } : f))
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              tab === t.value
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <p className="text-center text-white/30 text-sm py-12">
          {tab === "pending" ? "No pending flags" : "No flags found"}
        </p>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      flag.reason === "harassment" ? "bg-red-500/10 text-red-400" :
                      flag.reason === "misinformation" ? "bg-orange-500/10 text-orange-400" :
                      flag.reason === "spam" ? "bg-amber-500/10 text-amber-400" :
                      "bg-white/5 text-white/40"
                    }`}>
                      {getReasonLabel(flag.reason)}
                    </span>
                    <span className="text-[10px] text-white/20 font-mono">
                      {getCollectionLabel(flag.targetCollection)}
                    </span>
                    {flag.status !== "pending" && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        flag.status === "actioned" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/30"
                      }`}>
                        {flag.status}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-white/70 truncate">{flag.targetTitle}</p>

                  {flag.details && (
                    <p className="text-xs text-white/30 mt-1 line-clamp-2">{flag.details}</p>
                  )}

                  <p className="text-[10px] text-white/20 mt-2 font-mono">
                    Reported by {flag.reporterName} · {flag.createdAt.toLocaleDateString()}
                  </p>
                </div>

                {flag.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleResolve(flag, "dismissed")}
                      disabled={resolving === flag.id}
                      className="px-3 py-1.5 text-xs text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleResolve(flag, "actioned")}
                      disabled={resolving === flag.id}
                      className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md border border-red-500/20 transition-colors disabled:opacity-40"
                    >
                      Action
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
