import { useState } from "react"
import type { PlatformLink } from "@/domain/advancement-platforms"

const PLATFORM_TYPE_CONFIG: Record<PlatformLink["type"], {
  readonly label: string
  readonly color: string
  readonly bg: string
  readonly border: string
  readonly glow: string
  readonly iconBg: string
}> = {
  github: { label: "Code", color: "text-white", bg: "bg-white/[0.04]", border: "border-white/[0.08]", glow: "rgba(255,255,255,0.06)", iconBg: "bg-white/10" },
  paper: { label: "Research", color: "text-violet-300", bg: "bg-violet-500/[0.04]", border: "border-violet-400/[0.12]", glow: "rgba(167,139,250,0.08)", iconBg: "bg-violet-400/10" },
  community: { label: "Community", color: "text-cyan-300", bg: "bg-cyan-500/[0.04]", border: "border-cyan-400/[0.12]", glow: "rgba(34,211,238,0.08)", iconBg: "bg-cyan-400/10" },
  tool: { label: "Tool", color: "text-emerald-300", bg: "bg-emerald-500/[0.04]", border: "border-emerald-400/[0.12]", glow: "rgba(52,211,153,0.08)", iconBg: "bg-emerald-400/10" },
  dataset: { label: "Dataset", color: "text-orange-300", bg: "bg-orange-500/[0.04]", border: "border-orange-400/[0.12]", glow: "rgba(251,146,60,0.08)", iconBg: "bg-orange-400/10" },
  organization: { label: "Organization", color: "text-amber-300", bg: "bg-amber-500/[0.04]", border: "border-amber-400/[0.12]", glow: "rgba(251,191,36,0.08)", iconBg: "bg-amber-400/10" },
}

function PlatformTypeIcon({ type, size = 18 }: { readonly type: PlatformLink["type"]; readonly size?: number }) {
  switch (type) {
    case "github":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      )
    case "paper":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case "community":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case "tool":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case "dataset":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      )
    case "organization":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
          <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
        </svg>
      )
  }
}

export function PlatformsTab({ platforms, advancementColor }: {
  readonly platforms: readonly PlatformLink[]
  readonly advancementColor: string
}) {
  const [activeFilter, setActiveFilter] = useState<PlatformLink["type"] | "all">("all")

  if (platforms.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/15">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </div>
        <p className="text-sm text-white/30 mb-1">No platforms linked yet</p>
        <p className="text-xs text-white/15">External platform links will be added soon.</p>
      </div>
    )
  }

  const types = [...new Set(platforms.map((p) => p.type))]
  const filtered = activeFilter === "all" ? platforms : platforms.filter((p) => p.type === activeFilter)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            activeFilter === "all"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
          }`}
        >
          All
          <span className="font-mono text-[10px] opacity-60">{platforms.length}</span>
        </button>
        {types.map((type) => {
          const config = PLATFORM_TYPE_CONFIG[type]
          const count = platforms.filter((p) => p.type === type).length
          const isActive = activeFilter === type
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? `${config.bg} ${config.color} shadow-sm border ${config.border}`
                  : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              <span className={isActive ? "" : "opacity-40"}>
                <PlatformTypeIcon type={type} size={12} />
              </span>
              {config.label}
              <span className="font-mono text-[10px] opacity-50">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((platform, i) => {
          const config = PLATFORM_TYPE_CONFIG[platform.type]
          const isFirst = i === 0
          return (
            <a
              key={platform.url}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${platform.name} — ${config.label}`}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 ${config.border} ${config.bg}`}
              style={{
                boxShadow: `0 0 0 0 ${config.glow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 32px -8px ${config.glow}, 0 0 0 1px ${config.glow}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 0 ${config.glow}`
              }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${config.glow}, transparent 70%)` }}
              />

              <div className={`relative flex items-start gap-4 ${isFirst ? "p-6" : "p-5"}`}>
                <div className={`shrink-0 w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center ${config.color} transition-transform duration-300 group-hover:scale-110`}>
                  <PlatformTypeIcon type={platform.type} size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h4 className={`text-sm font-semibold ${config.color} opacity-80 group-hover:opacity-100 transition-opacity truncate`}>
                      {platform.name}
                    </h4>
                    <span
                      className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border opacity-50"
                      style={{
                        borderColor: `color-mix(in srgb, ${advancementColor} 20%, transparent)`,
                        color: advancementColor,
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed group-hover:text-white/45 transition-colors">
                    {platform.description}
                  </p>
                </div>

                <div className="shrink-0 mt-1 w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.08] flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/20 group-hover:text-white/60 transition-colors">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 py-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <span className="text-[10px] font-mono text-white/15 px-3">
          {platforms.length} external {platforms.length === 1 ? "platform" : "platforms"}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
    </div>
  )
}
