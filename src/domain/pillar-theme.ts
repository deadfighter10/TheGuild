export type PillarTheme = {
  readonly key: string
  readonly label: string
  readonly color: string
  readonly colorClass: string
  readonly bgClass: string
  readonly borderClass: string
  readonly accentBorder: string
  readonly icon: "tree" | "book" | "newspaper" | "chat" | "link"
}

export const PILLAR_THEMES = {
  tree: {
    key: "tree",
    label: "The Tree",
    color: "#4ade80",
    colorClass: "text-green-400",
    bgClass: "bg-green-400/10",
    borderClass: "border-green-400/20",
    accentBorder: "border-l-green-400/40",
    icon: "tree",
  },
  library: {
    key: "library",
    label: "The Grand Library",
    color: "#22d3ee",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-400/10",
    borderClass: "border-cyan-400/20",
    accentBorder: "border-l-cyan-400/40",
    icon: "book",
  },
  newsroom: {
    key: "newsroom",
    label: "The Newsroom",
    color: "#a78bfa",
    colorClass: "text-violet-400",
    bgClass: "bg-violet-400/10",
    borderClass: "border-violet-400/20",
    accentBorder: "border-l-violet-400/40",
    icon: "newspaper",
  },
  discussions: {
    key: "discussions",
    label: "Discussions",
    color: "#fbbf24",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-400/10",
    borderClass: "border-amber-400/20",
    accentBorder: "border-l-amber-400/40",
    icon: "chat",
  },
  platforms: {
    key: "platforms",
    label: "Platforms",
    color: "#94a3b8",
    colorClass: "text-slate-400",
    bgClass: "bg-slate-400/10",
    borderClass: "border-slate-400/20",
    accentBorder: "border-l-slate-400/40",
    icon: "link",
  },
} as const
