import { useState, useEffect, useCallback } from "react"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { getNodesByAuthor } from "@/features/tree/node-service"
import { getLibraryEntriesByAuthor } from "@/features/library/library-service"
import { getNewsLinksBySubmitter } from "@/features/newsroom/news-service"
import { Link } from "react-router-dom"
import type { TreeNode } from "@/domain/node"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"

type ContributionsData = {
  readonly nodes: readonly TreeNode[]
  readonly entries: readonly LibraryEntry[]
  readonly links: readonly NewsLink[]
}

export function ContributionsSection({ userId }: { readonly userId: string }) {
  const [data, setData] = useState<ContributionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"nodes" | "library" | "news">("nodes")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nodes, entries, links] = await Promise.all([
        getNodesByAuthor(userId),
        getLibraryEntriesByAuthor(userId),
        getNewsLinksBySubmitter(userId),
      ])
      setData({ nodes, entries, links })
    } catch {
      // UI shows stale state as fallback
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-white/30 font-mono">Loading contributions...</p>
      </div>
    )
  }

  if (!data) return null

  const totalCount = data.nodes.length + data.entries.length + data.links.length

  if (totalCount === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
        <p className="text-sm text-white/30 mb-1">No contributions yet</p>
        <p className="text-xs text-white/25">Start contributing to see your work here</p>
      </div>
    )
  }

  const tabs = [
    { key: "nodes" as const, label: "Ideas", count: data.nodes.length },
    { key: "library" as const, label: "Library", count: data.entries.length },
    { key: "news" as const, label: "News", count: data.links.length },
  ]

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {tabs.map((tab) => (
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
          {data.nodes.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No ideas submitted</p>
          ) : (
            data.nodes.map((node) => {
              const theme = ADVANCEMENT_THEMES[node.advancementId]
              return (
                <Link
                  key={node.id}
                  to={`/advancements/${node.advancementId}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                >
                  {theme && (
                    <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                      <AdvancementIcon icon={theme.icon} size={14} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{node.title}</p>
                    <span className="text-[10px] text-white/30 font-mono">
                      {node.supportCount} support{node.supportCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ChevronRightIcon size={14} className="text-white/15" />
                </Link>
              )
            })
          )}
        </div>
      )}

      {activeTab === "library" && (
        <div className="space-y-2">
          {data.entries.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No library entries</p>
          ) : (
            data.entries.map((entry) => {
              const theme = ADVANCEMENT_THEMES[entry.advancementId]
              return (
                <Link
                  key={entry.id}
                  to={`/library/${entry.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                >
                  {theme && (
                    <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                      <AdvancementIcon icon={theme.icon} size={14} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{entry.title}</p>
                  </div>
                  <ChevronRightIcon size={14} className="text-white/15" />
                </Link>
              )
            })
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="space-y-2">
          {data.links.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No news links submitted</p>
          ) : (
            data.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{link.title}</p>
                  <span className="text-[10px] text-white/30 font-mono">
                    score: {link.score}
                  </span>
                </div>
                <ChevronRightIcon size={14} className="text-white/15" />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  )
}
