import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { canModerate } from "@/domain/reputation"
import { getLibraryEntry, getEntryVersions } from "./library-service"
import type { EntryVersion } from "./library-service"
import { LibraryEntryForm } from "./LibraryEntryForm"
import { extractYouTubeId, CONTENT_TYPE_LABELS } from "@/domain/library-entry"
import type { LibraryEntry, Difficulty } from "@/domain/library-entry"
import { AdvancementIcon } from "@/shared/components/Icons"
import { Markdown } from "@/shared/components/Markdown"
import { SkeletonText } from "@/shared/components/Skeleton"
import { BookmarkButton } from "@/features/bookmarks/BookmarkButton"
import { SubmitForReviewButton } from "@/features/peer-review/SubmitForReviewButton"
import { timeAgo } from "@/shared/utils/time"
import { sanitizeUrl } from "@/shared/components/markdown-renderer"

const IFRAME_ALLOWED_DOMAINS = [
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "www.youtube.com",
  "youtube.com",
  "drive.google.com",
  "docs.google.com",
  "arxiv.org",
] as const

function isAllowedIframeDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return IFRAME_ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

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

function YouTubeEmbed({ url }: { readonly url: string }) {
  const videoId = extractYouTubeId(url)
  if (!videoId || !/^[\w-]+$/.test(videoId)) return null

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-void-800">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}

function ExternalLinkCard({ url, title }: { readonly url: string; readonly title: string }) {
  const safeUrl = sanitizeUrl(url)
  const hostname = (() => {
    try {
      return new URL(safeUrl).hostname.replace("www.", "")
    } catch {
      return safeUrl
    }
  })()

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-5 p-6 rounded-xl border border-white/10 bg-void-800 hover:border-cyan-400/20 transition-all"
    >
      <div className="shrink-0 w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-cyan-400/60">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/70 group-hover:text-white transition-colors truncate">
          {title}
        </p>
        <p className="text-xs text-white/25 mt-1 font-mono">{hostname}</p>
      </div>
      <span className="shrink-0 text-xs text-white/20 group-hover:text-cyan-400/60 transition-colors">
        Open source →
      </span>
    </a>
  )
}

function DocumentViewer({ url, title }: { readonly url: string; readonly title: string }) {
  const isPdf = url.toLowerCase().endsWith(".pdf")

  if (isPdf && isAllowedIframeDomain(url)) {
    const safeUrl = sanitizeUrl(url)
    return (
      <div className="space-y-3">
        <div className="relative w-full aspect-[8.5/11] max-h-[80vh] rounded-xl overflow-hidden border border-white/10 bg-void-800">
          <iframe
            src={safeUrl}
            title={title}
            sandbox="allow-scripts allow-same-origin"
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors font-mono"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </a>
      </div>
    )
  }

  return <ExternalLinkCard url={url} title={title} />
}

function ContentTypeBadge({ contentType }: { readonly contentType: string }) {
  const styles: Record<string, string> = {
    article: "text-cyan-400/50 bg-cyan-400/5 border-cyan-400/10",
    youtube: "text-red-400/50 bg-red-400/5 border-red-400/10",
    link: "text-violet-400/50 bg-violet-400/5 border-violet-400/10",
    document: "text-amber-400/50 bg-amber-400/5 border-amber-400/10",
  }

  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${styles[contentType] ?? styles["article"]}`}>
      {CONTENT_TYPE_LABELS[contentType as keyof typeof CONTENT_TYPE_LABELS] ?? "Article"}
    </span>
  )
}

function VersionHistory({ entryId }: { readonly entryId: string }) {
  const [versions, setVersions] = useState<readonly EntryVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getEntryVersions(entryId)
      .then(setVersions)
      .catch((err) => console.error("Failed to load versions:", err))
      .finally(() => setLoading(false))
  }, [entryId])

  if (loading || versions.length === 0) return null

  return (
    <div className="mt-8 pt-8 border-t border-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors"
      >
        <span>Version History ({versions.length})</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="p-3 rounded-lg border border-white/5 bg-void-900"
            >
              <div className="flex items-center gap-3 text-xs">
                <span className="text-white/50 font-medium">{version.title}</span>
                <span className="text-white/20 font-mono">{timeAgo(version.createdAt)}</span>
              </div>
              <p className="text-[10px] text-white/25 mt-1 line-clamp-2 font-mono">
                {version.content.slice(0, 200)}{version.content.length > 200 ? "..." : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LibraryEntryPage() {
  const { id } = useParams<{ id: string }>()
  const { guildUser } = useAuth()
  const [entry, setEntry] = useState<LibraryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getLibraryEntry(id)
      .then(setEntry)
      .catch(() => setEntry(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-6">
        <div className="animate-pulse h-3 w-40 rounded bg-white/5" />
        <div className="animate-pulse h-8 w-2/3 rounded bg-white/5" />
        <SkeletonText lines={8} />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-white/40 mb-2">Entry not found.</p>
        <Link to="/library" className="text-cyan-400/70 hover:text-cyan-400 text-sm transition-colors">
          Back to Library
        </Link>
      </div>
    )
  }

  const theme = ADVANCEMENT_THEMES[entry.advancementId]
  const advancement = ADVANCEMENTS.find((a) => a.id === entry.advancementId)
  const canEdit = guildUser && (
    guildUser.uid === entry.authorId || canModerate(guildUser.repPoints)
  )

  if (editing && canEdit) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="flex items-center gap-2 text-xs font-mono mb-8">
          <Link to="/" className="text-white/30 hover:text-white/60 transition-colors">Home</Link>
          <span className="text-white/15">/</span>
          <Link to="/library" className="text-white/30 hover:text-white/60 transition-colors">Library</Link>
          <span className="text-white/15">/</span>
          <span className="text-white/50">Editing</span>
        </nav>
        <LibraryEntryForm
          existingEntry={entry}
          onSaved={() => {
            setEditing(false)
            if (id) {
              getLibraryEntry(id).then(setEntry).catch((err) => console.error("Failed to reload entry:", err))
            }
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <nav className="flex items-center gap-2 text-xs font-mono mb-8">
        <Link to="/" className="text-white/30 hover:text-white/60 transition-colors">Home</Link>
        <span className="text-white/15">/</span>
        <Link to="/library" className="text-white/30 hover:text-white/60 transition-colors">Library</Link>
        <span className="text-white/15">/</span>
        <span className="text-white/50 truncate max-w-[200px]">{entry.title}</span>
      </nav>

      <article>
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            {theme && advancement && (
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-60`}>
                  <AdvancementIcon icon={theme.icon} size={16} />
                </div>
                <span className="text-xs text-white/30">{advancement.name}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${DIFFICULTY_STYLES[entry.difficulty]}`}>
                  {DIFFICULTY_LABELS[entry.difficulty]}
                </span>
                <ContentTypeBadge contentType={entry.contentType} />
              </div>
            )}
            <h1 className="font-display text-3xl text-white">{entry.title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <BookmarkButton
              targetType="libraryEntry"
              targetId={entry.id}
              targetTitle={entry.title}
              advancementId={entry.advancementId}
            />
            <SubmitForReviewButton
              contentType="libraryEntry"
              contentId={entry.id}
              contentTitle={entry.title}
              advancementId={entry.advancementId}
              authorId={entry.authorId}
            />
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {entry.contentType === "youtube" && entry.url && (
          <div className="mb-8">
            <YouTubeEmbed url={entry.url} />
          </div>
        )}

        {entry.contentType === "link" && entry.url && (
          <div className="mb-8">
            <ExternalLinkCard url={entry.url} title={entry.title} />
          </div>
        )}

        {entry.contentType === "document" && entry.url && (
          <div className="mb-8">
            <DocumentViewer url={entry.url} title={entry.title} />
          </div>
        )}

        {entry.content && (
          <div className="max-w-none">
            <Markdown content={entry.content} />
          </div>
        )}

        <VersionHistory entryId={entry.id} />
      </article>
    </div>
  )
}
