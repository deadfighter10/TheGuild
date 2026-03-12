import { Link } from "react-router-dom"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { useAuth } from "@/features/auth/AuthContext"

export function AdvancementsPage() {
  const { firebaseUser } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-16 max-w-2xl">
        <h1 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-3">
          Advancements
        </h1>
        <p className="font-display text-4xl sm:text-5xl text-white mb-6">
          Six frontiers defining<br />
          <span className="italic text-white/50">the future of our species</span>
        </p>
        <p className="text-white/35 leading-relaxed">
          Each advancement represents a domain where breakthrough progress could
          fundamentally change the human condition. Pick one. Go deep. Contribute
          what you know.
        </p>
      </div>

      {!firebaseUser && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] mb-8">
          <p className="text-sm text-white/50">
            Join The Guild to access each advancement&apos;s sub-hub — ideas, discussions, library, and more.
          </p>
          <Link
            to="/auth"
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white text-void-950 hover:bg-white/90 transition-colors shrink-0"
          >
            Join
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {ADVANCEMENTS.map((advancement, index) => {
          const theme = ADVANCEMENT_THEMES[advancement.id]
          if (!theme) return null

          return (
            <Link
              key={advancement.id}
              to={`/advancements/${advancement.id}`}
              className={`group flex items-center gap-6 sm:gap-8 p-6 sm:p-8 rounded-xl border border-white/5 bg-void-900 hover:bg-void-850 transition-all duration-300 animate-fade-up stagger-${index + 1} advancement-glow`}
              style={{ "--glow-color": theme.glowColor } as React.CSSProperties}
            >
              <div className={`shrink-0 w-14 h-14 rounded-xl ${theme.bgClass} ${theme.colorClass} flex items-center justify-center`}>
                <AdvancementIcon icon={theme.icon} size={28} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-semibold text-white text-base sm:text-lg truncate">
                    {advancement.name}
                  </h2>
                  <span className={`hidden sm:block font-mono text-[10px] uppercase tracking-widest ${theme.colorClass} opacity-50`}>
                    {theme.shortName}
                  </span>
                </div>
                <p className="text-white/30 text-sm leading-relaxed line-clamp-2">
                  {advancement.description}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <div className="hidden lg:flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                    <span className="font-mono text-[10px] text-white/25">Active</span>
                  </div>
                </div>
                <ChevronRightIcon size={20} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
