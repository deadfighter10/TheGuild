import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronRightIcon } from "@/shared/components/Icons"
import { getLibraryEntries } from "@/features/library/library-service"

export function LibraryTab({ advancementId }: {
  readonly advancementId: string
}) {
  const [entries, setEntries] = useState<readonly { readonly id: string; readonly title: string; readonly contentType: string; readonly difficulty: string; readonly createdAt: Date }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLibraryEntries(advancementId)
      .then((page) => setEntries(page.items))
      .catch((err) => console.error("Failed to load library entries:", err))
      .finally(() => setLoading(false))
  }, [advancementId])

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading library...</p>
  }

  const TYPE_ICONS: Record<string, string> = { article: "\u270E", youtube: "\u25B6", link: "\u2197", document: "\u25E7" }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">Library</h3>
          <span className="font-mono text-[10px] text-white/20">{entries.length} entries</span>
        </div>
        <Link
          to={`/library?advancement=${advancementId}`}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          View in full Library
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-xl">
          <p className="text-sm text-white/30 mb-1">No library entries yet</p>
          <p className="text-xs text-white/15">
            Contributors with 1500+ Rep can add entries.
          </p>
          <Link
            to={`/library?advancement=${advancementId}`}
            className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mt-4"
          >
            Go to Library
            <ChevronRightIcon size={12} />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to={`/library/${entry.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <span className="text-base w-6 text-center shrink-0 opacity-40">
                {TYPE_ICONS[entry.contentType] ?? "\u270E"}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm text-white/70 font-medium truncate">{entry.title}</h4>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-white/[0.06] text-white/30">
                {entry.difficulty}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
