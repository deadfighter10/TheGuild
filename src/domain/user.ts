import type { UserBackground } from "./onboarding"

export type GuildUser = {
  readonly uid: string
  readonly email: string
  readonly displayName: string
  readonly repPoints: number
  readonly isSchoolEmail: boolean
  readonly createdAt: Date
  readonly onboardingComplete: boolean
  readonly country: string | null
  readonly background: UserBackground | null
  readonly interests: readonly string[]
  readonly bio: string
}

export type RepTier = "observer" | "contributor" | "moderator"

export function isAdmin(rep: number): boolean {
  return rep === -1
}

export function getRepTier(rep: number): RepTier {
  if (isAdmin(rep)) return "moderator"
  if (rep >= 3000) return "moderator"
  if (rep >= 100) return "contributor"
  return "observer"
}
