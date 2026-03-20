import { Link } from "react-router-dom"
import type { DiscussionThread } from "@/domain/discussion"
import { timeAgo } from "@/shared/utils/time"
import { UserAvatar } from "@/shared/components/UserAvatar"

export function ThreadCard({ thread, onOpenThread }: {
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
