import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { ADVANCEMENT_PLATFORMS } from "@/domain/advancement-platforms"
import { PILLAR_THEMES } from "@/domain/pillar-theme"
import { AdvancementIcon } from "@/shared/components/Icons"
import { OnrampBanner } from "@/shared/components/OnrampBanner"
import { TreeView } from "@/features/tree/TreeView"
import { DiscussionForum } from "@/features/discussions/DiscussionForum"
import { getNodesByAdvancement } from "@/features/tree/node-service"
import { getLibraryEntries } from "@/features/library/library-service"
import { getNewsLinks } from "@/features/newsroom/news-service"
import { getThreadsByAdvancement } from "@/features/discussions/discussion-service"
import { usePageMeta } from "@/shared/hooks/use-page-meta"
import type { Tab } from "./advancement-types"
import { PillarIcon, SectionHeader } from "./SectionHeader"
import { AdvancementSwitcher } from "./AdvancementSwitcher"
import { OverviewTab } from "./OverviewTab"
import { LibraryTab } from "./LibraryTab"
import { PlatformsTab } from "./PlatformsTab"

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
        threads: threads.items.length,
        libraryEntries: entries.items.length,
        newsLinks: links.items.length,
      })
    }).catch((err) => console.error("Failed to load advancement stats:", err))
  }, [advancementId])

  return stats
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

  usePageMeta({ title: advancement.name })

  const stats = useSubHubStats(advancement.id)
  const activePillar = TAB_CONFIG.find((t) => t.key === activeTab)?.pillar
  const activePillarTheme = activePillar ? PILLAR_THEMES[activePillar] : null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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

      <div className="border-b border-white/[0.06] mb-8 -mx-6 px-6 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-none pb-px">
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

      <div className={activePillarTheme ? `border-l-2 ${activePillarTheme.accentBorder} pl-3 sm:pl-6` : ""}>
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
