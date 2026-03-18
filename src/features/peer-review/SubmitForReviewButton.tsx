import { useState, useCallback, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { useFocusTrap, useEscapeKey } from "@/shared/hooks/use-focus-trap"
import { submitForReview } from "./peer-review-service"
import type { PeerReviewContentType } from "@/domain/peer-review"

type SubmitForReviewButtonProps = {
  readonly contentType: PeerReviewContentType
  readonly contentId: string
  readonly contentTitle: string
  readonly advancementId: string
  readonly authorId: string
}

export function SubmitForReviewButton({
  contentType,
  contentId,
  contentTitle,
  advancementId,
  authorId,
}: SubmitForReviewButtonProps) {
  const { guildUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const closeModal = useCallback(() => setOpen(false), [])
  const focusTrapRef = useFocusTrap(open)
  useEscapeKey(open, closeModal)

  if (!guildUser) return null
  if (guildUser.uid !== authorId) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await submitForReview({
        contentType,
        contentId,
        contentTitle,
        advancementId,
        authorId: guildUser.uid,
        authorName: guildUser.displayName,
      })
      setSubmitted(true)
      setTimeout(() => setOpen(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit for review")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <span className="text-[10px] text-emerald-400/60 font-mono">Submitted</span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-white/20 hover:text-emerald-400/60 transition-colors"
        aria-label="Submit for peer review"
        title="Submit for peer review"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-void-950/60 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Submit for peer review" ref={focusTrapRef}>
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-void-900 p-6 shadow-2xl">
              <h3 className="text-lg font-display text-white mb-1">Submit for Peer Review</h3>
              <p className="text-xs text-white/30 mb-4 truncate">
                {contentTitle}
              </p>

              <p className="text-sm text-white/50 mb-4">
                Your content will be reviewed by a moderator (3000+ Rep) who will evaluate it for accuracy, clarity, novelty, and evidence quality. Approved content earns a peer-reviewed badge.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="px-4 py-2 text-sm bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-emerald-500/20 transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit for Review"}
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
