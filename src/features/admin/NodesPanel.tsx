import { useState, useEffect, useCallback } from "react"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import type { TreeNode } from "@/domain/node"
import { getAllNodes, deleteNode, updateNodeField } from "./admin-service"
import { logAuditEvent } from "./audit-service"
import { timeAgo } from "@/shared/utils/time"
import { ConfirmButton } from "./ConfirmButton"
import type { ActorInfo } from "./UsersPanel"

function advancementLabel(id: string): string {
  return ADVANCEMENT_THEMES[id]?.shortName ?? id
}

function advancementColor(id: string): string {
  return ADVANCEMENT_THEMES[id]?.colorClass ?? "text-white/50"
}

export function NodesPanel({ actor }: { readonly actor: ActorInfo }) {
  const [nodes, setNodes] = useState<readonly TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getAllNodes().then(setNodes).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const node = nodes.find((n) => n.id === id)
    await deleteNode(id)
    await logAuditEvent({ ...actor, action: "delete_node", targetCollection: "nodes", targetId: id, details: `Deleted idea "${node?.title ?? id}"` })
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    const node = nodes.find((n) => n.id === id)
    await updateNodeField(id, "status", status)
    await logAuditEvent({ ...actor, action: "update_node_status", targetCollection: "nodes", targetId: id, details: `Changed status of "${node?.title ?? id}" from ${node?.status ?? "?"} to ${status}` })
    load()
  }

  const filtered = search
    ? nodes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : nodes

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading nodes...</p>
  }

  const STATUS_COLORS: Record<string, string> = {
    theoretical: "text-red-400/70 bg-red-400/10 border-red-400/20",
    proven: "text-green-400/70 bg-green-400/10 border-green-400/20",
    disproved: "text-white/30 bg-white/5 border-white/10",
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Ideas <span className="text-white/15">({nodes.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ideas..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-full sm:w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((node) => (
          <div key={node.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-white/70 font-medium truncate">{node.title}</p>
                <span className={`text-[10px] font-mono ${advancementColor(node.advancementId)}`}>
                  {advancementLabel(node.advancementId)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="font-mono">{node.supportCount} supports</span>
                <span>{timeAgo(node.createdAt)}</span>
                <span className="font-mono truncate max-w-[80px]">by {node.authorId.slice(0, 8)}...</span>
              </div>
            </div>

            <select
              value={node.status}
              onChange={(e) => handleStatusChange(node.id, e.target.value)}
              className={`text-[10px] font-mono px-2 py-1 rounded-md border cursor-pointer focus:outline-none ${STATUS_COLORS[node.status] ?? ""}`}
            >
              <option value="theoretical">Theoretical</option>
              <option value="proven">Proven</option>
              <option value="disproved">Disproved</option>
            </select>

            <ConfirmButton label="Delete" onConfirm={() => handleDelete(node.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/20 text-center py-8">
            {search ? "No ideas match your search" : "No ideas found"}
          </p>
        )}
      </div>
    </div>
  )
}
