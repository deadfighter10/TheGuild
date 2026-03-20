import { useState, useEffect } from "react"
import { useAuth } from "@/features/auth/AuthContext"
import { toggleBookmark, isBookmarked } from "./bookmark-service"
import { useToast } from "@/shared/components/Toast"
import type { BookmarkTargetType } from "@/domain/bookmark"

type BookmarkButtonProps = {
  readonly targetType: BookmarkTargetType
  readonly targetId: string
  readonly targetTitle: string
  readonly advancementId: string
}

export function BookmarkButton({ targetType, targetId, targetTitle, advancementId }: BookmarkButtonProps) {
  const { guildUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [toggling, setToggling] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!guildUser) return
    isBookmarked(guildUser.uid, targetType, targetId)
      .then(setSaved)
      .catch(() => toast("Failed to check bookmark", "error"))
  }, [guildUser, targetType, targetId, toast])

  if (!guildUser) return null

  const handleToggle = async () => {
    setToggling(true)
    try {
      const nowSaved = await toggleBookmark({
        userId: guildUser.uid,
        targetType,
        targetId,
        targetTitle,
        advancementId,
      })
      setSaved(nowSaved)
    } catch {
      toast("Failed to toggle bookmark", "error")
    } finally {
      setToggling(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      aria-label={saved ? "Remove bookmark" : "Bookmark"}
      className={`text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        saved
          ? "text-yellow-400/70 hover:text-yellow-400"
          : "text-white/25 hover:text-white/50"
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
