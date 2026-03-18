type TimeAgoOptions = {
  readonly compact?: boolean
}

export function timeAgo(date: Date, options?: TimeAgoOptions): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"

  const suffix = options?.compact ? "" : " ago"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m${suffix}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h${suffix}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d${suffix}`
  return `${Math.floor(days / 30)}mo${suffix}`
}
