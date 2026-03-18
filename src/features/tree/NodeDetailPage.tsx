import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import type { TreeNode, NodeStatus } from "@/domain/node"
import { canContribute, canModerate } from "@/domain/reputation"
import { getNode, getNodeLineage, getNodesByAdvancement, supportNode, setNodeStatus, hasUserSupported, editNode } from "./node-service"
import { AdvancementIcon } from "@/shared/components/Icons"
import { SkeletonText } from "@/shared/components/Skeleton"
import { EmptyState } from "@/shared/components/EmptyState"
import { useToast } from "@/shared/components/Toast"
import { FlagButton } from "@/features/moderation/FlagButton"
import { BookmarkButton } from "@/features/bookmarks/BookmarkButton"
import { SubmitForReviewButton } from "@/features/peer-review/SubmitForReviewButton"
import { timeAgo } from "@/shared/utils/time"

const STATUS_STYLES: Record<NodeStatus, { readonly dot: string; readonly label: string; readonly badge: string }> = {
  theoretical: {
    dot: "bg-red-400/60",
    label: "Theoretical",
    badge: "text-red-400/60 bg-red-400/5 border-red-400/10",
  },
  proven: {
    dot: "bg-green-400/60",
    label: "Proven",
    badge: "text-green-400/60 bg-green-400/5 border-green-400/10",
  },
  disproved: {
    dot: "bg-gray-500/60",
    label: "Disproved",
    badge: "text-gray-400/60 bg-gray-400/5 border-gray-400/10",
  },
}

export function NodeDetailPage() {
  const { id: advancementId, nodeId } = useParams<{ id: string; nodeId: string }>()
  const { guildUser, refreshUser } = useAuth()
  const { toast } = useToast()

  const [node, setNode] = useState<TreeNode | null>(null)
  const [lineage, setLineage] = useState<readonly TreeNode[]>([])
  const [childNodes, setChildNodes] = useState<readonly TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState(false)
  const [supporting, setSupporting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  useEffect(() => {
    if (!nodeId || !advancementId) return
    setLoading(true)

    Promise.all([
      getNode(nodeId),
      getNodeLineage(nodeId),
      getNodesByAdvancement(advancementId),
    ])
      .then(([fetchedNode, fetchedLineage, allNodes]) => {
        setNode(fetchedNode)
        setLineage(fetchedLineage)
        setChildNodes(allNodes.filter((n) => n.parentNodeId === nodeId))
      })
      .catch((err) => console.error("Failed to load node:", err))
      .finally(() => setLoading(false))
  }, [nodeId, advancementId])

  useEffect(() => {
    if (guildUser && nodeId) {
      hasUserSupported(guildUser.uid, nodeId)
        .then(setSupported)
        .catch((err) => console.error("Failed to check support status:", err))
    }
  }, [guildUser, nodeId])

  const reload = () => {
    if (!nodeId || !advancementId) return
    Promise.all([
      getNode(nodeId),
      getNodesByAdvancement(advancementId),
    ])
      .then(([fetchedNode, allNodes]) => {
        setNode(fetchedNode)
        setChildNodes(allNodes.filter((n) => n.parentNodeId === nodeId))
      })
      .catch((err) => console.error("Failed to reload node:", err))
  }

  const handleSupport = async () => {
    if (!guildUser || !nodeId) return
    setSupporting(true)
    try {
      const result = await supportNode(guildUser.uid, guildUser.repPoints, nodeId)
      if (result.success) {
        setSupported(true)
        toast("Idea supported!", "success")
        await refreshUser()
        reload()
      } else {
        toast(result.reason, "error")
      }
    } catch {
      toast("Failed to support idea", "error")
    } finally {
      setSupporting(false)
    }
  }

  const handleSetStatus = async (newStatus: NodeStatus) => {
    if (!guildUser) return
    setStatusUpdating(true)
    try {
      await setNodeStatus(guildUser.repPoints, nodeId!, newStatus)
      toast(`Status changed to ${newStatus}`, "success")
      reload()
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleStartEdit = () => {
    if (!node) return
    setEditTitle(node.title)
    setEditDescription(node.description)
    setEditError("")
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!guildUser || !nodeId) return
    setEditSaving(true)
    setEditError("")
    try {
      const result = await editNode({
        userId: guildUser.uid,
        userRep: guildUser.repPoints,
        nodeId,
        title: editTitle,
        description: editDescription,
      })
      if (result.success) {
        setEditing(false)
        toast("Idea updated", "success")
        reload()
      } else {
        setEditError(result.reason)
      }
    } catch {
      toast("Failed to save changes", "error")
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-6">
        <div className="animate-pulse h-3 w-40 rounded bg-white/5" />
        <div className="animate-pulse h-8 w-2/3 rounded bg-white/5" />
        <SkeletonText lines={6} />
      </div>
    )
  }

  if (!node) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <EmptyState
          icon="tree"
          title="Idea not found"
          description="This idea may have been removed or doesn't exist."
        />
        {advancementId && (
          <Link
            to={`/advancements/${advancementId}`}
            className="text-cyan-400/70 hover:text-cyan-400 text-sm transition-colors mt-4 inline-block"
          >
            Back to Advancement
          </Link>
        )}
      </div>
    )
  }

  const advancement = ADVANCEMENTS.find((a) => a.id === advancementId)
  const theme = advancementId ? ADVANCEMENT_THEMES[advancementId] : undefined
  const statusStyle = STATUS_STYLES[node.status]
  const canUserContribute = guildUser ? canContribute(guildUser.repPoints) : false
  const canUserModerate = guildUser ? canModerate(guildUser.repPoints) : false
  const isOwnNode = guildUser?.uid === node.authorId
  const canEdit = isOwnNode || canUserModerate

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <nav className="flex items-center gap-2 text-xs font-mono mb-8 flex-wrap">
        <Link to="/" className="text-white/30 hover:text-white/60 transition-colors">Home</Link>
        <span className="text-white/15">/</span>
        <Link to={`/advancements/${advancementId}`} className="text-white/30 hover:text-white/60 transition-colors">
          {advancement?.name ?? "Advancement"}
        </Link>
        <span className="text-white/15">/</span>
        <span className="text-white/30">Tree</span>
        {lineage.slice(0, -1).map((ancestor) => (
          <span key={ancestor.id} className="contents">
            <span className="text-white/15">/</span>
            <Link
              to={`/advancements/${advancementId}/tree/${ancestor.id}`}
              className="text-white/30 hover:text-white/60 transition-colors truncate max-w-[120px]"
            >
              {ancestor.title}
            </Link>
          </span>
        ))}
        <span className="text-white/15">/</span>
        <span className="text-white/50 truncate max-w-[200px]">{node.title}</span>
      </nav>

      <article>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            {theme && advancement && (
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-60`}>
                  <AdvancementIcon icon={theme.icon} size={16} />
                </div>
                <span className="text-xs text-white/30">{advancement.name}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
              </div>
            )}
            <h1 className="font-display text-3xl text-white">{node.title}</h1>
          </div>
        </div>

        <p className="text-sm text-white/50 leading-relaxed mb-6">{node.description}</p>

        <div className="flex items-center gap-4 mb-8 flex-wrap text-xs">
          <span className="text-white/20 font-mono">
            {node.supportCount} support{node.supportCount !== 1 ? "s" : ""}
          </span>
          <span className="text-white/15 font-mono">
            {timeAgo(node.createdAt)}
          </span>

          {guildUser && canUserContribute && !isOwnNode && !supported && node.status !== "disproved" && (
            <button
              onClick={handleSupport}
              disabled={supporting}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-400/10 text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-400/15 border border-cyan-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {supporting ? "Supporting..." : "+ Support"}
            </button>
          )}

          {supported && (
            <span className="text-xs text-green-400/50 font-mono">Supported</span>
          )}

          {canEdit && !editing && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
            >
              Edit
            </button>
          )}

          {guildUser && !isOwnNode && (
            <FlagButton targetCollection="nodes" targetId={node.id} targetTitle={node.title} />
          )}

          <SubmitForReviewButton
            contentType="node"
            contentId={node.id}
            contentTitle={node.title}
            advancementId={node.advancementId}
            authorId={node.authorId}
          />

          <BookmarkButton
            targetType="node"
            targetId={node.id}
            targetTitle={node.title}
            advancementId={node.advancementId}
          />

          {canUserModerate && (
            <div className="flex items-center gap-1 ml-auto">
              {node.status !== "proven" && (
                <button
                  onClick={() => handleSetStatus("proven")}
                  disabled={statusUpdating}
                  className="text-[10px] font-mono px-2 py-1 rounded text-green-400/40 hover:text-green-400/80 hover:bg-green-400/5 transition-colors"
                >
                  Prove
                </button>
              )}
              {node.status !== "disproved" && (
                <button
                  onClick={() => handleSetStatus("disproved")}
                  disabled={statusUpdating}
                  className="text-[10px] font-mono px-2 py-1 rounded text-red-400/40 hover:text-red-400/80 hover:bg-red-400/5 transition-colors"
                >
                  Disprove
                </button>
              )}
              {node.status !== "theoretical" && (
                <button
                  onClick={() => handleSetStatus("theoretical")}
                  disabled={statusUpdating}
                  className="text-[10px] font-mono px-2 py-1 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {editing && (
          <div className="rounded-xl border border-white/10 bg-void-900 p-6 mb-8 space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-void-800 text-white/70 focus:outline-none focus:border-white/20"
              placeholder="Title"
              aria-label="Idea title"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-void-800 text-white/70 focus:outline-none focus:border-white/20 resize-none"
              placeholder="Description"
              aria-label="Idea description"
            />
            {editError && <p className="text-xs text-red-400/60">{editError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="px-4 py-1.5 text-xs font-medium rounded-md bg-white text-void-950 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {editSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {childNodes.length > 0 && (
          <section>
            <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
              Branch Ideas ({childNodes.length})
            </h2>
            <div className="space-y-2">
              {childNodes.map((child) => {
                const childStatus = STATUS_STYLES[child.status]
                return (
                  <Link
                    key={child.id}
                    to={`/advancements/${advancementId}/tree/${child.id}`}
                    className="block rounded-xl border border-white/5 bg-void-900 hover:bg-void-850 hover:border-white/10 transition-colors p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{child.title}</h3>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${childStatus.badge}`}>
                        {childStatus.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed line-clamp-2">{child.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-white/20 font-mono">
                        {child.supportCount} support{child.supportCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] text-white/15 font-mono">
                        {timeAgo(child.createdAt)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {childNodes.length === 0 && (
          <section>
            <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
              Branch Ideas
            </h2>
            <EmptyState
              icon="tree"
              title="No branch ideas yet"
              description={canUserContribute
                ? "Branch ideas can be created from the Tree view"
                : "Contributors with 100+ Rep can create branch ideas"
              }
            />
          </section>
        )}
      </article>
    </div>
  )
}
