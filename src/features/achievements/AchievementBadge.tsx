import { getAchievementById } from "@/domain/achievement"

type AchievementBadgeProps = {
  readonly achievementId: string
}

const CATEGORY_STYLES = {
  milestone: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  advancement: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  special: "bg-amber-500/15 text-amber-300 border-amber-500/20",
} as const

export function AchievementBadge({ achievementId }: AchievementBadgeProps) {
  const achievement = getAchievementById(achievementId)
  if (!achievement) return null

  const style = CATEGORY_STYLES[achievement.category]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${style}`}
      title={achievement.description}
    >
      {achievement.name}
    </span>
  )
}
