import { useState, useCallback, useMemo } from "react"
import Fuse from "fuse.js"
import { useAuth } from "@/features/auth/AuthContext"
import { buildTree } from "@/domain/node"
import type { TreeNodeWithChildren, NodeStatus } from "@/domain/node"
import { canContribute } from "@/domain/reputation"
import { subscribeToNodesByAdvancement } from "./node-service"
import { useRealtimeQuery } from "@/shared/hooks/use-realtime-query"
import { CreateNodeForm } from "./CreateNodeForm"
import { EmptyState } from "@/shared/components/EmptyState"
import { NodeCard } from "./NodeCard"

type SortMode = "newest" | "most-supported" | "status"

const STATUS_ORDER: Record<NodeStatus, number> = {
  proven: 0,
  theoretical: 1,
  disproved: 2,
}

function sortNodes(nodes: readonly TreeNodeWithChildren[], mode: SortMode): readonly TreeNodeWithChildren[] {
  const sorted = [...nodes]
  switch (mode) {
    case "newest":
      return sorted.sort((a, b) => b.node.createdAt.getTime() - a.node.createdAt.getTime())
    case "most-supported":
      return sorted.sort((a, b) => b.node.supportCount - a.node.supportCount)
    case "status":
      return sorted.sort((a, b) => STATUS_ORDER[a.node.status] - STATUS_ORDER[b.node.status])
  }
}

function filterTree(
  nodes: readonly TreeNodeWithChildren[],
  query: string,
): readonly TreeNodeWithChildren[] {
  if (!query) return nodes

  const fuse = new Fuse([{ title: "", description: "" }], {
    keys: ["title", "description"],
    threshold: 0.4,
    includeScore: true,
  })

  function matches(node: TreeNodeWithChildren): TreeNodeWithChildren | null {
    fuse.setCollection([{ title: node.node.title, description: node.node.description }])
    const fuzzyMatch = fuse.search(query).length > 0
    const filteredChildren = node.children
      .map(matches)
      .filter((c): c is TreeNodeWithChildren => c !== null)

    if (fuzzyMatch || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren }
    }
    return null
  }

  return nodes
    .map(matches)
    .filter((n): n is TreeNodeWithChildren => n !== null)
}

type TreeViewProps = {
  readonly advancementId: string
  readonly color: string
}

export function TreeView({ advancementId, color }: TreeViewProps) {
  const { guildUser } = useAuth()
  const [showCreateRoot, setShowCreateRoot] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("newest")

  const subscribe = useCallback(
    (onData: (items: readonly import("@/domain/node").TreeNode[]) => void, onError: (error: Error) => void) =>
      subscribeToNodesByAdvancement(advancementId, onData, onError),
    [advancementId],
  )
  const { data: nodes, loading } = useRealtimeQuery(subscribe)

  const tree = useMemo(() => buildTree(nodes), [nodes])
  const filteredTree = useMemo(
    () => sortNodes(filterTree(tree, searchQuery), sortMode),
    [tree, searchQuery, sortMode],
  )
  const canUserContribute = guildUser ? canContribute(guildUser.repPoints, guildUser.role) : false

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-white/30 font-mono">Loading tree...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">
            The Tree
          </h3>
          <span className="font-mono text-[10px] text-white/20">
            {nodes.length} idea{nodes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {canUserContribute && !showCreateRoot && (
          <button
            onClick={() => setShowCreateRoot(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
          >
            + New Root Idea
          </button>
        )}
      </div>

      {nodes.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search ideas"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-white/10 bg-void-900 text-white/70 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["newest", "most-supported", "status"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-2.5 py-1.5 text-[10px] font-mono rounded-md transition-colors ${
                  sortMode === mode
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white/50 hover:bg-white/5"
                }`}
              >
                {mode === "most-supported" ? "Top" : mode === "newest" ? "New" : "Status"}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCreateRoot && (
        <div className="mb-4">
          <CreateNodeForm
            advancementId={advancementId}
            parentNodeId={null}
            onCreated={() => {
              setShowCreateRoot(false)
            }}
            onCancel={() => setShowCreateRoot(false)}
          />
        </div>
      )}

      {tree.length === 0 ? (
        <EmptyState
          icon="tree"
          title="No ideas yet"
          description={canUserContribute
            ? "Be the first to plant a seed in this tree"
            : "Contributors with 100+ Rep can create ideas"
          }
        />
      ) : filteredTree.length === 0 ? (
        <EmptyState
          icon="search"
          title={`No ideas match \u201c${searchQuery}\u201d`}
        />
      ) : (
        <div className="space-y-3">
          {filteredTree.map((treeNode) => (
            <NodeCard
              key={treeNode.node.id}
              treeNode={treeNode}
              depth={0}
              color={color}
              onRefresh={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
