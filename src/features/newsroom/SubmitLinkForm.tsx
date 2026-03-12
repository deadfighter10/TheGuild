import { useState, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { canContribute } from "@/domain/reputation"
import { submitNewsLink } from "./news-service"

type SubmitLinkFormProps = {
  readonly defaultAdvancementId?: string | undefined
  readonly onSubmitted: () => void
  readonly onCancel: () => void
}

export function SubmitLinkForm({
  defaultAdvancementId,
  onSubmitted,
  onCancel,
}: SubmitLinkFormProps) {
  const { guildUser } = useAuth()
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [advancementId, setAdvancementId] = useState(
    defaultAdvancementId ?? ADVANCEMENTS[0]?.id ?? "",
  )
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!guildUser) return null
  if (!canContribute(guildUser.repPoints)) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await submitNewsLink({
        submitterId: guildUser.uid,
        submitterRep: guildUser.repPoints,
        advancementId,
        title,
        url,
      })

      if (result.success) {
        setTitle("")
        setUrl("")
        onSubmitted()
      } else {
        setError(result.reason)
      }
    } catch {
      setError("Failed to submit. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-xl border border-white/10 bg-void-900">
      <h3 className="text-sm font-semibold text-white">Submit a link</h3>

      <div>
        <label htmlFor="link-title" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          Title
        </label>
        <input
          id="link-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Describe the article or paper"
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors placeholder:text-white/15"
        />
      </div>

      <div>
        <label htmlFor="link-url" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          URL
        </label>
        <input
          id="link-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://..."
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors placeholder:text-white/15 font-mono text-xs"
        />
      </div>

      <div>
        <label htmlFor="link-advancement" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          Advancement
        </label>
        <select
          id="link-advancement"
          value={advancementId}
          onChange={(e) => setAdvancementId(e.target.value)}
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.4)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
        >
          {ADVANCEMENTS.map((adv) => (
            <option key={adv.id} value={adv.id} className="bg-void-800 text-white">
              {adv.name}
            </option>
          ))}
        </select>
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
          className="px-5 py-2 bg-white text-void-950 hover:bg-white/90 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Submitting..." : "Submit Link"}
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
