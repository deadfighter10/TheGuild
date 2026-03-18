import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearch } from "@/shared/hooks/use-search"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { canContribute } from "@/domain/reputation"
import { subscribeToNewsLinks, voteNewsLink, getUserVote } from "./news-service"
import { useRealtimeQuery } from "@/shared/hooks/use-realtime-query"
import { SubmitLinkForm } from "./SubmitLinkForm"
import type { NewsLink, VoteValue } from "@/domain/news-link"
import { FlagButton } from "@/features/moderation/FlagButton"

type NewsSortMode = "hot" | "new" | "top"

function hotScore(link: NewsLink): number {
  const ageHours = (Date.now() - link.createdAt.getTime()) / (1000 * 60 * 60)
  return link.score / Math.pow(ageHours + 2, 1.5)
}

function sortLinks(links: readonly NewsLink[], mode: NewsSortMode): readonly NewsLink[] {
  const sorted = [...links]
  switch (mode) {
    case "hot":
      return sorted.sort((a, b) => hotScore(b) - hotScore(a))
    case "new":
      return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    case "top":
      return sorted.sort((a, b) => b.score - a.score)
  }
}
import { NewspaperIcon, AdvancementIcon } from "@/shared/components/Icons"
import { EmptyState } from "@/shared/components/EmptyState"
import { useToast } from "@/shared/components/Toast"
import { SkeletonList } from "@/shared/components/Skeleton"

type NewsItemProps = {
  readonly link: NewsLink
  readonly onVoted: () => void
}

function NewsItem({ link, onVoted }: NewsItemProps) {
  const { guildUser } = useAuth()
  const { toast } = useToast()
  const [userVote, setUserVote] = useState<VoteValue | null>(null)
  const [voting, setVoting] = useState(false)
  const [localScore, setLocalScore] = useState(link.score)

  const theme = ADVANCEMENT_THEMES[link.advancementId]

  useEffect(() => {
    if (guildUser) {
      getUserVote(guildUser.uid, link.id).then(setUserVote).catch((err) => console.error("Failed to fetch vote:", err))
    }
  }, [guildUser, link.id])

  useEffect(() => {
    setLocalScore(link.score)
  }, [link.score])

  const handleVote = async (value: VoteValue) => {
    if (!guildUser || voting) return
    setVoting(true)

    try {
      const result = await voteNewsLink(guildUser.uid, guildUser.repPoints, link.id, value)
      if (result.success) {
        const delta = userVote === null ? value : value - userVote
        setLocalScore((prev) => prev + delta)
        setUserVote(value)
        onVoted()
      }
    } catch {
      toast("Failed to vote", "error")
    } finally {
      setVoting(false)
    }
  }

  const canVote = guildUser
    ? canContribute(guildUser.repPoints) && guildUser.uid !== link.submitterId
    : false

  const hostname = (() => {
    try {
      return new URL(link.url).hostname.replace("www.", "")
    } catch {
      return link.url
    }
  })()

  return (
    <article className="group flex items-start gap-2 sm:gap-4 p-3 sm:p-5 rounded-xl border border-white/5 bg-void-900 hover:bg-void-850 transition-colors">
      {canVote && (
        <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
          <button
            onClick={() => handleVote(1)}
            disabled={voting}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              userVote === 1
                ? "text-cyan-400 bg-cyan-400/10"
                : "text-white/20 hover:text-white/50 hover:bg-white/5"
            }`}
            aria-label="Upvote"
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
              <path d="M5 0L10 6H0L5 0Z" />
            </svg>
          </button>
          <span className={`text-xs font-mono ${localScore > 0 ? "text-white/60" : localScore < 0 ? "text-red-400/60" : "text-white/25"}`}>
            {localScore}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={voting}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              userVote === -1
                ? "text-red-400 bg-red-400/10"
                : "text-white/20 hover:text-white/50 hover:bg-white/5"
            }`}
            aria-label="Downvote"
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
              <path d="M5 6L0 0H10L5 6Z" />
            </svg>
          </button>
        </div>
      )}

      {!canVote && (
        <div className="shrink-0 flex flex-col items-center w-6 pt-1">
          <span className={`text-xs font-mono ${localScore > 0 ? "text-white/60" : localScore < 0 ? "text-red-400/60" : "text-white/25"}`}>
            {localScore}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-white/70 leading-snug group-hover:text-white/90 transition-colors hover:underline underline-offset-2"
        >
          {link.title}
        </a>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-white/30">{hostname}</span>
          {theme && (
            <>
              <span className="text-white/10">·</span>
              <span className={`text-[10px] font-mono ${theme.colorClass} opacity-40`}>
                {theme.shortName}
              </span>
            </>
          )}
        </div>
      </div>

      {theme && (
        <div className={`shrink-0 w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-30`}>
          <AdvancementIcon icon={theme.icon} size={14} />
        </div>
      )}

      {guildUser && guildUser.uid !== link.submitterId && (
        <div className="shrink-0">
          <FlagButton targetCollection="newsLinks" targetId={link.id} targetTitle={link.title} />
        </div>
      )}
    </article>
  )
}

export function NewsroomPage() {
  const { guildUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [sortMode, setSortMode] = useState<NewsSortMode>("hot")

  const activeAdvancement = searchParams.get("advancement") ?? undefined

  const subscribe = useCallback(
    (onData: (items: readonly NewsLink[]) => void, onError: (error: Error) => void) =>
      subscribeToNewsLinks(activeAdvancement, onData, onError),
    [activeAdvancement],
  )
  const { data: links, loading } = useRealtimeQuery(subscribe)

  const sortedLinks = useMemo(() => sortLinks(links, sortMode), [links, sortMode])

  const { query: searchQuery, setQuery: setSearchQuery, results: filteredLinks } = useSearch(
    sortedLinks,
    { keys: ["title", "url"], threshold: 0.4 },
  )

  const canSubmit = guildUser ? canContribute(guildUser.repPoints) : false

  const handleFilterAdvancement = (advId: string | undefined) => {
    if (advId) {
      setSearchParams({ advancement: advId })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <NewspaperIcon size={24} className="text-violet-400/60" />
          <h1 className="font-mono text-xs uppercase tracking-widest text-white/40">
            The Newsroom
          </h1>
        </div>
        <p className="font-display text-4xl sm:text-5xl text-white mb-6">
          Stay current with<br />
          <span className="italic text-white/50">the frontier</span>
        </p>
        <p className="text-white/35 leading-relaxed max-w-xl">
          Aggregated news, papers, and discoveries from across all advancements.
          Submit links, vote on what matters, surface the signal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-wrap">
            <button
              onClick={() => handleFilterAdvancement(undefined)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !activeAdvancement ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50 hover:bg-white/5"
              }`}
            >
              All
            </button>
            {ADVANCEMENTS.map((adv) => {
              const theme = ADVANCEMENT_THEMES[adv.id]
              if (!theme) return null
              return (
                <button
                  key={adv.id}
                  onClick={() => handleFilterAdvancement(adv.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeAdvancement === adv.id
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/50 hover:bg-white/5"
                  }`}
                >
                  {theme.shortName}
                </button>
              )
            })}

            <div className="flex items-center gap-1 ml-auto">
              {(["hot", "new", "top"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-2.5 py-1.5 text-[10px] font-mono rounded-md transition-colors ${
                    sortMode === mode
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/50 hover:bg-white/5"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {canSubmit && !showSubmitForm && (
              <button
                onClick={() => setShowSubmitForm(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
              >
                + Submit Link
              </button>
            )}
          </div>

          <div className="mb-4">
            <div className="relative max-w-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search news links"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-white/10 bg-void-900 text-white/70 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {showSubmitForm && (
            <div className="mb-6">
              <SubmitLinkForm
                defaultAdvancementId={activeAdvancement}
                onSubmitted={() => {
                  setShowSubmitForm(false)
                }}
                onCancel={() => setShowSubmitForm(false)}
              />
            </div>
          )}

          {loading ? (
            <SkeletonList count={6} />
          ) : filteredLinks.length === 0 && searchQuery ? (
            <EmptyState
              icon="search"
              title={`No links match \u201c${searchQuery}\u201d`}
            />
          ) : links.length === 0 ? (
            <EmptyState
              icon="newspaper"
              title="No links yet"
              description={canSubmit
                ? "Be the first to submit a link"
                : "Contributors with 100+ Rep can submit links"
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredLinks.map((link) => (
                <NewsItem key={link.id} link={link} onVoted={() => {}} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-violet-400/10 bg-violet-400/5 p-6">
            <h3 className="text-sm font-semibold text-violet-400/70 mb-2">
              Submit a story
            </h3>
            <p className="text-xs text-white/30 leading-relaxed">
              Found a breakthrough paper or important news? Members with 100+ Rep
              can submit stories for community voting.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-void-900 p-6">
            <h3 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
              How voting works
            </h3>
            <div className="space-y-3 text-xs text-white/30 leading-relaxed">
              <p>Upvote links that are relevant, accurate, and advance understanding.</p>
              <p>Downvote spam, misleading claims, or low-quality sources.</p>
              <p>Score reflects net votes from the community.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
