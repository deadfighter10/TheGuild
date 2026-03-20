import { useState, useCallback } from "react"
import { PILLAR_THEMES } from "@/domain/pillar-theme"
import { BookIcon, NewspaperIcon, TreeIcon } from "@/shared/components/Icons"
import type { Tab } from "./advancement-types"

const TAB_CONFIG: readonly { readonly key: Tab; readonly pillar: keyof typeof PILLAR_THEMES | null; readonly label: string }[] = [
  { key: "overview", pillar: null, label: "Overview" },
  { key: "tree", pillar: "tree", label: "Tree" },
  { key: "discussions", pillar: "discussions", label: "Discussions" },
  { key: "library", pillar: "library", label: "Library" },
  { key: "platforms", pillar: "platforms", label: "Platforms" },
]

export function PillarIcon({ pillar, size = 14 }: { readonly pillar: string; readonly size?: number }) {
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

export function SectionHeader({ tab }: { readonly tab: Tab }) {
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
