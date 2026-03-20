import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import type { TreeNodeWithChildren, NodeStatus } from "@/domain/node"
import { canContribute, canModerate } from "@/domain/reputation"
import { supportNode, setNodeStatus, hasUserSupported, editNode } from "./node-service"
import { CreateNodeForm } from "./CreateNodeForm"
import { ChevronRightIcon } from "@/shared/components/Icons"
import { useToast } from "@/shared/components/Toast"
import { FlagButton } from "@/features/moderation/FlagButton"
import { BookmarkButton } from "@/features/bookmarks/BookmarkButton"

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

type NodeCardProps = {
  readonly treeNode: TreeNodeWithChildren
  readonly depth: number
  readonly color: string
  readonly onRefresh: () => void
}

export function NodeCard({ treeNode, depth, color, onRefresh }: NodeCardProps) {
  const { guildUser, refreshUser } = useAuth()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(depth < 2)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [supporting, setSupporting] = useState(false)
  const [supported, setSupported] = useState(false)
  const [supportError, setSupportError] = useState("")
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  const { node, children } = treeNode
  const statusStyle = STATUS_STYLES[node.status]

  useEffect(() => {
    if (guildUser) {
      hasUserSupported(guildUser.uid, node.id).then(setSupported).catch((err) => console.error("Failed to check support status:", err))
    }
  }, [guildUser, node.id])

  const handleSupport = async () => {
    if (!guildUser) return
    setSupporting(true)
    setSupportError("")

    try {
      const result = await supportNode(guildUser.uid, guildUser.repPoints, guildUser.role, node.id)
      if (result.success) {
        setSupported(true)
        toast("Idea supported!", "success")
        await refreshUser()
        onRefresh()
      } else {
        setSupportError(result.reason)
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
      await setNodeStatus(guildUser.repPoints, guildUser.role, node.id, newStatus)
      toast(`Status changed to ${newStatus}`, "success")
      onRefresh()
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleStartEdit = () => {
    setEditTitle(node.title)
    setEditDescription(node.description)
    setEditError("")
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!guildUser) return
    setEditSaving(true)
    setEditError("")
    try {
      const result = await editNode({
        userId: guildUser.uid,
        userRep: guildUser.repPoints,
        userRole: guildUser.role,
        nodeId: node.id,
        title: editTitle,
        description: editDescription,
      })
      if (result.success) {
        setEditing(false)
        toast("Idea updated", "success")
        onRefresh()
      } else {
        setEditError(result.reason)
      }
    } catch {
      toast("Failed to save changes", "error")
    } finally {
      setEditSaving(false)
    }
  }

  const canUserContribute = guildUser ? canContribute(guildUser.repPoints, guildUser.role) : false
  const canUserModerate = guildUser ? canModerate(guildUser.repPoints, guildUser.role) : false
  const isOwnNode = guildUser?.uid === node.authorId
  const canEdit = isOwnNode || canUserModerate

  return (
    <div className="relative">
      {depth > 0 && (
        <div
          className="absolute top-0 -left-5 w-5 h-5 border-l border-b rounded-bl-lg"
          style={{ borderColor: `${color}15` }}
        />
      )}

      <div className="group rounded-xl border border-white/5 bg-void-900 hover:bg-void-850 transition-colors">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 shrink-0"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse idea details" : "Expand idea details"}
            >
              <ChevronRightIcon
                size={14}
                className={`text-white/20 transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link
                  to={`/advancements/${node.advancementId}/tree/${node.id}`}
                  className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
                >
                  {node.title}
                </Link>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">{node.description}</p>

              <div className="flex items-center gap-4 mt-3">
                <span className="text-[10px] text-white/20 font-mono">
                  {node.supportCount} support{node.supportCount !== 1 ? "s" : ""}
                </span>

                {guildUser && canUserContribute && !isOwnNode && !supported && node.status !== "disproved" && (
                  <button
                    onClick={handleSupport}
                    disabled={supporting}
                    className="text-[10px] font-medium text-cyan-400/60 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {supporting ? "..." : "+ Support"}
                  </button>
                )}

                {supported && (
                  <span className="text-[10px] text-green-400/50 font-mono">Supported</span>
                )}

                {guildUser && canUserContribute && (
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="text-[10px] font-medium text-white/30 hover:text-white/60 transition-colors"
                  >
                    + Branch
                  </button>
                )}

                {canEdit && !editing && (
                  <button
                    onClick={handleStartEdit}
                    className="text-[10px] font-medium text-white/20 hover:text-white/50 transition-colors"
                  >
                    Edit
                  </button>
                )}

                {guildUser && !isOwnNode && (
                  <FlagButton targetCollection="nodes" targetId={node.id} targetTitle={node.title} />
                )}

                {guildUser && (
                  <BookmarkButton
                    targetType="node"
                    targetId={node.id}
                    targetTitle={node.title}
                    advancementId={node.advancementId}
                  />
                )}

                {canUserModerate && (
                  <div className="flex items-center gap-1 ml-auto">
                    {node.status !== "proven" && (
                      <button
                        onClick={() => handleSetStatus("proven")}
                        disabled={statusUpdating}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded text-green-400/40 hover:text-green-400/80 hover:bg-green-400/5 transition-colors"
                      >
                        Prove
                      </button>
                    )}
                    {node.status !== "disproved" && (
                      <button
                        onClick={() => handleSetStatus("disproved")}
                        disabled={statusUpdating}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded text-red-400/40 hover:text-red-400/80 hover:bg-red-400/5 transition-colors"
                      >
                        Disprove
                      </button>
                    )}
                    {node.status !== "theoretical" && (
                      <button
                        onClick={() => handleSetStatus("theoretical")}
                        disabled={statusUpdating}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>

              {supportError && (
                <p className="text-[10px] text-red-400/60 mt-1">{supportError}</p>
              )}
            </div>
          </div>
        </div>

        {editing && (
          <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-void-800 text-white/70 focus:outline-none focus:border-white/20"
              placeholder="Title"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-void-800 text-white/70 focus:outline-none focus:border-white/20 resize-none"
              placeholder="Description"
            />
            {editError && <p className="text-[10px] text-red-400/60">{editError}</p>}
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

        {showCreateForm && (
          <div className="px-4 pb-4 border-t border-white/5 pt-4">
            <CreateNodeForm
              advancementId={node.advancementId}
              parentNodeId={node.id}
              parentTitle={node.title}
              onCreated={() => {
                setShowCreateForm(false)
                setExpanded(true)
                onRefresh()
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="ml-2 sm:ml-5 mt-2 space-y-2 relative">
          <div
            className="absolute top-0 left-0 bottom-4 w-px"
            style={{ backgroundColor: `${color}10` }}
          />
          {children.map((child) => (
            <div key={child.node.id} className="relative pl-2 sm:pl-5">
              <NodeCard
                treeNode={child}
                depth={depth + 1}
                color={color}
                onRefresh={onRefresh}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
