export type AdvancementTheme = {
  readonly color: string
  readonly colorClass: string
  readonly bgClass: string
  readonly borderClass: string
  readonly glowColor: string
  readonly icon: string
  readonly shortName: string
  readonly tagline: string
}

export const ADVANCEMENT_THEMES: Record<string, AdvancementTheme> = {
  telomerase: {
    color: "#22d3ee",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-400/10",
    borderClass: "border-cyan-400/20",
    glowColor: "rgba(34, 211, 238, 0.15)",
    icon: "hourglass",
    shortName: "Longevity",
    tagline: "Reverse cellular aging",
  },
  bci: {
    color: "#a78bfa",
    colorClass: "text-violet-400",
    bgClass: "bg-violet-400/10",
    borderClass: "border-violet-400/20",
    glowColor: "rgba(167, 139, 250, 0.15)",
    icon: "brain",
    shortName: "Neurotech",
    tagline: "Bridge mind and machine",
  },
  "tissue-engineering": {
    color: "#4ade80",
    colorClass: "text-green-400",
    bgClass: "bg-green-400/10",
    borderClass: "border-green-400/20",
    glowColor: "rgba(74, 222, 128, 0.15)",
    icon: "dna",
    shortName: "Regen Med",
    tagline: "Grow and repair living tissue",
  },
  fusion: {
    color: "#fb923c",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-400/10",
    borderClass: "border-orange-400/20",
    glowColor: "rgba(251, 146, 60, 0.15)",
    icon: "sun",
    shortName: "Fusion",
    tagline: "Unlimited clean energy",
  },
  crispr: {
    color: "#f472b6",
    colorClass: "text-pink-400",
    bgClass: "bg-pink-400/10",
    borderClass: "border-pink-400/20",
    glowColor: "rgba(244, 114, 182, 0.15)",
    icon: "scissors",
    shortName: "Gene Edit",
    tagline: "Rewrite the code of life",
  },
  aagi: {
    color: "#facc15",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-400/10",
    borderClass: "border-yellow-400/20",
    glowColor: "rgba(250, 204, 21, 0.15)",
    icon: "zap",
    shortName: "AAGI",
    tagline: "Autonomous general intelligence",
  },
} as const
