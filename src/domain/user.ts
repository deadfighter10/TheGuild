import type { UserBackground } from "./onboarding"
import type { DigestPreferences } from "./email-digest"

export type UserRole = "user" | "admin"

export type GuildUser = {
  readonly uid: string
  readonly email: string
  readonly displayName: string
  readonly repPoints: number
  readonly isSchoolEmail: boolean
  readonly emailVerified: boolean
  readonly createdAt: Date
  readonly onboardingComplete: boolean
  readonly country: string | null
  readonly background: UserBackground | null
  readonly interests: readonly string[]
  readonly bio: string
  readonly photoURL: string | null
  readonly role: UserRole
  readonly bannedUntil: Date | null
  readonly digestPreferences: DigestPreferences
}

export type RepTier = "observer" | "contributor" | "moderator"

export function isAdmin(role: UserRole): boolean {
  return role === "admin"
}

export function getRepTier(rep: number): RepTier {
  if (rep >= 3000) return "moderator"
  if (rep >= 100) return "contributor"
  return "observer"
}
