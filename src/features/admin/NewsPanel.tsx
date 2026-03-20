import { useState, useEffect, useCallback } from "react"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import type { NewsLink } from "@/domain/news-link"
import { getAllNewsLinks, deleteNewsLink } from "./admin-service"
import { logAuditEvent } from "./audit-service"
import { timeAgo } from "@/shared/utils/time"
import { ConfirmButton } from "./ConfirmButton"
import type { ActorInfo } from "./UsersPanel"

function advancementLabel(id: string): string {
  return ADVANCEMENT_THEMES[id]?.shortName ?? id
}

function advancementColor(id: string): string {
  return ADVANCEMENT_THEMES[id]?.colorClass ?? "text-white/50"
}

export function NewsPanel({ actor }: { readonly actor: ActorInfo }) {
  const [links, setLinks] = useState<readonly NewsLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getAllNewsLinks().then(setLinks).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const link = links.find((l) => l.id === id)
    await deleteNewsLink(id)
    await logAuditEvent({ ...actor, action: "delete_news_link", targetCollection: "newsLinks", targetId: id, details: `Deleted link "${link?.title ?? id}"` })
    load()
  }

  const filtered = search
    ? links.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()))
    : links

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading news links...</p>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          News Links <span className="text-white/15">({links.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-full sm:w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((link) => (
          <div key={link.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-white/70 font-medium truncate">{link.title}</p>
                <span className={`text-[10px] font-mono ${advancementColor(link.advancementId)}`}>
                  {advancementLabel(link.advancementId)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="font-mono">score: {link.score}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/40 truncate max-w-[200px] underline">
                  {link.url}
                </a>
                <span>{timeAgo(link.createdAt)}</span>
              </div>
            </div>
            <ConfirmButton label="Delete" onConfirm={() => handleDelete(link.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/20 text-center py-8">
            {search ? "No links match your search" : "No links found"}
          </p>
        )}
      </div>
    </div>
  )
}
