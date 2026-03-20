import { useState, useEffect } from "react"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { getUserBookmarks } from "@/features/bookmarks/bookmark-service"
import { Link } from "react-router-dom"
import type { Bookmark, BookmarkTargetType } from "@/domain/bookmark"

const BOOKMARK_TYPE_LABELS: Record<BookmarkTargetType, string> = {
  node: "Ideas",
  libraryEntry: "Library",
  newsLink: "News",
  discussionThread: "Discussions",
}

function bookmarkLink(bookmark: Bookmark): string {
  switch (bookmark.targetType) {
    case "node":
      return `/advancements/${bookmark.advancementId}/tree/${bookmark.targetId}`
    case "libraryEntry":
      return `/library/${bookmark.targetId}`
    case "newsLink":
      return `/newsroom`
    case "discussionThread":
      return `/advancements/${bookmark.advancementId}`
  }
}

export function BookmarksSection({ userId }: { readonly userId: string }) {
  const [bookmarks, setBookmarks] = useState<readonly Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<BookmarkTargetType | "all">("all")

  useEffect(() => {
    getUserBookmarks(userId)
      .then(setBookmarks)
      .catch((err) => console.error("Failed to load bookmarks:", err))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-white/30 font-mono">Loading bookmarks...</p>
      </div>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
        <p className="text-sm text-white/30 mb-1">No bookmarks yet</p>
        <p className="text-xs text-white/25">Bookmark ideas, library entries, and more to find them here</p>
      </div>
    )
  }

  const types = [...new Set(bookmarks.map((b) => b.targetType))]
  const filtered = filterType === "all" ? bookmarks : bookmarks.filter((b) => b.targetType === filterType)

  return (
    <div>
      {types.length > 1 && (
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === "all" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50 hover:bg-white/5"
            }`}
          >
            All <span className="ml-1 font-mono text-[10px] opacity-60">{bookmarks.length}</span>
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === type ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50 hover:bg-white/5"
              }`}
            >
              {BOOKMARK_TYPE_LABELS[type]}
              <span className="ml-1 font-mono text-[10px] opacity-60">
                {bookmarks.filter((b) => b.targetType === type).length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((bookmark) => {
          const theme = ADVANCEMENT_THEMES[bookmark.advancementId]
          return (
            <Link
              key={bookmark.id}
              to={bookmarkLink(bookmark)}
              className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
            >
              {theme && (
                <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                  <AdvancementIcon icon={theme.icon} size={14} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 truncate">{bookmark.targetTitle}</p>
                <span className="text-[10px] text-white/30 font-mono">
                  {BOOKMARK_TYPE_LABELS[bookmark.targetType]}
                </span>
              </div>
              <ChevronRightIcon size={14} className="text-white/15" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
