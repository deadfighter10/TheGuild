const AVATAR_COLORS = [
  "from-cyan-400/30 to-cyan-600/30",
  "from-violet-400/30 to-violet-600/30",
  "from-green-400/30 to-green-600/30",
  "from-orange-400/30 to-orange-600/30",
  "from-pink-400/30 to-pink-600/30",
  "from-yellow-400/30 to-yellow-600/30",
  "from-red-400/30 to-red-600/30",
  "from-blue-400/30 to-blue-600/30",
] as const

export function avatarInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/)
  const first = parts[0] ?? ""
  const last = parts.length >= 2 ? (parts[parts.length - 1] ?? "") : ""
  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase()
  }
  return first[0]?.toUpperCase() ?? "?"
}

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index] ?? AVATAR_COLORS[0]
}

type UserAvatarProps = {
  readonly name: string
  readonly photoURL?: string | null
  readonly size?: "xs" | "sm" | "md" | "lg"
}

const SIZE_CLASSES = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-8 h-8 text-[10px]",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-xl",
} as const

export function UserAvatar({ name, photoURL, size = "sm" }: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size]

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={`${sizeClass} rounded-xl object-cover border border-white/10`}
      />
    )
  }

  const color = avatarColor(name)
  const initials = avatarInitials(name)

  return (
    <div
      className={`${sizeClass} rounded-xl bg-gradient-to-br ${color} border border-white/10 flex items-center justify-center font-medium text-white/70 shrink-0`}
    >
      {initials}
    </div>
  )
}
