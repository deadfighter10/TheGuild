import { useState, useEffect, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { getUserById } from "./user-service"
import { getRepTier, isAdmin } from "@/domain/user"
import type { GuildUser } from "@/domain/user"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon } from "@/shared/components/Icons"
import { UserAvatar } from "@/shared/components/UserAvatar"
import { getNodesByAuthor } from "@/features/tree/node-service"
import { getLibraryEntriesByAuthor } from "@/features/library/library-service"
import { getNewsLinksBySubmitter } from "@/features/newsroom/news-service"
import { SkeletonText } from "@/shared/components/Skeleton"
import type { TreeNode } from "@/domain/node"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"

const TIER_LABELS = {
  observer: "Observer",
  contributor: "Contributor",
  moderator: "Moderator",
} as const

const TIER_STYLES = {
  observer: "text-white/40 bg-white/5 border-white/10",
  contributor: "text-cyan-400/70 bg-cyan-400/5 border-cyan-400/10",
  moderator: "text-amber-400/70 bg-amber-400/5 border-amber-400/10",
} as const

type ContributionsData = {
  readonly nodes: readonly TreeNode[]
  readonly entries: readonly LibraryEntry[]
  readonly links: readonly NewsLink[]
}

export function PublicProfilePage() {
  const { uid } = useParams<{ uid: string }>()
  const { guildUser: currentUser } = useAuth()
  const [user, setUser] = useState<GuildUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [contributions, setContributions] = useState<ContributionsData | null>(null)
  const [activeTab, setActiveTab] = useState<"nodes" | "library" | "news">("nodes")

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    getUserById(uid)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [uid])

  const loadContributions = useCallback(async () => {
    if (!uid) return
    try {
      const [nodes, entries, links] = await Promise.all([
        getNodesByAuthor(uid),
        getLibraryEntriesByAuthor(uid),
        getNewsLinksBySubmitter(uid),
      ])
      setContributions({ nodes, entries, links })
    } catch {
      // UI shows stale state as fallback
    }
  }, [uid])

  useEffect(() => {
    loadContributions()
  }, [loadContributions])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        <div className="animate-pulse h-8 w-48 rounded bg-white/5" />
        <SkeletonText lines={3} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-white/40 mb-2">User not found.</p>
        <Link to="/" className="text-cyan-400/70 hover:text-cyan-400 text-sm transition-colors">
          Back to home
        </Link>
      </div>
    )
  }

  const isOwnProfile = currentUser?.uid === user.uid
  const tier = getRepTier(user.repPoints)
  const admin = isAdmin(user.repPoints)

  const interestAdvancements = ADVANCEMENTS.filter((a) => user.interests.includes(a.id))

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <nav className="flex items-center gap-2 text-xs font-mono mb-8">
        <Link to="/" className="text-white/30 hover:text-white/60 transition-colors">Home</Link>
        <span className="text-white/15">/</span>
        <span className="text-white/50">{user.displayName}</span>
      </nav>

      <div className="flex items-start gap-6 mb-8">
        <UserAvatar name={user.displayName} photoURL={user.photoURL} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl text-white">{user.displayName}</h1>
            {admin ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-400/20">
                Admin
              </span>
            ) : (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${TIER_STYLES[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
            )}
          </div>
          {!admin && (
            <p className="text-xs text-white/30 font-mono mb-2">{user.repPoints} Rep</p>
          )}
          {user.bio && (
            <p className="text-sm text-white/40 leading-relaxed">{user.bio}</p>
          )}
          {isOwnProfile && (
            <Link
              to="/profile"
              className="inline-block mt-3 text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              Edit profile →
            </Link>
          )}
        </div>
      </div>

      {interestAdvancements.length > 0 && (
        <div className="mb-8">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-3">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {interestAdvancements.map((adv) => {
              const theme = ADVANCEMENT_THEMES[adv.id]
              if (!theme) return null
              return (
                <Link
                  key={adv.id}
                  to={`/advancements/${adv.id}`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme.bgClass} ${theme.colorClass} border-white/5 text-xs opacity-70 hover:opacity-100 transition-opacity`}
                >
                  <AdvancementIcon icon={theme.icon} size={12} />
                  {theme.shortName}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">Contributions</h2>

        {!contributions ? (
          <p className="text-xs text-white/30 font-mono py-4">Loading...</p>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-4">
              {([
                { key: "nodes" as const, label: "Ideas", count: contributions.nodes.length },
                { key: "library" as const, label: "Library", count: contributions.entries.length },
                { key: "news" as const, label: "News", count: contributions.links.length },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/50 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 font-mono text-[10px] opacity-60">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "nodes" && (
              <div className="space-y-2">
                {contributions.nodes.length === 0 ? (
                  <p className="text-xs text-white/30 py-4">No ideas yet</p>
                ) : contributions.nodes.map((node) => {
                  const theme = ADVANCEMENT_THEMES[node.advancementId]
                  return (
                    <Link
                      key={node.id}
                      to={`/advancements/${node.advancementId}?tab=tree`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                    >
                      {theme && (
                        <div className={`w-6 h-6 rounded ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                          <AdvancementIcon icon={theme.icon} size={10} />
                        </div>
                      )}
                      <span className="text-sm text-white/60 truncate">{node.title}</span>
                      <span className="ml-auto text-[10px] text-white/30 font-mono">{node.supportCount} supports</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {activeTab === "library" && (
              <div className="space-y-2">
                {contributions.entries.length === 0 ? (
                  <p className="text-xs text-white/30 py-4">No library entries yet</p>
                ) : contributions.entries.map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/library/${entry.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                  >
                    <span className="text-sm text-white/60 truncate">{entry.title}</span>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === "news" && (
              <div className="space-y-2">
                {contributions.links.length === 0 ? (
                  <p className="text-xs text-white/30 py-4">No news submissions yet</p>
                ) : contributions.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                  >
                    <span className="text-sm text-white/60 truncate">{link.title}</span>
                    <span className="ml-auto text-[10px] text-white/30 font-mono">score {link.score}</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
