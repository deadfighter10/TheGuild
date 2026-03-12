import { useState } from "react"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon } from "@/shared/components/Icons"

const FUND_FLOW_STEPS = [
  {
    label: "Donations",
    description: "Community and sponsor contributions flow into The Pool",
    icon: "inflow",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    label: "Maintenance",
    description: "Monthly infrastructure and operational costs deducted first",
    icon: "maintenance",
    color: "text-white/50",
    bg: "bg-white/5",
    border: "border-white/10",
  },
  {
    label: "Contributors",
    description: "Fund active contributors proportional to Rep and impact",
    icon: "contributors",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  {
    label: "Experiments",
    description: "Back promising ideas from The Tree with real resources",
    icon: "experiments",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
] as const

function FlowIcon({ type, size = 20 }: { readonly type: string; readonly size?: number }) {
  switch (type) {
    case "inflow":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 7l-5-5-5 5" />
          <path d="M5 12h14" />
        </svg>
      )
    case "maintenance":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case "contributors":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case "experiments":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6M12 3v7l-4 8h8l-4-8V3" />
          <path d="M6 18h12" />
          <circle cx="12" cy="15" r="1" />
        </svg>
      )
    default:
      return null
  }
}

function PoolIcon({ size = 24 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

type AllocationEntry = {
  readonly advancementId: string
  readonly percentage: number
}

const MOCK_ALLOCATIONS: readonly AllocationEntry[] = ADVANCEMENTS.map((a, i) => ({
  advancementId: a.id,
  percentage: [20, 18, 17, 16, 15, 14][i] ?? 14,
}))

const PRINCIPLES = [
  {
    title: "Maintenance First",
    description: "Infrastructure costs are always covered before any distribution. Servers, domains, security, and tooling come first to keep the platform running.",
    icon: "shield",
  },
  {
    title: "Merit-Based",
    description: "Distribution weighted by Rep and verified contributions. The more you contribute, the more you can receive. No popularity contests.",
    icon: "scale",
  },
  {
    title: "Transparent",
    description: "Every transaction, allocation, and decision is visible to all members. Full audit trail, open books, no hidden spending.",
    icon: "eye",
  },
  {
    title: "Community-Governed",
    description: "3,000+ Rep moderators vote on experiment funding. Major treasury decisions require community consensus.",
    icon: "vote",
  },
] as const

function PrincipleIcon({ type, size = 18 }: { readonly type: string; readonly size?: number }) {
  switch (type) {
    case "shield":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case "scale":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 7l9-4 9 4M3 7l3 9h6l3-9M15 7l3 9h-6" />
        </svg>
      )
    case "eye":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case "vote":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 00-6 0v4" />
          <path d="M5 9h14l1 12H4L5 9z" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      )
    default:
      return null
  }
}

export function PoolPage() {
  const [hoveredAdv, setHoveredAdv] = useState<string | null>(null)

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-emerald-400/60">
            <PoolIcon size={24} />
          </div>
          <h1 className="font-mono text-xs uppercase tracking-widest text-white/40">
            The Pool
          </h1>
        </div>
        <p className="font-display text-4xl sm:text-5xl text-white mb-6">
          Funding the<br />
          <span className="italic text-white/50">future, together</span>
        </p>
        <p className="text-white/35 leading-relaxed max-w-2xl">
          The Pool is a community-funded treasury that sustains The Guild and backs
          its contributors. Donations flow in, maintenance costs are covered first,
          and the rest goes directly to the people and experiments pushing
          humanity&apos;s most important advancements forward.
        </p>
      </div>

      <div className="relative rounded-2xl border border-emerald-400/10 bg-gradient-to-b from-emerald-400/[0.03] to-transparent p-8 mb-16">
        <div className="absolute -top-3 left-8">
          <span className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-emerald-400/60 bg-void-950 border border-emerald-400/15 rounded-full">
            Coming Soon
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
          <div className="text-center p-6 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <p className="text-3xl font-bold font-mono text-emerald-400/40">$0</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mt-2">
              Total Pool
            </p>
          </div>
          <div className="text-center p-6 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <p className="text-3xl font-bold font-mono text-white/25">0</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mt-2">
              Backers
            </p>
          </div>
          <div className="text-center p-6 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <p className="text-3xl font-bold font-mono text-white/25">0</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/25 mt-2">
              Funded Experiments
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          The Pool is not yet active. When funding infrastructure is in place, all treasury data will be shown here in real time.
        </p>
      </div>

      <div className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-8">
          How Funds Flow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FUND_FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="relative">
              <div className={`p-5 rounded-xl border ${step.border} ${step.bg} h-full`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${step.bg} ${step.color} flex items-center justify-center`}>
                    <FlowIcon type={step.icon} size={16} />
                  </div>
                  <span className="text-[10px] font-mono text-white/20">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className={`text-sm font-semibold mb-1.5 ${step.color}`}>
                  {step.label}
                </h3>
                <p className="text-xs text-white/30 leading-relaxed">
                  {step.description}
                </p>
              </div>
              {i < FUND_FLOW_STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2 -translate-y-1/2 text-white/10 z-10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-8">
          Allocation by Advancement
        </h2>
        <p className="text-xs text-white/20 mb-6 max-w-xl">
          When active, experiment funding will be distributed across advancements based on
          community activity, contribution volume, and moderator votes. Projected split:
        </p>

        <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
          <div className="flex h-3 overflow-hidden">
            {MOCK_ALLOCATIONS.map((alloc) => {
              const theme = ADVANCEMENT_THEMES[alloc.advancementId]
              if (!theme) return null
              return (
                <div
                  key={alloc.advancementId}
                  className="h-full transition-opacity duration-200"
                  style={{
                    width: `${alloc.percentage}%`,
                    backgroundColor: theme.color,
                    opacity: hoveredAdv === null || hoveredAdv === alloc.advancementId ? 0.6 : 0.15,
                  }}
                />
              )
            })}
          </div>

          <div className="divide-y divide-white/[0.03]">
            {MOCK_ALLOCATIONS.map((alloc) => {
              const theme = ADVANCEMENT_THEMES[alloc.advancementId]
              const adv = ADVANCEMENTS.find((a) => a.id === alloc.advancementId)
              if (!theme || !adv) return null

              return (
                <div
                  key={alloc.advancementId}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                  onMouseEnter={() => setHoveredAdv(alloc.advancementId)}
                  onMouseLeave={() => setHoveredAdv(null)}
                >
                  <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center shrink-0`}>
                    <AdvancementIcon icon={theme.icon} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60">{theme.shortName}</p>
                    <p className="text-[10px] text-white/20 truncate">{adv.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-mono font-semibold ${theme.colorClass}`}>
                      {alloc.percentage}%
                    </span>
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-white/5 shrink-0 hidden sm:block">
                    <div
                      className="h-full rounded-full transition-opacity duration-200"
                      style={{
                        width: `${alloc.percentage * 5}%`,
                        backgroundColor: theme.color,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-8">
          Principles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((principle) => (
            <div
              key={principle.title}
              className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-400/10 text-emerald-400/60 flex items-center justify-center">
                  <PrincipleIcon type={principle.icon} size={16} />
                </div>
                <h3 className="text-sm font-semibold text-white/70">{principle.title}</h3>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-400/[0.04] via-transparent to-cyan-400/[0.04] p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-400/10 text-emerald-400/50 flex items-center justify-center mb-4">
          <PoolIcon size={28} />
        </div>
        <h3 className="font-display text-xl text-white/80 mb-2">
          The Pool is not yet active
        </h3>
        <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed mb-6">
          We&apos;re building the infrastructure for transparent, community-governed funding.
          When The Pool launches, every dollar will be tracked, allocated by merit, and
          governed by the community.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-white/20">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
            <span>Payment infrastructure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
            <span>Legal entity setup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
            <span>Governance framework</span>
          </div>
        </div>
      </div>
    </div>
  )
}
