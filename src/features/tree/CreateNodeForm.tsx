import { useState, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { canContribute } from "@/domain/reputation"
import { createNode } from "./node-service"
import { useToast } from "@/shared/components/Toast"

type CreateNodeFormProps = {
  readonly advancementId: string
  readonly parentNodeId: string | null
  readonly parentTitle?: string
  readonly onCreated: () => void
  readonly onCancel: () => void
}

export function CreateNodeForm({
  advancementId,
  parentNodeId,
  parentTitle,
  onCreated,
  onCancel,
}: CreateNodeFormProps) {
  const { guildUser } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!guildUser) return null

  if (!canContribute(guildUser.repPoints, guildUser.role)) {
    return (
      <div className="p-4 rounded-lg border border-white/5 bg-void-900">
        <p className="text-sm text-white/40">
          You need at least 100 Rep to create ideas. Current Rep: {guildUser.repPoints}
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await createNode({
        authorId: guildUser.uid,
        authorRep: guildUser.repPoints,
        authorRole: guildUser.role,
        advancementId,
        parentNodeId,
        title,
        description,
      })

      if (result.success) {
        setTitle("")
        setDescription("")
        toast("Idea created!", "success")
        onCreated()
      } else {
        setError(result.reason)
      }
    } catch {
      toast("Failed to create idea", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-white/15 bg-void-900 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">
          {parentNodeId ? "Build on this idea" : "New root idea"}
        </h3>
        {parentTitle && (
          <p className="text-xs text-white/30">
            Branching from: <span className="text-white/50">{parentTitle}</span>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="node-title" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          Title
        </label>
        <input
          id="node-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="A concise name for your idea"
          className="w-full px-4 py-2.5 bg-void-800 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors placeholder:text-white/15"
        />
      </div>

      <div>
        <label htmlFor="node-description" className="block text-xs font-mono uppercase tracking-widest text-white/40 mb-2">
          Description
        </label>
        <textarea
          id="node-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="Describe the idea, hypothesis, or approach..."
          className="w-full px-4 py-2.5 bg-void-800 border border-white/15 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors resize-none placeholder:text-white/15"
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
          {loading ? "Creating..." : "Create Idea"}
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
