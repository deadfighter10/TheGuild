import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { isAdmin } from "@/domain/user"

type OnrampBannerProps = {
  readonly context: "home" | "advancement"
  readonly advancementName?: string
}

function useDismissed(key: string): readonly [boolean, () => void] {
  const storageKey = `guild-onramp-${key}`
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1"
    } catch {
      return false
    }
  })

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(storageKey, "1")
    } catch {
      // localStorage may be unavailable
    }
  }

  return [dismissed, dismiss] as const
}

export function OnrampBanner({ context, advancementName }: OnrampBannerProps) {
  const { firebaseUser, guildUser } = useAuth()
  const [dismissed, dismiss] = useDismissed(context)

  if (dismissed) return null

  if (!firebaseUser) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] mb-8">
        <p className="text-sm text-white/50">
          {context === "advancement" && advancementName
            ? <>You&apos;re browsing <span className="text-white/70 font-medium">{advancementName}</span>. Join to contribute ideas, discuss, and earn Rep.</>
            : <>The Guild is an open research hub. Pick an advancement to explore, or join to start contributing.</>
          }
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/auth"
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white text-void-950 hover:bg-white/90 transition-colors"
          >
            Join
          </Link>
          <button onClick={dismiss} className="text-white/20 hover:text-white/40 transition-colors" aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>
    )
  }

  if (guildUser && isAdmin(guildUser.role)) return null

  if (guildUser && guildUser.repPoints < 100) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] mb-8">
        <p className="text-sm text-white/50">
          You&apos;re at <span className="text-cyan-400 font-mono font-semibold">{guildUser.repPoints} Rep</span>.
          {" "}Reach 100 to start contributing.
          {guildUser.isSchoolEmail ? " Get vouched by a member for +100." : " Verify a school email for +100, or get vouched."}
        </p>
        <button onClick={dismiss} className="text-white/20 hover:text-white/40 transition-colors shrink-0" aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    )
  }

  return null
}
