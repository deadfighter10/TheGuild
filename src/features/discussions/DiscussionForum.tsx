import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { canContribute } from "@/domain/reputation"
import { createThread, getThreadsByAdvancement, createReply, getRepliesByThread } from "./discussion-service"
import type { DiscussionThread, DiscussionReply } from "@/domain/discussion"
import { EmptyState } from "@/shared/components/EmptyState"

type DiscussionForumProps = {
  readonly advancementId: string
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

function NewThreadForm({ advancementId, onCreated, onCancel }: {
  readonly advancementId: string
  readonly onCreated: () => void
  readonly onCancel: () => void
}) {
  const { guildUser } = useAuth()
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
        advancementId,
        title,
        body,
      })

      if (result.success) {
        setTitle("")
        setBody("")
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
          className="px-5 py-2 bg-white text-void-950 hover:bg-white/90 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
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

function ThreadCard({ thread, onOpenThread }: {
  readonly thread: DiscussionThread
  readonly onOpenThread: (id: string) => void
}) {
  return (
    <button
      onClick={() => onOpenThread(thread.id)}
      className="w-full text-left p-5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white/80 mb-1">{thread.title}</h4>
          <p className="text-xs text-white/30 leading-relaxed line-clamp-2">{thread.body}</p>
        </div>
        {thread.replyCount > 0 && (
          <span className="shrink-0 px-2 py-1 rounded-md bg-white/5 font-mono text-[10px] text-white/30">
            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="w-5 h-5 rounded-full bg-void-700 flex items-center justify-center text-[9px] font-mono text-white/50">
          {thread.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="text-[11px] text-white/30">{thread.authorName}</span>
        <span className="text-white/10">·</span>
        <span className="text-[11px] text-white/20">{timeAgo(thread.createdAt)}</span>
      </div>
    </button>
  )
}

function ThreadView({ thread, onBack }: {
  readonly thread: DiscussionThread
  readonly onBack: () => void
}) {
  const { guildUser } = useAuth()
  const [replies, setReplies] = useState<readonly DiscussionReply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState("")
  const [replyError, setReplyError] = useState("")
  const [replying, setReplying] = useState(false)

  const loadReplies = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await getRepliesByThread(thread.id)
      setReplies(fetched)
    } catch {
      // UI shows stale state as fallback
    } finally {
      setLoading(false)
    }
  }, [thread.id])

  useEffect(() => {
    loadReplies()
  }, [loadReplies])

  const handleReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!guildUser) return
    setReplyError("")
    setReplying(true)

    try {
      const result = await createReply({
        authorId: guildUser.uid,
        authorName: guildUser.displayName,
        authorRep: guildUser.repPoints,
        threadId: thread.id,
        body: replyBody,
      })

      if (result.success) {
        setReplyBody("")
        loadReplies()
      } else {
        setReplyError(result.reason)
      }
    } catch {
      setReplyError("Failed to post reply.")
    } finally {
      setReplying(false)
    }
  }

  const canReply = guildUser ? canContribute(guildUser.repPoints) : false

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        Back to discussions
      </button>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 mb-6">
        <h3 className="text-base font-semibold text-white/90 mb-3">{thread.title}</h3>
        <p className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap">{thread.body}</p>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.04]">
          <div className="w-6 h-6 rounded-full bg-void-700 flex items-center justify-center text-[10px] font-mono text-white/50">
            {thread.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-white/40">{thread.authorName}</span>
          <span className="text-white/10">·</span>
          <span className="text-xs text-white/20">{timeAgo(thread.createdAt)}</span>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
          {replies.length > 0 ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : "No replies yet"}
        </h4>

        {loading ? (
          <p className="text-sm text-white/20 py-4">Loading replies...</p>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div key={reply.id} className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-4">
                <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-5 h-5 rounded-full bg-void-700 flex items-center justify-center text-[9px] font-mono text-white/50">
                    {reply.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] text-white/30">{reply.authorName}</span>
                  <span className="text-white/10">·</span>
                  <span className="text-[11px] text-white/20">{timeAgo(reply.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canReply && (
        <form onSubmit={handleReply} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            required
            rows={3}
            placeholder="Write a reply..."
            className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors resize-y placeholder:text-white/15 leading-relaxed mb-3"
          />
          {replyError && (
            <p className="text-red-400/80 text-xs mb-3">{replyError}</p>
          )}
          <button
            type="submit"
            disabled={replying}
            className="px-5 py-2 bg-white text-void-950 hover:bg-white/90 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
          >
            {replying ? "Posting..." : "Reply"}
          </button>
        </form>
      )}

      {!canReply && guildUser && (
        <p className="text-xs text-white/20 text-center py-4">
          You need 100+ Rep to reply to discussions.
        </p>
      )}
    </div>
  )
}

export function DiscussionForum({ advancementId }: DiscussionForumProps) {
  const { guildUser } = useAuth()
  const [threads, setThreads] = useState<readonly DiscussionThread[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewThread, setShowNewThread] = useState(false)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await getThreadsByAdvancement(advancementId)
      setThreads(fetched)
    } catch {
      // UI shows stale state as fallback
    } finally {
      setLoading(false)
    }
  }, [advancementId])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  const canPost = guildUser ? canContribute(guildUser.repPoints) : false
  const openThread = openThreadId ? threads.find((t) => t.id === openThreadId) : null

  if (openThread) {
    return (
      <ThreadView
        thread={openThread}
        onBack={() => {
          setOpenThreadId(null)
          loadThreads()
        }}
      />
    )
  }

  if (loading) {
    return <p className="text-sm text-white/30 font-mono py-8 text-center">Loading discussions...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">
            Discussions
          </h3>
          <span className="font-mono text-[10px] text-white/20">
            {threads.length} thread{threads.length !== 1 ? "s" : ""}
          </span>
        </div>

        {canPost && !showNewThread && (
          <button
            onClick={() => setShowNewThread(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-colors"
          >
            + New Thread
          </button>
        )}
      </div>

      {showNewThread && (
        <div className="mb-4">
          <NewThreadForm
            advancementId={advancementId}
            onCreated={() => {
              setShowNewThread(false)
              loadThreads()
            }}
            onCancel={() => setShowNewThread(false)}
          />
        </div>
      )}

      {threads.length === 0 ? (
        <EmptyState
          icon="chat"
          title="No discussions yet"
          description={canPost
            ? "Start the first conversation in this advancement"
            : "Contributors with 100+ Rep can start discussions"
          }
        />
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onOpenThread={setOpenThreadId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
