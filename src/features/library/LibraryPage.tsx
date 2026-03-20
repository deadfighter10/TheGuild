import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { usePageMeta } from "@/shared/hooks/use-page-meta"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { getLibraryEntries } from "./library-service"
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { LibraryEntryForm } from "./LibraryEntryForm"
import type { LibraryEntry, Difficulty, ContentType } from "@/domain/library-entry"
import { BookIcon, AdvancementIcon } from "@/shared/components/Icons"
import { EmptyState } from "@/shared/components/EmptyState"
import { isAdmin } from "@/domain/user"
import { SkeletonList } from "@/shared/components/Skeleton"

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  introductory: "text-green-400/60 bg-green-400/5 border-green-400/10",
  intermediate: "text-cyan-400/60 bg-cyan-400/5 border-cyan-400/10",
  advanced: "text-orange-400/60 bg-orange-400/5 border-orange-400/10",
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  introductory: "Introductory",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  article: "✎",
  youtube: "▶",
  link: "↗",
  document: "◧",
}

const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  article: "text-cyan-400/40",
  youtube: "text-red-400/40",
  link: "text-violet-400/40",
  document: "text-amber-400/40",
}

const LIBRARY_REP_MIN = 1500

export function LibraryPage() {
  usePageMeta({ title: "Library" })
  const { guildUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<readonly LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const activeAdvancement = searchParams.get("advancement") ?? undefined

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setCursor(null)
    try {
      const page = await getLibraryEntries(activeAdvancement)
      setEntries(page.items)
      setCursor(page.lastDoc)
      setHasMore(page.hasMore)
    } catch {
      // UI shows stale state as fallback
    } finally {
      setLoading(false)
    }
  }, [activeAdvancement])

  const loadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await getLibraryEntries(activeAdvancement, cursor)
      setEntries((prev) => [...prev, ...page.items])
      setCursor(page.lastDoc)
      setHasMore(page.hasMore)
    } catch {
      // UI shows stale state as fallback
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const canContribute = guildUser ? isAdmin(guildUser.role) || guildUser.repPoints >= LIBRARY_REP_MIN : false

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter((e) => e.title.toLowerCase().includes(q))
  }, [entries, searchQuery])

  const handleFilterAdvancement = (advId: string | undefined) => {
    if (advId) {
      setSearchParams({ advancement: advId })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <BookIcon size={24} className="text-cyan-400/60" />
              <h1 className="font-mono text-xs uppercase tracking-widest text-white/40">
                The Grand Library
              </h1>
            </div>
            <p className="font-display text-4xl sm:text-5xl text-white mb-6">
              Catch up to the<br />
              <span className="italic text-white/50">cutting edge</span>
            </p>
            <p className="text-white/35 leading-relaxed max-w-xl">
              The greatest knowledge on humanity&apos;s most important advancements — curated
              from across the internet. Articles, videos, papers, and external sources,
              all in one place. Contributed by members with 1,500+ Rep.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search library entries"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-white/15 bg-void-900 text-white/70 placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            {canContribute && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="ml-auto px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
              >
                + New Entry
              </button>
            )}
          </div>

          {showCreateForm && (
            <div className="mb-6">
              <LibraryEntryForm
                defaultAdvancementId={activeAdvancement}
                onSaved={() => {
                  setShowCreateForm(false)
                  loadEntries()
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

          {loading ? (
            <SkeletonList count={6} />
          ) : filteredEntries.length === 0 && searchQuery ? (
            <EmptyState
              icon="search"
              title={`No entries match \u201c${searchQuery}\u201d`}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon="book"
              title="No entries yet"
              description={canContribute
                ? "Be the first to contribute to the Grand Library"
                : "Contributors with 1,500+ Rep can add entries"
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const theme = ADVANCEMENT_THEMES[entry.advancementId]
                const adv = ADVANCEMENTS.find((a) => a.id === entry.advancementId)
                if (!theme || !adv) return null

                return (
                  <Link
                    key={entry.id}
                    to={`/library/${entry.id}`}
                    className="group flex items-center gap-5 p-5 rounded-xl border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-60`}>
                      <AdvancementIcon icon={theme.icon} size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white/70 truncate group-hover:text-white/90 transition-colors">
                        {entry.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-white/25">{adv.name}</span>
                        <span className="text-white/10">·</span>
                        <span className={`text-[10px] ${CONTENT_TYPE_COLORS[entry.contentType ?? "article"]}`}>
                          {CONTENT_TYPE_ICONS[entry.contentType ?? "article"]} {entry.contentType === "youtube" ? "Video" : entry.contentType === "link" ? "Link" : entry.contentType === "document" ? "Doc" : "Article"}
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded border ${DIFFICULTY_STYLES[entry.difficulty]}`}>
                      {DIFFICULTY_LABELS[entry.difficulty]}
                    </span>
                  </Link>
                )
              })}

              {hasMore && !searchQuery && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-5 py-2 text-xs font-medium rounded-lg bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-void-900 p-6">
            <h3 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
              Browse by Advancement
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => handleFilterAdvancement(undefined)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  !activeAdvancement ? "bg-white/10 text-white" : "hover:bg-void-800 text-white/50"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-sm">All</span>
              </button>
              {ADVANCEMENTS.map((adv) => {
                const theme = ADVANCEMENT_THEMES[adv.id]
                if (!theme) return null
                return (
                  <button
                    key={adv.id}
                    onClick={() => handleFilterAdvancement(adv.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      activeAdvancement === adv.id ? "bg-white/10 text-white" : "hover:bg-void-800 text-white/50"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color, opacity: 0.6 }} />
                    <span className="text-sm">{theme.shortName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-6">
            <h3 className="text-sm font-semibold text-cyan-400/70 mb-2">
              Want to contribute?
            </h3>
            <p className="text-xs text-white/30 leading-relaxed mb-4">
              The Grand Library accepts entries from members with 1,500+ Rep.
              Share articles, YouTube videos, research papers, external sources,
              and original lessons. Curate the best knowledge available.
            </p>
            <Link
              to="/auth"
              className="inline-block text-xs font-medium text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              Join to start building Rep →
            </Link>
          </div>

          <div className="rounded-xl border border-white/5 bg-void-900 p-6">
            <h3 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
              Difficulty Levels
            </h3>
            <div className="space-y-2">
              {(["introductory", "intermediate", "advanced"] as const).map((level) => (
                <div key={level} className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${DIFFICULTY_STYLES[level]}`}>
                    {DIFFICULTY_LABELS[level]}
                  </span>
                  <span className="text-xs text-white/25">
                    {level === "introductory" && "No prerequisites"}
                    {level === "intermediate" && "Some background needed"}
                    {level === "advanced" && "Domain expertise helpful"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
