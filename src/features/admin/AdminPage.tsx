import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { isAdmin } from "@/domain/user"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import type { GuildUser } from "@/domain/user"
import type { TreeNode } from "@/domain/node"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"
import type { DiscussionThread } from "@/domain/discussion"
import {
  getAllUsers,
  updateUserRep,
  deleteUser,
  getAllNodes,
  deleteNode,
  updateNodeField,
  getAllLibraryEntries,
  deleteLibraryEntry,
  getAllNewsLinks,
  deleteNewsLink,
  getAllThreads,
  deleteThread,
  getAdminStats,
  type AdminStats,
} from "./admin-service"
import { logAuditEvent, getAuditLog } from "./audit-service"
import type { AuditLogEntry } from "@/domain/audit-log"

type AdminTab = "overview" | "users" | "nodes" | "library" | "newsroom" | "discussions" | "audit"

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function advancementLabel(id: string): string {
  return ADVANCEMENT_THEMES[id]?.shortName ?? id
}

function advancementColor(id: string): string {
  return ADVANCEMENT_THEMES[id]?.colorClass ?? "text-white/50"
}

function ConfirmButton({ label, onConfirm, variant = "danger" }: {
  readonly label: string
  readonly onConfirm: () => void
  readonly variant?: "danger" | "warning"
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={() => { onConfirm(); setConfirming(false) }}
          className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-0.5 text-[10px] font-mono rounded text-white/30 hover:text-white/60 transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
        variant === "danger"
          ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
          : "text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10"
      }`}
    >
      {label}
    </button>
  )
}

function OverviewPanel({ stats }: { readonly stats: AdminStats | null }) {
  if (!stats) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading stats...</p>
  }

  const cards = [
    { label: "Users", value: stats.users, color: "from-cyan-500/20 to-cyan-500/5", text: "text-cyan-400" },
    { label: "Ideas", value: stats.nodes, color: "from-green-500/20 to-green-500/5", text: "text-green-400" },
    { label: "Library", value: stats.libraryEntries, color: "from-violet-500/20 to-violet-500/5", text: "text-violet-400" },
    { label: "News", value: stats.newsLinks, color: "from-orange-500/20 to-orange-500/5", text: "text-orange-400" },
    { label: "Threads", value: stats.threads, color: "from-amber-500/20 to-amber-500/5", text: "text-amber-400" },
  ]

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-6">Platform Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`p-5 rounded-2xl bg-gradient-to-b ${c.color} border border-white/[0.04]`}>
            <p className={`text-2xl font-bold font-mono ${c.text}`}>{c.value}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

type ActorInfo = { readonly actorId: string; readonly actorName: string }

function UsersPanel({ actor }: { readonly actor: ActorInfo }) {
  const [users, setUsers] = useState<readonly GuildUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingRep, setEditingRep] = useState<string | null>(null)
  const [repValue, setRepValue] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getAllUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleRepSave = async (uid: string) => {
    const val = parseInt(repValue, 10)
    if (isNaN(val)) return
    const oldUser = users.find((u) => u.uid === uid)
    await updateUserRep(uid, val)
    await logAuditEvent({ ...actor, action: "update_rep", targetCollection: "users", targetId: uid, details: `Rep changed from ${oldUser?.repPoints ?? "?"} to ${val}` })
    setEditingRep(null)
    load()
  }

  const handleDelete = async (uid: string) => {
    const user = users.find((u) => u.uid === uid)
    await deleteUser(uid)
    await logAuditEvent({ ...actor, action: "delete_user", targetCollection: "users", targetId: uid, details: `Deleted user "${user?.displayName ?? uid}"` })
    load()
  }

  const filtered = search
    ? users.filter((u) =>
        u.displayName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.uid.includes(search)
      )
    : users

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading users...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Users <span className="text-white/15">({users.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-56"
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">User</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">Email</th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">Rep</th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">School</th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">Joined</th>
                <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.uid} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white/70 font-medium">{user.displayName}</p>
                      <p className="text-white/20 font-mono text-[10px] mt-0.5 truncate max-w-[120px]">{user.uid}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/40 font-mono">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    {editingRep === user.uid ? (
                      <span className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={repValue}
                          onChange={(e) => setRepValue(e.target.value)}
                          className="w-16 px-1.5 py-0.5 text-xs text-center rounded bg-void-950 border border-white/10 text-white/80 focus:outline-none focus:border-cyan-400/30"
                          onKeyDown={(e) => { if (e.key === "Enter") handleRepSave(user.uid); if (e.key === "Escape") setEditingRep(null) }}
                          autoFocus
                        />
                        <button onClick={() => handleRepSave(user.uid)} className="text-cyan-400/70 hover:text-cyan-400 text-[10px]">✓</button>
                        <button onClick={() => setEditingRep(null)} className="text-white/30 hover:text-white/60 text-[10px]">✕</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => { setEditingRep(user.uid); setRepValue(String(user.repPoints)) }}
                        className={`font-mono font-semibold hover:underline ${
                          user.repPoints === -1 ? "text-red-400" :
                          user.repPoints >= 3000 ? "text-amber-400" :
                          user.repPoints >= 100 ? "text-cyan-400" : "text-white/40"
                        }`}
                      >
                        {user.repPoints}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.isSchoolEmail ? (
                      <span className="text-green-400/60">✓</span>
                    ) : (
                      <span className="text-white/15">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-white/25">{timeAgo(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {user.repPoints !== -1 && (
                      <ConfirmButton label="Delete" onConfirm={() => handleDelete(user.uid)} />
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/20">
                    {search ? "No users match your search" : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function NodesPanel({ actor }: { readonly actor: ActorInfo }) {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Ideas <span className="text-white/15">({nodes.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ideas..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-56"
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

function LibraryPanel({ actor }: { readonly actor: ActorInfo }) {
  const [entries, setEntries] = useState<readonly LibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getAllLibraryEntries().then(setEntries).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const entry = entries.find((e) => e.id === id)
    await deleteLibraryEntry(id)
    await logAuditEvent({ ...actor, action: "delete_library_entry", targetCollection: "libraryEntries", targetId: id, details: `Deleted entry "${entry?.title ?? id}"` })
    load()
  }

  const filtered = search
    ? entries.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : entries

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading entries...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Library Entries <span className="text-white/15">({entries.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((entry) => (
          <div key={entry.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-white/70 font-medium truncate">{entry.title}</p>
                <span className={`text-[10px] font-mono ${advancementColor(entry.advancementId)}`}>
                  {advancementLabel(entry.advancementId)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="font-mono">{entry.contentType}</span>
                <span className="font-mono">{entry.difficulty}</span>
                <span>{timeAgo(entry.createdAt)}</span>
              </div>
            </div>
            <ConfirmButton label="Delete" onConfirm={() => handleDelete(entry.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/20 text-center py-8">
            {search ? "No entries match your search" : "No entries found"}
          </p>
        )}
      </div>
    </div>
  )
}

function NewsPanel({ actor }: { readonly actor: ActorInfo }) {
  const [links, setLinks] = useState<readonly NewsLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getAllNewsLinks().then(setLinks).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const link = links.find((l) => l.id === id)
    await deleteNewsLink(id)
    await logAuditEvent({ ...actor, action: "delete_news_link", targetCollection: "newsLinks", targetId: id, details: `Deleted link "${link?.title ?? id}"` })
    load()
  }

  const filtered = search
    ? links.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()))
    : links

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading news links...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          News Links <span className="text-white/15">({links.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((link) => (
          <div key={link.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-white/70 font-medium truncate">{link.title}</p>
                <span className={`text-[10px] font-mono ${advancementColor(link.advancementId)}`}>
                  {advancementLabel(link.advancementId)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="font-mono">score: {link.score}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/40 truncate max-w-[200px] underline">
                  {link.url}
                </a>
                <span>{timeAgo(link.createdAt)}</span>
              </div>
            </div>
            <ConfirmButton label="Delete" onConfirm={() => handleDelete(link.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/20 text-center py-8">
            {search ? "No links match your search" : "No links found"}
          </p>
        )}
      </div>
    </div>
  )
}

function ThreadsPanel({ actor }: { readonly actor: ActorInfo }) {
  const [threads, setThreads] = useState<readonly DiscussionThread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getAllThreads().then(setThreads).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const thread = threads.find((t) => t.id === id)
    await deleteThread(id)
    await logAuditEvent({ ...actor, action: "delete_thread", targetCollection: "discussionThreads", targetId: id, details: `Deleted thread "${thread?.title ?? id}"` })
    load()
  }

  const filtered = search
    ? threads.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : threads

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading threads...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Discussion Threads <span className="text-white/15">({threads.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-56"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((thread) => (
          <div key={thread.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-white/70 font-medium truncate">{thread.title}</p>
                <span className={`text-[10px] font-mono ${advancementColor(thread.advancementId)}`}>
                  {advancementLabel(thread.advancementId)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span>by {thread.authorName}</span>
                <span className="font-mono">{thread.replyCount} replies</span>
                <span>{timeAgo(thread.createdAt)}</span>
              </div>
            </div>
            <ConfirmButton label="Delete" onConfirm={() => handleDelete(thread.id)} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/20 text-center py-8">
            {search ? "No threads match your search" : "No threads found"}
          </p>
        )}
      </div>
    </div>
  )
}

const ACTION_LABELS: Record<string, string> = {
  delete_user: "Delete User",
  update_rep: "Update Rep",
  delete_node: "Delete Idea",
  update_node_status: "Change Status",
  delete_library_entry: "Delete Entry",
  delete_news_link: "Delete Link",
  delete_thread: "Delete Thread",
  delete_reply: "Delete Reply",
}

const ACTION_COLORS: Record<string, string> = {
  delete_user: "text-red-400/70 bg-red-400/10",
  update_rep: "text-amber-400/70 bg-amber-400/10",
  delete_node: "text-red-400/70 bg-red-400/10",
  update_node_status: "text-cyan-400/70 bg-cyan-400/10",
  delete_library_entry: "text-red-400/70 bg-red-400/10",
  delete_news_link: "text-red-400/70 bg-red-400/10",
  delete_thread: "text-red-400/70 bg-red-400/10",
  delete_reply: "text-red-400/70 bg-red-400/10",
}

function AuditPanel() {
  const [entries, setEntries] = useState<readonly AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLog(100).then(setEntries).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading audit log...</p>
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-white/30 mb-1">No audit events yet</p>
        <p className="text-xs text-white/20">Admin actions will be logged here.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
        Audit Log <span className="text-white/15">({entries.length} events)</span>
      </h2>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-4 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.02]"
          >
            <span className={`shrink-0 mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded ${ACTION_COLORS[entry.action] ?? "text-white/50 bg-white/5"}`}>
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60">{entry.details}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-white/25">
                <span>by {entry.actorName}</span>
                <span className="font-mono">{entry.targetCollection}/{entry.targetId.slice(0, 8)}...</span>
                <span>{timeAgo(entry.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ADMIN_TABS: readonly { readonly key: AdminTab; readonly label: string; readonly icon: string }[] = [
  { key: "overview", label: "Overview", icon: "◉" },
  { key: "users", label: "Users", icon: "◎" },
  { key: "nodes", label: "Ideas", icon: "◇" },
  { key: "library", label: "Library", icon: "▣" },
  { key: "newsroom", label: "News", icon: "▤" },
  { key: "discussions", label: "Threads", icon: "▧" },
  { key: "audit", label: "Audit Log", icon: "◆" },
]

export function AdminPage() {
  const { guildUser } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {})
  }, [])

  if (!guildUser || !isAdmin(guildUser.repPoints)) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-white/30">Access denied.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-xl text-white/90">Admin Panel</h1>
          <p className="font-mono text-[10px] text-red-400/40 mt-0.5">
            Logged in as {guildUser.displayName} &middot; Full access
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-8 overflow-x-auto scrollbar-none border-b border-white/[0.06] -mb-px">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "text-red-400 border-red-400/60"
                : "text-white/30 border-transparent hover:text-white/50"
            }`}
          >
            <span className="text-xs opacity-50">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "overview" && <OverviewPanel stats={stats} />}
        {activeTab === "users" && <UsersPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "nodes" && <NodesPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "library" && <LibraryPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "newsroom" && <NewsPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "discussions" && <ThreadsPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "audit" && <AuditPanel />}
      </div>
    </div>
  )
}
