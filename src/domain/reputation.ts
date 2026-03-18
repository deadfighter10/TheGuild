export const REP_THRESHOLDS = {
  schoolEmailBonus: 100,
  vouchBonus: 100,
  supportBonus: 10,
  contributorMin: 100,
  moderatorMin: 3000,
} as const

const SCHOOL_EMAIL_PATTERNS = [
  /\.edu$/,
  /\.edu\.[a-z]{2}$/,
  /\.ac\.[a-z]{2}$/,
]

export function isSchoolEmail(email: string): boolean {
  const domain = email.split("@")[1]
  if (!domain) return false
  return SCHOOL_EMAIL_PATTERNS.some((pattern) => pattern.test(domain))
}

export function calculateInitialRep(_email: string): number {
  return 0
}

export function canContribute(rep: number): boolean {
  return rep === -1 || rep >= REP_THRESHOLDS.contributorMin
}

export function canModerate(rep: number): boolean {
  return rep === -1 || rep >= REP_THRESHOLDS.moderatorMin
}

export function canAccessDiscord(rep: number): boolean {
  return rep === -1 || rep >= REP_THRESHOLDS.contributorMin
}
