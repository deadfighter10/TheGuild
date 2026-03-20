import { useState, useEffect } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { isAdmin } from "@/domain/user"
import { getAdminStats, type AdminStats } from "./admin-service"
import { FlagsPanel } from "@/features/moderation/FlagsPanel"
import { AnalyticsPanel } from "@/features/analytics/AnalyticsPanel"
import { OverviewPanel } from "./OverviewPanel"
import { UsersPanel } from "./UsersPanel"
import { NodesPanel } from "./NodesPanel"
import { LibraryPanel } from "./LibraryPanel"
import { NewsPanel } from "./NewsPanel"
import { ThreadsPanel } from "./ThreadsPanel"
import { AuditPanel } from "./AuditPanel"

type AdminTab = "overview" | "analytics" | "users" | "nodes" | "library" | "newsroom" | "discussions" | "flags" | "audit"

const ADMIN_TABS: readonly { readonly key: AdminTab; readonly label: string; readonly icon: string }[] = [
  { key: "overview", label: "Overview", icon: "◉" },
  { key: "analytics", label: "Analytics", icon: "◈" },
  { key: "users", label: "Users", icon: "◎" },
  { key: "nodes", label: "Ideas", icon: "◇" },
  { key: "library", label: "Library", icon: "▣" },
  { key: "newsroom", label: "News", icon: "▤" },
  { key: "discussions", label: "Threads", icon: "▧" },
  { key: "flags", label: "Flags", icon: "⚑" },
  { key: "audit", label: "Audit Log", icon: "◆" },
]

export function AdminPage() {
  const { guildUser } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    getAdminStats().then(setStats).catch((err) => console.error("Failed to load admin stats:", err))
  }, [])

  if (!guildUser || !isAdmin(guildUser.role)) {
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

      <div className="flex items-center gap-1 mb-8 overflow-x-auto scrollbar-none border-b border-white/[0.06] -mb-px -mx-6 px-6 sm:mx-0 sm:px-0">
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
        {activeTab === "analytics" && <AnalyticsPanel />}
        {activeTab === "users" && <UsersPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "nodes" && <NodesPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "library" && <LibraryPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "newsroom" && <NewsPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "discussions" && <ThreadsPanel actor={{ actorId: guildUser.uid, actorName: guildUser.displayName }} />}
        {activeTab === "flags" && <FlagsPanel actorId={guildUser.uid} actorName={guildUser.displayName} />}
        {activeTab === "audit" && <AuditPanel />}
      </div>
    </div>
  )
}
