import { useState } from "react"
import { Link } from "react-router-dom"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon } from "@/shared/components/Icons"

export function AdvancementSwitcher({ currentId }: { readonly currentId: string }) {
  const [open, setOpen] = useState(false)
  const currentTheme = ADVANCEMENT_THEMES[currentId]
  const currentAdv = ADVANCEMENTS.find((a) => a.id === currentId)

  if (!currentTheme || !currentAdv) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
      >
        <span>{currentTheme.shortName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-40 w-64 rounded-xl border border-white/[0.08] bg-void-900 shadow-2xl shadow-black/40 overflow-hidden">
            {ADVANCEMENTS.map((adv) => {
              const t = ADVANCEMENT_THEMES[adv.id]
              if (!t) return null
              const isCurrent = adv.id === currentId
              return (
                <Link
                  key={adv.id}
                  to={`/advancements/${adv.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isCurrent ? "bg-white/5 text-white" : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg ${t.bgClass} ${t.colorClass} flex items-center justify-center shrink-0`}>
                    <AdvancementIcon icon={t.icon} size={14} />
                  </div>
                  <span className="truncate">{t.shortName}</span>
                  {isCurrent && <span className="ml-auto text-[10px] text-white/30">current</span>}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
