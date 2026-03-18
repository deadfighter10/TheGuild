import { useState, useCallback, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { useFocusTrap, useEscapeKey } from "@/shared/hooks/use-focus-trap"
import { flagContent } from "./flag-service"
import { FLAG_REASONS, validateFlag, type FlagReason, type FlagTargetCollection } from "@/domain/flag"

type FlagButtonProps = {
  readonly targetCollection: FlagTargetCollection
  readonly targetId: string
  readonly targetTitle: string
}

export function FlagButton({ targetCollection, targetId, targetTitle }: FlagButtonProps) {
  const { guildUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<FlagReason>("spam")
  const [details, setDetails] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const closeModal = useCallback(() => setOpen(false), [])
  const focusTrapRef = useFocusTrap(open)
  useEscapeKey(open, closeModal)

  if (!guildUser) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    const errors = validateFlag({ reason, details })
    if (errors.length > 0) {
      setError(errors[0] ?? "")
      return
    }

    setSubmitting(true)
    try {
      await flagContent({
        targetCollection,
        targetId,
        targetTitle,
        reporterId: guildUser.uid,
        reporterName: guildUser.displayName,
        reason,
        details,
      })
      setSubmitted(true)
      setTimeout(() => setOpen(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit flag")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <span className="text-[10px] text-amber-400/60 font-mono">Flagged</span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-white/20 hover:text-amber-400/60 transition-colors"
        aria-label="Flag content"
        title="Report this content"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-void-950/60 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Report content" ref={focusTrapRef}>
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-void-900 p-6 shadow-2xl">
              <h3 className="text-lg font-display text-white mb-1">Report Content</h3>
              <p className="text-xs text-white/30 mb-4 truncate">
                {targetTitle}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as FlagReason)}
                    className="w-full px-3 py-2 bg-void-800 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
                  >
                    {FLAG_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
                    Details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="w-full px-3 py-2 bg-void-800 border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50 resize-none"
                    placeholder="Provide additional context..."
                  />
                  <p className="text-right text-[10px] text-white/20 mt-1">{details.length}/1000</p>
                </div>

                {error && (
                  <p className="text-red-400/80 text-sm px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/10">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-amber-500/20 transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
