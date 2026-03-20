import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { PILLAR_THEMES } from "@/domain/pillar-theme"
import type { PlatformLink } from "@/domain/advancement-platforms"
import { BookIcon, NewspaperIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { getNodesByAdvancement } from "@/features/tree/node-service"
import { getLibraryEntries } from "@/features/library/library-service"
import { getNewsLinks } from "@/features/newsroom/news-service"
import { getThreadsByAdvancement } from "@/features/discussions/discussion-service"
import { timeAgo } from "@/shared/utils/time"
import { PillarIcon } from "./SectionHeader"
import type { Tab } from "./advancement-types"

type ActivityItem = {
  readonly id: string
  readonly type: "idea" | "thread" | "entry" | "link"
  readonly title: string
  readonly createdAt: Date
  readonly tab?: Tab
}

const ACTIVITY_ICONS: Record<ActivityItem["type"], { label: string; color: string }> = {
  idea: { label: "Idea", color: "text-emerald-400/50" },
  thread: { label: "Thread", color: "text-blue-400/50" },
  entry: { label: "Library", color: "text-cyan-400/50" },
  link: { label: "News", color: "text-violet-400/50" },
}

function RecentActivity({ advancementId, onNavigate }: {
  readonly advancementId: string
  readonly onNavigate: (tab: Tab) => void
}) {
  const [items, setItems] = useState<readonly ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getNodesByAdvancement(advancementId),
      getThreadsByAdvancement(advancementId),
      getLibraryEntries(advancementId),
      getNewsLinks(advancementId),
    ]).then(([nodes, threads, entries, links]) => {
      const all: ActivityItem[] = [
        ...nodes.map((n) => ({ id: n.id, type: "idea" as const, title: n.title, createdAt: n.createdAt, tab: "tree" as Tab })),
        ...threads.items.map((t) => ({ id: t.id, type: "thread" as const, title: t.title, createdAt: t.createdAt, tab: "discussions" as Tab })),
        ...entries.items.map((e) => ({ id: e.id, type: "entry" as const, title: e.title, createdAt: e.createdAt, tab: "library" as Tab })),
        ...links.items.map((l) => ({ id: l.id, type: "link" as const, title: l.title, createdAt: l.createdAt })),
      ]
      all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setItems(all.slice(0, 10))
    }).catch((err) => console.error("Failed to load activity feed:", err)).finally(() => setLoading(false))
  }, [advancementId])

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
        <div className="animate-pulse h-3 w-32 rounded bg-white/5 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="animate-pulse h-3 w-full rounded bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
        Recent Activity
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const icon = ACTIVITY_ICONS[item.type]
          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={item.tab ? () => onNavigate(item.tab!) : undefined}
              disabled={!item.tab}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left disabled:cursor-default"
            >
              <span className={`text-[9px] font-mono uppercase w-12 shrink-0 ${icon.color}`}>
                {icon.label}
              </span>
              <span className="text-xs text-white/50 truncate flex-1">{item.title}</span>
              <span className="text-[10px] text-white/20 shrink-0 font-mono">{timeAgo(item.createdAt)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type SubHubStats = {
  readonly ideas: number
  readonly threads: number
  readonly libraryEntries: number
  readonly newsLinks: number
}

export function OverviewTab({ advancement, stats, platforms, onNavigate }: {
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
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

      <RecentActivity advancementId={advancement.id} onNavigate={onNavigate} />
    </div>
  )
}
