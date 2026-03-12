import { describe, it, expect } from "vitest"
import {
  validateOnboardingProfile,
  type UserBackground,
} from "./onboarding"

describe("validateOnboardingProfile", () => {
  it("accepts a complete profile", () => {
    const result = validateOnboardingProfile({
      country: "United States",
      background: "researcher",
      interests: ["fusion", "crispr"],
      bio: "Fusion physicist at MIT",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects missing country", () => {
    const result = validateOnboardingProfile({
      country: "",
      background: "researcher",
      interests: ["fusion"],
      bio: "",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Please select your country",
    })
  })

  it("rejects missing background", () => {
    const result = validateOnboardingProfile({
      country: "Germany",
      background: "" as UserBackground,
      interests: ["fusion"],
      bio: "",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Please select your background",
    })
  })

  it("rejects empty interests", () => {
    const result = validateOnboardingProfile({
      country: "Japan",
      background: "student",
      interests: [],
      bio: "",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Please select at least one advancement you're interested in",
    })
  })

  it("accepts an empty bio", () => {
    const result = validateOnboardingProfile({
      country: "Brazil",
      background: "engineer",
      interests: ["aagi"],
      bio: "",
    })
    expect(result).toEqual({ valid: true })
  })

  it("accepts all valid backgrounds", () => {
    const backgrounds: readonly UserBackground[] = [
      "researcher",
      "student",
      "engineer",
      "professor",
      "hobbyist",
      "other",
    ]
    for (const background of backgrounds) {
      const result = validateOnboardingProfile({
        country: "UK",
        background,
        interests: ["bci"],
        bio: "",
      })
      expect(result).toEqual({ valid: true })
    }
  })

  it("accepts multiple interests", () => {
    const result = validateOnboardingProfile({
      country: "Canada",
      background: "researcher",
      interests: ["telomerase", "tissue-engineering", "crispr"],
      bio: "",
    })
    expect(result).toEqual({ valid: true })
  })
})
