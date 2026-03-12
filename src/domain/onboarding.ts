export type UserBackground =
  | "researcher"
  | "student"
  | "engineer"
  | "professor"
  | "hobbyist"
  | "other"

export type OnboardingProfile = {
  readonly country: string
  readonly background: UserBackground
  readonly interests: readonly string[]
  readonly bio: string
}

type ValidationSuccess = { readonly valid: true }
type ValidationFailure = { readonly valid: false; readonly reason: string }
type ValidationResult = ValidationSuccess | ValidationFailure

export function validateOnboardingProfile(profile: OnboardingProfile): ValidationResult {
  if (!profile.country.trim()) {
    return { valid: false, reason: "Please select your country" }
  }

  if (!profile.background.trim()) {
    return { valid: false, reason: "Please select your background" }
  }

  if (profile.interests.length === 0) {
    return { valid: false, reason: "Please select at least one advancement you're interested in" }
  }

  return { valid: true }
}

export const USER_BACKGROUNDS: readonly { readonly value: UserBackground; readonly label: string; readonly description: string }[] = [
  { value: "researcher", label: "Researcher", description: "Working in academia or a research institution" },
  { value: "student", label: "Student", description: "Undergraduate, graduate, or PhD student" },
  { value: "engineer", label: "Engineer", description: "Working in industry or applied R&D" },
  { value: "professor", label: "Professor / Teacher", description: "Teaching or mentoring in academia" },
  { value: "hobbyist", label: "Hobbyist", description: "Self-taught, exploring out of curiosity" },
  { value: "other", label: "Other", description: "None of the above" },
] as const
