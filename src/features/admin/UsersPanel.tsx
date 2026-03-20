import { useState, useEffect, useCallback } from "react"
import type { GuildUser } from "@/domain/user"
import { getAllUsers, updateUserRep, deleteUser } from "./admin-service"
import { logAuditEvent } from "./audit-service"
import { timeAgo } from "@/shared/utils/time"
import { ConfirmButton } from "./ConfirmButton"
import { useToast } from "@/shared/components/Toast"

export type ActorInfo = { readonly actorId: string; readonly actorName: string }

export function UsersPanel({ actor }: { readonly actor: ActorInfo }) {
  const [users, setUsers] = useState<readonly GuildUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingRep, setEditingRep] = useState<string | null>(null)
  const [repValue, setRepValue] = useState("")
  const { toast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    getAllUsers().then(setUsers).catch(() => toast("Failed to load users", "error")).finally(() => setLoading(false))
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleRepSave = async (uid: string) => {
    const val = parseInt(repValue, 10)
    if (isNaN(val)) return
    try {
      const oldUser = users.find((u) => u.uid === uid)
      await updateUserRep(uid, val)
      await logAuditEvent({ ...actor, action: "update_rep", targetCollection: "users", targetId: uid, details: `Rep changed from ${oldUser?.repPoints ?? "?"} to ${val}` })
      setEditingRep(null)
      load()
    } catch {
      toast("Failed to update rep", "error")
    }
  }

  const handleDelete = async (uid: string) => {
    try {
      const user = users.find((u) => u.uid === uid)
      await deleteUser(uid)
      await logAuditEvent({ ...actor, action: "delete_user", targetCollection: "users", targetId: uid, details: `Deleted user "${user?.displayName ?? uid}"` })
      load()
    } catch {
      toast("Failed to delete user", "error")
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30">
          Users <span className="text-white/15">({users.length})</span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/15 w-full sm:w-56"
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">User</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25 hidden sm:table-cell">Email</th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">Rep</th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25">School</th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/25 hidden md:table-cell">Joined</th>
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
                  <td className="px-4 py-3 text-white/40 font-mono hidden sm:table-cell">{user.email}</td>
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
                          user.role === "admin" ? "text-red-400" :
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
                  <td className="px-4 py-3 text-center text-white/25 hidden md:table-cell">{timeAgo(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== "admin" && (
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
