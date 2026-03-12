import { useState, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { createLibraryEntry, editLibraryEntry } from "./library-service"
import type { LibraryEntry, Difficulty, ContentType } from "@/domain/library-entry"

type LibraryEntryFormProps = {
  readonly existingEntry?: LibraryEntry
  readonly defaultAdvancementId?: string | undefined
  readonly onSaved: () => void
  readonly onCancel: () => void
}

const DIFFICULTIES: readonly { readonly value: Difficulty; readonly label: string }[] = [
  { value: "introductory", label: "Introductory" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

const CONTENT_TYPES: readonly { readonly value: ContentType; readonly label: string; readonly icon: string }[] = [
  { value: "article", label: "Article", icon: "✎" },
  { value: "youtube", label: "YouTube", icon: "▶" },
  { value: "link", label: "External Link", icon: "↗" },
  { value: "document", label: "Document", icon: "◧" },
]

export function LibraryEntryForm({
  existingEntry,
  defaultAdvancementId,
  onSaved,
  onCancel,
}: LibraryEntryFormProps) {
  const { guildUser } = useAuth()
  const [title, setTitle] = useState(existingEntry?.title ?? "")
  const [content, setContent] = useState(existingEntry?.content ?? "")
  const [contentType, setContentType] = useState<ContentType>(existingEntry?.contentType ?? "article")
  const [url, setUrl] = useState(existingEntry?.url ?? "")
  const [advancementId, setAdvancementId] = useState(
    existingEntry?.advancementId ?? defaultAdvancementId ?? ADVANCEMENTS[0]?.id ?? "",
  )
  const [difficulty, setDifficulty] = useState<Difficulty>(existingEntry?.difficulty ?? "introductory")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!guildUser) return null

  const isEditing = !!existingEntry

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isEditing) {
        const result = await editLibraryEntry({
          userId: guildUser.uid,
          userRep: guildUser.repPoints,
          entryId: existingEntry.id,
          title,
          content,
          contentType,
          url: url || undefined,
          difficulty,
        })
        if (!result.success) {
          setError(result.reason)
          return
        }
      } else {
        const result = await createLibraryEntry({
          authorId: guildUser.uid,
          authorRep: guildUser.repPoints,
          advancementId,
          title,
          content,
          contentType,
          url: url || undefined,
          difficulty,
        })
        if (!result.success) {
          setError(result.reason)
          return
        }
      }
      onSaved()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-xl border border-white/10 bg-void-900">
      <h3 className="text-sm font-semibold text-white">
        {isEditing ? "Edit Library Entry" : "New Library Entry"}
      </h3>

      {!isEditing && (
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-3">
            Content Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setContentType(ct.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  contentType === ct.value
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-400"
                    : "border-white/10 bg-void-800 text-white/40 hover:text-white/60 hover:border-white/20"
                }`}
              >
                <span className="text-base">{ct.icon}</span>
                <span>{ct.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="entry-title" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          Title
        </label>
        <input
          id="entry-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder={
            contentType === "youtube" ? "e.g. Introduction to CRISPR-Cas9 Mechanisms"
            : contentType === "link" ? "e.g. Nature: Breakthrough in Telomere Extension"
            : contentType === "document" ? "e.g. Fusion Reactor Design Principles (PDF)"
            : "A clear, descriptive title"
          }
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors placeholder:text-white/15"
        />
      </div>

      {(contentType === "youtube" || contentType === "link" || contentType === "document") && (
        <div>
          <label htmlFor="entry-url" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
            {contentType === "youtube" ? "YouTube URL" : contentType === "document" ? "Document URL" : "Source URL"}
          </label>
          <input
            id="entry-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required={contentType !== "document"}
            placeholder={
              contentType === "youtube" ? "https://www.youtube.com/watch?v=..."
              : contentType === "document" ? "https://example.com/paper.pdf"
              : "https://..."
            }
            className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors placeholder:text-white/15"
          />
          {contentType === "youtube" && url && (
            <p className="text-[10px] text-white/20 mt-1.5 font-mono">
              Supported: youtube.com/watch?v=... or youtu.be/...
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!isEditing && (
          <div>
            <label htmlFor="entry-advancement" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
              Advancement
            </label>
            <select
              id="entry-advancement"
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
        )}

        <div>
          <label htmlFor="entry-difficulty" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
            Difficulty
          </label>
          <select
            id="entry-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.4)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-void-800 text-white">
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="entry-content" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          {contentType === "article" ? "Content" : "Description / Notes"}
          {contentType !== "article" && (
            <span className="normal-case tracking-normal text-white/20 ml-2">
              {contentType === "document" ? "(summary or key takeaways)" : "(optional context for the community)"}
            </span>
          )}
        </label>
        <textarea
          id="entry-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required={contentType === "article"}
          rows={contentType === "article" ? 10 : 4}
          placeholder={
            contentType === "article" ? "Write your library entry content here... (supports Markdown)"
            : contentType === "youtube" ? "Why is this video valuable? Key concepts covered..."
            : contentType === "link" ? "Brief summary of the source and why it matters..."
            : "Key takeaways, chapter summaries, or notes..."
          }
          className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors resize-y placeholder:text-white/15 font-mono text-xs leading-relaxed"
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
          className="px-5 py-2 bg-white text-void-950 hover:bg-white/90 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Saving..." : isEditing ? "Save Changes" : "Publish Entry"}
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
