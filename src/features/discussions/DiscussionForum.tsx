import { useState, useCallback } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { canContribute } from "@/domain/reputation"
import { subscribeToThreadsByAdvancement } from "./discussion-service"
import type { DiscussionThread } from "@/domain/discussion"
import { useRealtimeQuery } from "@/shared/hooks/use-realtime-query"
import { EmptyState } from "@/shared/components/EmptyState"
import { SkeletonList } from "@/shared/components/Skeleton"
import { NewThreadForm } from "./NewThreadForm"
import { ThreadCard } from "./ThreadCard"
import { ThreadView } from "./ThreadView"

type DiscussionForumProps = {
  readonly advancementId: string
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

  const canPost = guildUser ? canContribute(guildUser.repPoints, guildUser.role) : false
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
