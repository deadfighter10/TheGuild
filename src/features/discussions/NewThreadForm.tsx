import { useState, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { useToast } from "@/shared/components/Toast"
import { createThread } from "./discussion-service"

export function NewThreadForm({ advancementId, onCreated, onCancel }: {
  readonly advancementId: string
  readonly onCreated: () => void
  readonly onCancel: () => void
}) {
  const { guildUser } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!guildUser) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await createThread({
        authorId: guildUser.uid,
        authorName: guildUser.displayName,
        authorRep: guildUser.repPoints,
        authorRole: guildUser.role,
        advancementId,
        title,
        body,
      })

      if (result.success) {
        setTitle("")
        setBody("")
        toast("Thread created", "success")
        onCreated()
      } else {
        setError(result.reason)
      }
    } catch {
      setError("Failed to create thread. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white/80">Start a discussion</h3>

      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="What do you want to discuss?"
          aria-label="Discussion title"
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors placeholder:text-white/15"
        />
      </div>

      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          placeholder="Share your thoughts, questions, or ideas..."
          aria-label="Discussion body"
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors resize-y placeholder:text-white/15 leading-relaxed"
        />
      </div>

      {error && (
        <p className="text-red-400/80 text-sm px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/10" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-white text-void-950 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Posting..." : "Post"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
