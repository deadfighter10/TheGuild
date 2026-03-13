import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { PILLAR_THEMES } from "@/domain/pillar-theme"
import { getRepTier, isAdmin } from "@/domain/user"
import type { TreeNode } from "@/domain/node"
import type { DiscussionThread } from "@/domain/discussion"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"
import { getNodesByAuthor } from "@/features/tree/node-service"
import { getLibraryEntriesByAuthor } from "@/features/library/library-service"
import { getNewsLinksBySubmitter } from "@/features/newsroom/news-service"
import { getThreadsByAuthor } from "@/features/discussions/discussion-service"
import { AdvancementIcon, TreeIcon, BookIcon, NewspaperIcon, ChevronRightIcon } from "@/shared/components/Icons"

type ActivityItem =
  | { readonly type: "idea"; readonly data: TreeNode }
  | { readonly type: "thread"; readonly data: DiscussionThread }
  | { readonly type: "entry"; readonly data: LibraryEntry }
  | { readonly type: "link"; readonly data: NewsLink }

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function useUserActivity(uid: string) {
  const [activity, setActivity] = useState<readonly ActivityItem[]>([])
  const [counts, setCounts] = useState({ ideas: 0, threads: 0, entries: 0, links: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getNodesByAuthor(uid),
      getThreadsByAuthor(uid),
      getLibraryEntriesByAuthor(uid),
      getNewsLinksBySubmitter(uid),
    ]).then(([nodes, threads, entries, links]) => {
      setCounts({
        ideas: nodes.length,
        threads: threads.length,
        entries: entries.length,
        links: links.length,
      })

      const items: ActivityItem[] = [
        ...nodes.map((data) => ({ type: "idea" as const, data })),
        ...threads.map((data) => ({ type: "thread" as const, data })),
        ...entries.map((data) => ({ type: "entry" as const, data })),
        ...links.map((data) => ({ type: "link" as const, data })),
      ]

      const sorted = items.sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
      setActivity(sorted.slice(0, 8))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [uid])

  return { activity, counts, loading }
}

const TIER_DISPLAY = {
  observer: { label: "Observer", color: "text-white/50", bg: "bg-white/5" },
  contributor: { label: "Contributor", color: "text-cyan-400", bg: "bg-cyan-400/5" },
  moderator: { label: "Moderator", color: "text-amber-400", bg: "bg-amber-400/5" },
} as const

function getAdvancementForItem(item: ActivityItem): string {
  return item.data.advancementId
}

function getItemTitle(item: ActivityItem): string {
  return item.data.title
}

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "idea": return { icon: TreeIcon, color: PILLAR_THEMES.tree.colorClass }
    case "thread": return { icon: ChatIcon, color: PILLAR_THEMES.discussions.colorClass }
    case "entry": return { icon: BookIcon, color: PILLAR_THEMES.library.colorClass }
    case "link": return { icon: NewspaperIcon, color: PILLAR_THEMES.newsroom.colorClass }
  }
}

function ChatIcon({ size = 14 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H8l-4 4V4z" />
    </svg>
  )
}

type ChecklistItem = {
  readonly label: string
  readonly done: boolean
  readonly to: string
}

function GettingStartedBanner({
  counts,
  hasInterests,
  loading,
  onDismiss,
}: {
  readonly counts: { readonly ideas: number; readonly threads: number; readonly entries: number; readonly links: number }
  readonly hasInterests: boolean
  readonly loading: boolean
  readonly onDismiss: () => void
}) {
  const items: readonly ChecklistItem[] = [
    { label: "Set your interests", done: hasInterests, to: "/profile" },
    { label: "Explore an advancement", done: false, to: "/advancements" },
    { label: "Browse the Library", done: false, to: "/library" },
    { label: "Join a discussion", done: counts.threads > 0, to: "/advancements" },
    { label: "Submit your first idea", done: counts.ideas > 0, to: "/advancements" },
  ]

  const doneCount = items.filter((i) => i.done).length

  if (loading) return null

  return (
    <div className="rounded-xl border border-cyan-400/10 bg-gradient-to-r from-cyan-400/[0.04] to-violet-500/[0.04] p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Welcome to The Guild!</h2>
          <p className="text-xs text-white/40">Here are some things to get you started.</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/20 hover:text-white/50 transition-colors p-1"
          aria-label="Dismiss getting started"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400/50 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-white/30">{doneCount}/{items.length}</span>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
              item.done
                ? "border-cyan-400/60 bg-cyan-400/20"
                : "border-white/15"
            }`}>
              {item.done && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className={`text-xs ${item.done ? "text-white/30 line-through" : "text-white/60"}`}>
              {item.label}
            </span>
            {!item.done && (
              <ChevronRightIcon size={10} className="ml-auto text-white/15" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function getActivityLabel(type: ActivityItem["type"]): string {
  switch (type) {
    case "idea": return "Idea"
    case "thread": return "Thread"
    case "entry": return "Entry"
    case "link": return "Link"
  }
}

export function Dashboard() {
  const { guildUser } = useAuth()
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem("guild-getting-started-dismissed") === "1" }
    catch { return false }
  })

  if (!guildUser) return null

  const admin = isAdmin(guildUser.repPoints)
  const tier = getRepTier(guildUser.repPoints)
  const tierDisplay = TIER_DISPLAY[tier]
  const { activity, counts, loading } = useUserActivity(guildUser.uid)

  const userAdvancementIds = guildUser.interests.length > 0
    ? guildUser.interests
    : ADVANCEMENTS.map((a) => a.id)
  const userAdvancements = ADVANCEMENTS.filter((a) => userAdvancementIds.includes(a.id))
  const totalContributions = counts.ideas + counts.threads + counts.entries + counts.links

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-white/90">
            Welcome back, <span className={admin ? "text-red-400" : "hero-warm-gradient-text"}>{guildUser.displayName}</span>
          </h1>
          <p className="text-sm text-white/30 mt-1">
            {admin
              ? "You have full admin access to The Guild."
              : "Here\u0027s what\u0027s happening in your corner of The Guild."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {admin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/15 bg-red-500/[0.04] hover:bg-red-500/10 text-red-400/80 hover:text-red-400 text-xs font-mono transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Admin Panel
            </Link>
          )}
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-colors ${
              admin
                ? "border-red-500/15 bg-red-500/[0.04] hover:bg-red-500/10"
                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              admin
                ? "bg-red-500/10 text-red-400/80"
                : "bg-gradient-to-br from-cyan-400/20 to-violet-400/20 text-white/60"
            }`}>
              {admin ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                guildUser.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left">
              <span className={`text-xs font-mono ${admin ? "text-red-400" : tierDisplay.color}`}>
                {admin ? "Admin" : tierDisplay.label}
              </span>
              <p className="text-sm font-mono text-white/70">
                {admin ? "Full access" : `${guildUser.repPoints} Rep`}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {!admin && !bannerDismissed && totalContributions < 3 && (
        <GettingStartedBanner
          counts={counts}
          hasInterests={guildUser.interests.length > 0}
          loading={loading}
          onDismiss={() => {
            setBannerDismissed(true)
            try { localStorage.setItem("guild-getting-started-dismissed", "1") }
            catch { /* storage unavailable */ }
          }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Ideas", value: counts.ideas, color: PILLAR_THEMES.tree.colorClass },
          { label: "Discussions", value: counts.threads, color: PILLAR_THEMES.discussions.colorClass },
          { label: "Library", value: counts.entries, color: PILLAR_THEMES.library.colorClass },
          { label: "News", value: counts.links, color: PILLAR_THEMES.newsroom.colorClass },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center">
            <p className={`text-xl font-bold font-mono ${stat.color}`}>
              {loading ? "–" : stat.value}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
                Your Advancements
              </h2>
              <Link to="/advancements" className="text-xs text-white/25 hover:text-white/50 transition-colors">
                View all
              </Link>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {userAdvancements.slice(0, 6).map((advancement) => {
                const theme = ADVANCEMENT_THEMES[advancement.id]
                if (!theme) return null
                return (
                  <Link
                    key={advancement.id}
                    to={`/advancements/${advancement.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center shrink-0`}>
                      <AdvancementIcon icon={theme.icon} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 font-medium truncate">{theme.shortName}</p>
                      <p className="text-[11px] text-white/30 truncate">{theme.tagline}</p>
                    </div>
                    <ChevronRightIcon size={12} className="text-white/15 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
                Recent Activity
              </h2>
              <span className="font-mono text-[10px] text-white/30">
                {totalContributions} total contributions
              </span>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-white/30 font-mono">Loading...</p>
              </div>
            ) : activity.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-white/30 mb-1">No activity yet</p>
                <p className="text-xs text-white/25">
                  Start contributing to see your work here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {activity.map((item) => {
                  const advId = getAdvancementForItem(item)
                  const advTheme = ADVANCEMENT_THEMES[advId]
                  const { icon: Icon, color } = getActivityIcon(item.type)
                  return (
                    <div key={`${item.type}-${item.data.id}`} className="flex items-center gap-3 px-5 py-3">
                      <span className={`shrink-0 ${color}`}>
                        <Icon size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/60 truncate">{getItemTitle(item)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-white/30">{getActivityLabel(item.type)}</span>
                          {advTheme && (
                            <>
                              <span className="text-white/10">·</span>
                              <span className={`text-[10px] font-mono ${advTheme.colorClass} opacity-40`}>{advTheme.shortName}</span>
                            </>
                          )}
                          <span className="text-white/10">·</span>
                          <span className="text-[10px] text-white/25">{timeAgo(item.data.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-xl border p-5 ${admin ? "border-red-500/10 bg-red-500/[0.02]" : "border-white/[0.04] bg-white/[0.02]"}`}>
            <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
              {admin ? "Access Level" : "Your Rep"}
            </h2>
            {admin ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                  Admin
                </span>
                <div className="mt-3 space-y-1.5">
                  {["Contribute", "Moderate", "Library", "Data Vault"].map((perm) => (
                    <div key={perm} className="flex items-center gap-2 justify-center text-[10px] text-white/30">
                      <span className="text-red-400/60">✓</span>
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold font-mono text-white/80">
                    {guildUser.repPoints}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded ${tierDisplay.bg} ${tierDisplay.color}`}>
                    {tierDisplay.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {tier === "observer" && (
                    <p className="text-xs text-white/30 text-center leading-relaxed">
                      Reach <span className="text-cyan-400/60 font-mono">100 Rep</span> to unlock contributions.
                      {!guildUser.isSchoolEmail && " Verify a school email for +100."}
                    </p>
                  )}
                  {tier === "contributor" && (
                    <p className="text-xs text-white/30 text-center leading-relaxed">
                      <span className="text-amber-400/60 font-mono">3,000 Rep</span> unlocks moderator status.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: "Browse Advancements", to: "/advancements", icon: "→" },
                { label: "Visit Library", to: "/library", icon: "→" },
                { label: "Read Newsroom", to: "/newsroom", icon: "→" },
                { label: "Edit Profile", to: "/profile", icon: "→" },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/40 hover:text-white/70 transition-all"
                >
                  <span>{action.label}</span>
                  <ChevronRightIcon size={12} />
                </Link>
              ))}
            </div>
          </div>

          {guildUser.interests.length > 0 && (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
              <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-3">
                Your Interests
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {guildUser.interests.map((interestId) => {
                  const theme = ADVANCEMENT_THEMES[interestId]
                  if (!theme) return <span key={interestId} className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/30">{interestId}</span>
                  return (
                    <Link
                      key={interestId}
                      to={`/advancements/${interestId}`}
                      className={`text-[10px] font-mono px-2 py-1 rounded ${theme.bgClass} ${theme.colorClass} opacity-60 hover:opacity-100 transition-opacity`}
                    >
                      {theme.shortName}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
