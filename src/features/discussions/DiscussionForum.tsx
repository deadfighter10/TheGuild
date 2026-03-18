import { useState, useCallback, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { canContribute, canModerate } from "@/domain/reputation"
import { createThread, subscribeToThreadsByAdvancement, createReply, subscribeToRepliesByThread, editThread, editReply, deleteThread, deleteReply } from "./discussion-service"
import type { DiscussionThread, DiscussionReply } from "@/domain/discussion"
import { useRealtimeQuery } from "@/shared/hooks/use-realtime-query"
import { EmptyState } from "@/shared/components/EmptyState"
import { useToast } from "@/shared/components/Toast"
import { SkeletonList } from "@/shared/components/Skeleton"
import { FlagButton } from "@/features/moderation/FlagButton"
import { timeAgo } from "@/shared/utils/time"
import { UserAvatar } from "@/shared/components/UserAvatar"

type DiscussionForumProps = {
  readonly advancementId: string
}

function NewThreadForm({ advancementId, onCreated, onCancel }: {
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
        <UserAvatar name={thread.authorName} size="xs" />
        <Link
          to={`/users/${thread.authorId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-white/30 hover:text-cyan-400/70 transition-colors"
        >
          {thread.authorName}
        </Link>
        <span className="text-white/10">·</span>
        <span className="text-[11px] text-white/30">{timeAgo(thread.createdAt)}</span>
      </div>
    </button>
  )
}

function ThreadView({ thread, onBack }: {
  readonly thread: DiscussionThread
  readonly onBack: () => void
}) {
  const { guildUser } = useAuth()
  const { toast } = useToast()
  const subscribe = useCallback(
    (onData: (items: readonly DiscussionReply[]) => void, onError: (error: Error) => void) =>
      subscribeToRepliesByThread(thread.id, onData, onError),
    [thread.id],
  )
  const { data: replies, loading } = useRealtimeQuery(subscribe)

  const [replyBody, setReplyBody] = useState("")
  const [replyError, setReplyError] = useState("")
  const [replying, setReplying] = useState(false)
  const [editingThread, setEditingThread] = useState(false)
  const [editTitle, setEditTitle] = useState(thread.title)
  const [editBody, setEditBody] = useState(thread.body)
  const [editingThreadSaving, setEditingThreadSaving] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editReplyBody, setEditReplyBody] = useState("")
  const [editReplySaving, setEditReplySaving] = useState(false)
  const [deletingThread, setDeletingThread] = useState(false)
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null)

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
        toast("Reply posted", "success")
      } else {
        setReplyError(result.reason)
      }
    } catch {
      toast("Failed to post reply", "error")
    } finally {
      setReplying(false)
    }
  }

  const canReply = guildUser ? canContribute(guildUser.repPoints) : false
  const isThreadOwner = guildUser?.uid === thread.authorId
  const isMod = guildUser ? canModerate(guildUser.repPoints) : false
  const canEditThread = isThreadOwner || isMod

  const handleEditThread = async () => {
    if (!guildUser) return
    setEditingThreadSaving(true)
    try {
      const result = await editThread({
        userId: guildUser.uid,
        userRep: guildUser.repPoints,
        threadId: thread.id,
        title: editTitle,
        body: editBody,
      })
      if (result.success) {
        toast("Thread updated", "success")
        setEditingThread(false)
        onBack()
      } else {
        toast(result.reason, "error")
      }
    } catch {
      toast("Failed to update thread", "error")
    } finally {
      setEditingThreadSaving(false)
    }
  }

  const handleDeleteThread = async () => {
    if (!guildUser) return
    setDeletingThread(true)
    try {
      const result = await deleteThread({
        userId: guildUser.uid,
        userRep: guildUser.repPoints,
        threadId: thread.id,
      })
      if (result.success) {
        toast("Thread deleted", "success")
        onBack()
      } else {
        toast(result.reason, "error")
      }
    } catch {
      toast("Failed to delete thread", "error")
    } finally {
      setDeletingThread(false)
    }
  }

  const handleEditReply = async (replyId: string) => {
    if (!guildUser) return
    setEditReplySaving(true)
    try {
      const result = await editReply({
        userId: guildUser.uid,
        userRep: guildUser.repPoints,
        replyId,
        body: editReplyBody,
      })
      if (result.success) {
        toast("Reply updated", "success")
        setEditingReplyId(null)
      } else {
        toast(result.reason, "error")
      }
    } catch {
      toast("Failed to update reply", "error")
    } finally {
      setEditReplySaving(false)
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!guildUser) return
    setDeletingReplyId(replyId)
    try {
      const result = await deleteReply({
        userId: guildUser.uid,
        userRep: guildUser.repPoints,
        replyId,
        threadId: thread.id,
      })
      if (result.success) {
        toast("Reply deleted", "success")
      } else {
        toast(result.reason, "error")
      }
    } catch {
      toast("Failed to delete reply", "error")
    } finally {
      setDeletingReplyId(null)
    }
  }

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
        {editingThread ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors"
            />
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors resize-y leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditThread}
                disabled={editingThreadSaving}
                className="px-4 py-1.5 text-xs font-medium rounded-md bg-white text-void-950 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {editingThreadSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => { setEditingThread(false); setEditTitle(thread.title); setEditBody(thread.body) }}
                className="px-4 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-white/90 mb-3">{thread.title}</h3>
              <div className="flex items-center gap-1 shrink-0">
                {canEditThread && (
                  <>
                    <button
                      onClick={() => setEditingThread(true)}
                      className="px-2 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                      aria-label="Edit thread"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteThread}
                      disabled={deletingThread}
                      className="px-2 py-1 text-[10px] text-red-400/40 hover:text-red-400/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Delete thread"
                    >
                      {deletingThread ? "..." : "Delete"}
                    </button>
                  </>
                )}
                {guildUser && guildUser.uid !== thread.authorId && (
                  <FlagButton targetCollection="discussionThreads" targetId={thread.id} targetTitle={thread.title} />
                )}
              </div>
            </div>
            <p className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap">{thread.body}</p>
          </>
        )}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.04]">
          <UserAvatar name={thread.authorName} size="sm" />
          <Link to={`/users/${thread.authorId}`} className="text-xs text-white/40 hover:text-cyan-400/70 transition-colors">{thread.authorName}</Link>
          <span className="text-white/10">·</span>
          <span className="text-xs text-white/30">{timeAgo(thread.createdAt)}</span>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-mono text-xs uppercase tracking-widest text-white/30 mb-4">
          {replies.length > 0 ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : "No replies yet"}
        </h4>

        {loading ? (
          <p className="text-sm text-white/30 py-4">Loading replies...</p>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => {
              const isReplyOwner = guildUser?.uid === reply.authorId
              const canEditReply = isReplyOwner || isMod
              const isEditingThis = editingReplyId === reply.id

              return (
                <div key={reply.id} className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-4">
                  {isEditingThis ? (
                    <div className="space-y-2">
                      <textarea
                        value={editReplyBody}
                        onChange={(e) => setEditReplyBody(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-void-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400/40 transition-colors resize-y leading-relaxed"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditReply(reply.id)}
                          disabled={editReplySaving}
                          className="px-3 py-1 text-[10px] font-medium rounded-md bg-white text-void-950 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {editReplySaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingReplyId(null)}
                          className="px-3 py-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap flex-1">{reply.body}</p>
                      {canEditReply && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingReplyId(reply.id); setEditReplyBody(reply.body) }}
                            className="px-1.5 py-0.5 text-[10px] text-white/20 hover:text-white/50 transition-colors"
                            aria-label="Edit reply"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            disabled={deletingReplyId === reply.id}
                            className="px-1.5 py-0.5 text-[10px] text-red-400/30 hover:text-red-400/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Delete reply"
                          >
                            {deletingReplyId === reply.id ? "..." : "Del"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <UserAvatar name={reply.authorName} size="xs" />
                    <Link to={`/users/${reply.authorId}`} className="text-[11px] text-white/30 hover:text-cyan-400/70 transition-colors">{reply.authorName}</Link>
                    <span className="text-white/10">·</span>
                    <span className="text-[11px] text-white/30">{timeAgo(reply.createdAt)}</span>
                  </div>
                </div>
              )
            })}
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
            className="px-5 py-2 bg-white text-void-950 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            {replying ? "Posting..." : "Reply"}
          </button>
        </form>
      )}

      {!canReply && guildUser && (
        <p className="text-xs text-white/30 text-center py-4">
          You need 100+ Rep to reply to discussions.
        </p>
      )}
    </div>
  )
}

export function DiscussionForum({ advancementId }: DiscussionForumProps) {
  const { guildUser } = useAuth()
  const [showNewThread, setShowNewThread] = useState(false)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)

  const subscribe = useCallback(
    (onData: (items: readonly DiscussionThread[]) => void, onError: (error: Error) => void) =>
      subscribeToThreadsByAdvancement(advancementId, onData, onError),
    [advancementId],
  )
  const { data: threads, loading } = useRealtimeQuery(subscribe)

  const canPost = guildUser ? canContribute(guildUser.repPoints) : false
  const openThread = openThreadId ? threads.find((t) => t.id === openThreadId) : null

  if (openThread) {
    return (
      <ThreadView
        thread={openThread}
        onBack={() => {
          setOpenThreadId(null)
        }}
      />
    )
  }

  if (loading) {
    return <SkeletonList count={4} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">
            Discussions
          </h3>
          <span className="font-mono text-[10px] text-white/30">
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
