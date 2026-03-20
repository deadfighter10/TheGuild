import type { AdminStats } from "./admin-service"

export function OverviewPanel({ stats }: { readonly stats: AdminStats | null }) {
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
