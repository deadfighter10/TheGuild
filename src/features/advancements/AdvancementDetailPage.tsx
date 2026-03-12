import { useState, useEffect, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { ADVANCEMENT_PLATFORMS } from "@/domain/advancement-platforms"
import type { PlatformLink } from "@/domain/advancement-platforms"
import { PILLAR_THEMES } from "@/domain/pillar-theme"
import { AdvancementIcon, BookIcon, NewspaperIcon, TreeIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { OnrampBanner } from "@/shared/components/OnrampBanner"
import { TreeView } from "@/features/tree/TreeView"
import { DiscussionForum } from "@/features/discussions/DiscussionForum"
import { getNodesByAdvancement } from "@/features/tree/node-service"
import { getLibraryEntries } from "@/features/library/library-service"
import { getNewsLinks } from "@/features/newsroom/news-service"
import { getThreadsByAdvancement } from "@/features/discussions/discussion-service"

type Tab = "overview" | "tree" | "discussions" | "library" | "platforms"

const PLATFORM_TYPE_CONFIG: Record<PlatformLink["type"], {
  readonly label: string
  readonly color: string
  readonly bg: string
  readonly border: string
  readonly glow: string
  readonly iconBg: string
}> = {
  github: { label: "Code", color: "text-white", bg: "bg-white/[0.04]", border: "border-white/[0.08]", glow: "rgba(255,255,255,0.06)", iconBg: "bg-white/10" },
  paper: { label: "Research", color: "text-violet-300", bg: "bg-violet-500/[0.04]", border: "border-violet-400/[0.12]", glow: "rgba(167,139,250,0.08)", iconBg: "bg-violet-400/10" },
  community: { label: "Community", color: "text-cyan-300", bg: "bg-cyan-500/[0.04]", border: "border-cyan-400/[0.12]", glow: "rgba(34,211,238,0.08)", iconBg: "bg-cyan-400/10" },
  tool: { label: "Tool", color: "text-emerald-300", bg: "bg-emerald-500/[0.04]", border: "border-emerald-400/[0.12]", glow: "rgba(52,211,153,0.08)", iconBg: "bg-emerald-400/10" },
  dataset: { label: "Dataset", color: "text-orange-300", bg: "bg-orange-500/[0.04]", border: "border-orange-400/[0.12]", glow: "rgba(251,146,60,0.08)", iconBg: "bg-orange-400/10" },
  organization: { label: "Organization", color: "text-amber-300", bg: "bg-amber-500/[0.04]", border: "border-amber-400/[0.12]", glow: "rgba(251,191,36,0.08)", iconBg: "bg-amber-400/10" },
}

const TAB_CONFIG: readonly { readonly key: Tab; readonly pillar: keyof typeof PILLAR_THEMES | null; readonly label: string }[] = [
  { key: "overview", pillar: null, label: "Overview" },
  { key: "tree", pillar: "tree", label: "Tree" },
  { key: "discussions", pillar: "discussions", label: "Discussions" },
  { key: "library", pillar: "library", label: "Library" },
  { key: "platforms", pillar: "platforms", label: "Platforms" },
]

type SubHubStats = {
  readonly ideas: number
  readonly threads: number
  readonly libraryEntries: number
  readonly newsLinks: number
}

function useSubHubStats(advancementId: string) {
  const [stats, setStats] = useState<SubHubStats>({ ideas: 0, threads: 0, libraryEntries: 0, newsLinks: 0 })

  useEffect(() => {
    Promise.all([
      getNodesByAdvancement(advancementId),
      getThreadsByAdvancement(advancementId),
      getLibraryEntries(advancementId),
      getNewsLinks(advancementId),
    ]).then(([nodes, threads, entries, links]) => {
      setStats({
        ideas: nodes.length,
        threads: threads.length,
        libraryEntries: entries.length,
        newsLinks: links.length,
      })
    }).catch(() => {})
  }, [advancementId])

  return stats
}

function PillarIcon({ pillar, size = 14 }: { readonly pillar: string; readonly size?: number }) {
  switch (pillar) {
    case "tree": return <TreeIcon size={size} />
    case "library": return <BookIcon size={size} />
    case "newsroom": return <NewspaperIcon size={size} />
    case "discussions":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H8l-4 4V4z" />
        </svg>
      )
    case "platforms":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
        </svg>
      )
    default: return null
  }
}

const SECTION_DESCRIPTIONS: Record<Tab, string | null> = {
  overview: null,
  tree: "The Tree is a knowledge graph of ideas. Theoretical ideas are red, proven ideas are green. Support ideas you believe in, or branch off with your own.",
  discussions: "Discuss ideas, share questions, and collaborate with other contributors working on this advancement.",
  library: "Browse translated papers, articles, and learning resources contributed by the community.",
  platforms: "Real-world projects, repos, and organizations where active development is happening.",
}

function useSectionDismissed(tab: Tab): readonly [boolean, () => void] {
  const key = `guild-section-header-${tab}`
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "1"
    } catch {
      return false
    }
  })

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(key, "1")
    } catch {
      // localStorage may be unavailable
    }
  }, [key])

  return [dismissed, dismiss] as const
}

function SectionHeader({ tab }: { readonly tab: Tab }) {
  const [dismissed, dismiss] = useSectionDismissed(tab)
  const description = SECTION_DESCRIPTIONS[tab]
  const pillar = TAB_CONFIG.find((t) => t.key === tab)?.pillar
  const pillarTheme = pillar ? PILLAR_THEMES[pillar] : null

  if (!description || dismissed) return null

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border mb-6 ${
      pillarTheme
        ? `${pillarTheme.bgClass} ${pillarTheme.borderClass}`
        : "bg-white/[0.02] border-white/[0.06]"
    }`}>
      {pillarTheme && (
        <span className={`${pillarTheme.colorClass} mt-0.5 shrink-0`}>
          <PillarIcon pillar={pillar!} size={14} />
        </span>
      )}
      <p className="text-xs text-white/40 leading-relaxed flex-1">{description}</p>
      <button
        onClick={dismiss}
        className="text-white/15 hover:text-white/40 transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

function AdvancementSwitcher({ currentId }: { readonly currentId: string }) {
  const [open, setOpen] = useState(false)
  const currentTheme = ADVANCEMENT_THEMES[currentId]
  const currentAdv = ADVANCEMENTS.find((a) => a.id === currentId)

  if (!currentTheme || !currentAdv) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
      >
        <span>{currentTheme.shortName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-40 w-64 rounded-xl border border-white/[0.08] bg-void-900 shadow-2xl shadow-black/40 overflow-hidden">
            {ADVANCEMENTS.map((adv) => {
              const t = ADVANCEMENT_THEMES[adv.id]
              if (!t) return null
              const isCurrent = adv.id === currentId
              return (
                <Link
                  key={adv.id}
                  to={`/advancements/${adv.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isCurrent ? "bg-white/5 text-white" : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg ${t.bgClass} ${t.colorClass} flex items-center justify-center shrink-0`}>
                    <AdvancementIcon icon={t.icon} size={14} />
                  </div>
                  <span className="truncate">{t.shortName}</span>
                  {isCurrent && <span className="ml-auto text-[10px] text-white/30">current</span>}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function AdvancementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const advancement = ADVANCEMENTS.find((a) => a.id === id)
  const theme = id ? ADVANCEMENT_THEMES[id] : undefined
  const platforms = id ? ADVANCEMENT_PLATFORMS[id] ?? [] : []

  if (!advancement || !theme || !id) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-white/40">Advancement not found.</p>
        <Link to="/advancements" className="text-cyan-400 hover:underline text-sm mt-2 inline-block">
          Back to Advancements
        </Link>
      </div>
    )
  }

  const stats = useSubHubStats(advancement.id)
  const activePillar = TAB_CONFIG.find((t) => t.key === activeTab)?.pillar
  const activePillarTheme = activePillar ? PILLAR_THEMES[activePillar] : null

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/advancements"
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          All Advancements
        </Link>
        <span className="text-white/10">|</span>
        <AdvancementSwitcher currentId={advancement.id} />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className={`w-11 h-11 rounded-xl ${theme.bgClass} ${theme.colorClass} flex items-center justify-center shrink-0`}>
          <AdvancementIcon icon={theme.icon} size={22} />
        </div>
        <div>
          <h1 className="font-display text-xl sm:text-2xl text-white/90">
            {advancement.name}
          </h1>
          <p className={`font-mono text-[11px] ${theme.colorClass} opacity-40 mt-0.5`}>
            {theme.tagline}
          </p>
        </div>
      </div>

      <div className="border-b border-white/[0.06] mb-8">
        <div className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-none">
          {TAB_CONFIG.map((tab) => {
            const pillarTheme = tab.pillar ? PILLAR_THEMES[tab.pillar] : null
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? `${pillarTheme ? pillarTheme.colorClass : theme.colorClass} border-current`
                    : "text-white/30 border-transparent hover:text-white/50"
                }`}
              >
                {pillarTheme && (
                  <span className={isActive ? pillarTheme.colorClass : "text-white/20"}>
                    <PillarIcon pillar={tab.pillar!} size={14} />
                  </span>
                )}
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <OnrampBanner context="advancement" advancementName={advancement.name} />

      <div className={activePillarTheme ? `border-l-2 ${activePillarTheme.accentBorder} pl-6` : ""}>
        {activeTab === "overview" && (
          <OverviewTab
            advancement={advancement}
            stats={stats}
            platforms={platforms}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === "tree" && (
          <>
            <SectionHeader tab="tree" />
            <TreeView advancementId={advancement.id} color={theme.color} />
          </>
        )}

        {activeTab === "discussions" && (
          <>
            <SectionHeader tab="discussions" />
            <DiscussionForum advancementId={advancement.id} />
          </>
        )}

        {activeTab === "library" && (
          <>
            <SectionHeader tab="library" />
            <LibraryTab advancementId={advancement.id} />
          </>
        )}

        {activeTab === "platforms" && (
          <>
            <SectionHeader tab="platforms" />
            <PlatformsTab platforms={platforms} advancementColor={theme.color} />
          </>
        )}
      </div>
    </div>
  )
}

function OverviewTab({ advancement, stats, platforms, onNavigate }: {
  readonly advancement: { readonly id: string; readonly name: string; readonly description: string }
  readonly stats: SubHubStats
  readonly platforms: readonly PlatformLink[]
  readonly onNavigate: (tab: Tab) => void
}) {
  const pillars = [
    { key: "tree" as const, pillar: PILLAR_THEMES.tree, stat: `${stats.ideas} ideas`, description: "Explore and contribute ideas organized in a knowledge graph." },
    { key: "discussions" as const, pillar: PILLAR_THEMES.discussions, stat: `${stats.threads} threads`, description: "Join the conversation with fellow researchers and contributors." },
    { key: "library" as const, pillar: PILLAR_THEMES.library, stat: `${stats.libraryEntries} entries`, description: "Browse translated papers, articles, and learning resources." },
    { key: "platforms" as const, pillar: PILLAR_THEMES.platforms, stat: `${platforms.length} links`, description: "Connect with real-world projects, repos, and organizations." },
  ] as const

  return (
    <div className="space-y-8">
      <p className="text-white/40 leading-relaxed max-w-2xl">
        {advancement.description}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ideas", value: stats.ideas, color: PILLAR_THEMES.tree.colorClass, tab: "tree" as Tab },
          { label: "Discussions", value: stats.threads, color: PILLAR_THEMES.discussions.colorClass, tab: "discussions" as Tab },
          { label: "Library", value: stats.libraryEntries, color: PILLAR_THEMES.library.colorClass, tab: "library" as Tab },
          { label: "News", value: stats.newsLinks, color: PILLAR_THEMES.newsroom.colorClass, tab: undefined },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.tab ? () => onNavigate(item.tab!) : undefined}
            disabled={!item.tab}
            className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center hover:bg-white/[0.04] transition-all disabled:cursor-default"
          >
            <p className={`text-2xl font-bold font-mono ${item.color}`}>
              {item.value}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mt-1">
              {item.label}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pillars.map((p) => (
          <button
            key={p.key}
            onClick={() => onNavigate(p.key)}
            className={`group text-left p-5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all border-l-2 ${p.pillar.accentBorder}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={p.pillar.colorClass}>
                <PillarIcon pillar={p.pillar.key} size={16} />
              </span>
              <h3 className="text-sm font-semibold text-white/80">{p.pillar.label}</h3>
              <span className={`ml-auto font-mono text-[10px] ${p.pillar.colorClass} opacity-40`}>{p.stat}</span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed mb-3">{p.description}</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/30 group-hover:text-white/60 transition-colors">
              Open
              <ChevronRightIcon size={12} />
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-3">
          Quick Links
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/library?advancement=${advancement.id}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-xs text-white/50 hover:text-white/70 transition-all"
          >
            <BookIcon size={12} className="shrink-0" />
            Full Library
          </Link>
          <Link
            to={`/newsroom?advancement=${advancement.id}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-xs text-white/50 hover:text-white/70 transition-all"
          >
            <NewspaperIcon size={12} className="shrink-0" />
            Newsroom
          </Link>
        </div>
      </div>
    </div>
  )
}

function LibraryTab({ advancementId }: {
  readonly advancementId: string
}) {
  const [entries, setEntries] = useState<readonly { readonly id: string; readonly title: string; readonly contentType: string; readonly difficulty: string; readonly createdAt: Date }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLibraryEntries(advancementId)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [advancementId])

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading library...</p>
  }

  const TYPE_ICONS: Record<string, string> = { article: "✎", youtube: "▶", link: "↗", document: "◧" }

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
                {TYPE_ICONS[entry.contentType] ?? "✎"}
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

function PlatformTypeIcon({ type, size = 18 }: { readonly type: PlatformLink["type"]; readonly size?: number }) {
  switch (type) {
    case "github":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      )
    case "paper":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case "community":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case "tool":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case "dataset":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      )
    case "organization":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
          <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
        </svg>
      )
  }
}

function PlatformsTab({ platforms, advancementColor }: {
  readonly platforms: readonly PlatformLink[]
  readonly advancementColor: string
}) {
  const [activeFilter, setActiveFilter] = useState<PlatformLink["type"] | "all">("all")

  if (platforms.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/15">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </div>
        <p className="text-sm text-white/30 mb-1">No platforms linked yet</p>
        <p className="text-xs text-white/15">External platform links will be added soon.</p>
      </div>
    )
  }

  const types = [...new Set(platforms.map((p) => p.type))]
  const filtered = activeFilter === "all" ? platforms : platforms.filter((p) => p.type === activeFilter)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            activeFilter === "all"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
          }`}
        >
          All
          <span className="font-mono text-[10px] opacity-60">{platforms.length}</span>
        </button>
        {types.map((type) => {
          const config = PLATFORM_TYPE_CONFIG[type]
          const count = platforms.filter((p) => p.type === type).length
          const isActive = activeFilter === type
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? `${config.bg} ${config.color} shadow-sm border ${config.border}`
                  : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <span className={isActive ? "" : "opacity-40"}>
                <PlatformTypeIcon type={type} size={12} />
              </span>
              {config.label}
              <span className="font-mono text-[10px] opacity-50">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((platform, i) => {
          const config = PLATFORM_TYPE_CONFIG[platform.type]
          const isFirst = i === 0
          return (
            <a
              key={platform.url}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 ${config.border} ${config.bg}`}
              style={{
                boxShadow: `0 0 0 0 ${config.glow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 32px -8px ${config.glow}, 0 0 0 1px ${config.glow}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 0 ${config.glow}`
              }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${config.glow}, transparent 70%)` }}
              />

              <div className={`relative flex items-start gap-4 ${isFirst ? "p-6" : "p-5"}`}>
                <div className={`shrink-0 w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center ${config.color} transition-transform duration-300 group-hover:scale-110`}>
                  <PlatformTypeIcon type={platform.type} size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h4 className={`text-sm font-semibold ${config.color} opacity-80 group-hover:opacity-100 transition-opacity truncate`}>
                      {platform.name}
                    </h4>
                    <span
                      className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border opacity-50"
                      style={{
                        borderColor: `color-mix(in srgb, ${advancementColor} 20%, transparent)`,
                        color: advancementColor,
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed group-hover:text-white/45 transition-colors">
                    {platform.description}
                  </p>
                </div>

                <div className="shrink-0 mt-1 w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.08] flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/20 group-hover:text-white/60 transition-colors">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 py-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <span className="text-[10px] font-mono text-white/15 px-3">
          {platforms.length} external {platforms.length === 1 ? "platform" : "platforms"}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
    </div>
  )
}
