export type AchievementCategory = "milestone" | "advancement" | "special"

export type Achievement = {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: AchievementCategory
}

export type UserAchievement = {
  readonly id: string
  readonly userId: string
  readonly achievementId: string
  readonly earnedAt: Date
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first-node",
    name: "First Node",
    description: "Created your first idea node in The Tree",
    category: "milestone",
  },
  {
    id: "first-entry",
    name: "First Entry",
    description: "Created your first Library entry",
    category: "milestone",
  },
  {
    id: "first-thread",
    name: "First Thread",
    description: "Started your first discussion thread",
    category: "milestone",
  },
  {
    id: "supporter-100",
    name: "100 Supports Given",
    description: "Supported 100 ideas from fellow contributors",
    category: "milestone",
  },
  {
    id: "library-scholar",
    name: "Library Scholar",
    description: "Created 10 or more Library entries",
    category: "milestone",
  },
  {
    id: "peer-reviewer",
    name: "Peer Reviewer",
    description: "Completed 5 or more peer reviews",
    category: "milestone",
  },
  {
    id: "adv-telomerase",
    name: "Longevity Pioneer",
    description: "Created a node in Telomerase Activation and Senolytics",
    category: "advancement",
  },
  {
    id: "adv-bci",
    name: "Neural Engineer",
    description: "Created a node in Brain-Machine Interfaces",
    category: "advancement",
  },
  {
    id: "adv-tissue-engineering",
    name: "Regeneration Architect",
    description: "Created a node in In Vivo Tissue Engineering",
    category: "advancement",
  },
  {
    id: "adv-fusion",
    name: "Fusion Pioneer",
    description: "Created a node in Nuclear Fusion",
    category: "advancement",
  },
  {
    id: "adv-crispr",
    name: "Gene Editor",
    description: "Created a node in CRISPR-Cas9",
    category: "advancement",
  },
  {
    id: "adv-aagi",
    name: "AGI Researcher",
    description: "Created a node in True AAGI",
    category: "advancement",
  },
  {
    id: "verified-contributor",
    name: "Verified Contributor",
    description: "Had content approved through peer review",
    category: "special",
  },
] as const

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

type MilestoneStats = {
  readonly nodesCreated: number
  readonly supportsGiven: number
  readonly libraryEntries: number
  readonly reviewsCompleted: number
  readonly threadsCreated: number
}

type MilestoneCheck = {
  readonly id: string
  readonly check: (stats: MilestoneStats) => boolean
}

const MILESTONE_CHECKS: readonly MilestoneCheck[] = [
  { id: "first-node", check: (s) => s.nodesCreated >= 1 },
  { id: "first-entry", check: (s) => s.libraryEntries >= 1 },
  { id: "first-thread", check: (s) => s.threadsCreated >= 1 },
  { id: "supporter-100", check: (s) => s.supportsGiven >= 100 },
  { id: "library-scholar", check: (s) => s.libraryEntries >= 10 },
  { id: "peer-reviewer", check: (s) => s.reviewsCompleted >= 5 },
]

export function checkMilestoneEligibility(stats: MilestoneStats): readonly string[] {
  return MILESTONE_CHECKS
    .filter((m) => m.check(stats))
    .map((m) => m.id)
}
