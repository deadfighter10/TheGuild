import { describe, it, expect } from "vitest"
import {
  ACHIEVEMENTS,
  getAchievementById,
  checkMilestoneEligibility,
  type AchievementCategory,
} from "./achievement"

describe("ACHIEVEMENTS", () => {
  it("has unique ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("includes milestone achievements", () => {
    const milestones = ACHIEVEMENTS.filter((a) => a.category === "milestone")
    expect(milestones.length).toBeGreaterThanOrEqual(5)
  })

  it("includes advancement achievements", () => {
    const advancements = ACHIEVEMENTS.filter((a) => a.category === "advancement")
    expect(advancements.length).toBe(6)
  })

  it("includes special achievements", () => {
    const special = ACHIEVEMENTS.filter((a) => a.category === "special")
    expect(special.length).toBeGreaterThanOrEqual(1)
  })

  it("each achievement has name, description, and category", () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.name).toBeTruthy()
      expect(achievement.description).toBeTruthy()
      expect(["milestone", "advancement", "special"]).toContain(achievement.category)
    }
  })

  it("has only valid categories", () => {
    const validCategories: readonly AchievementCategory[] = ["milestone", "advancement", "special"]
    for (const achievement of ACHIEVEMENTS) {
      expect(validCategories).toContain(achievement.category)
    }
  })
})

describe("getAchievementById", () => {
  it("returns the achievement for a valid id", () => {
    const achievement = getAchievementById("first-node")
    expect(achievement).toBeDefined()
    expect(achievement?.name).toBe("First Node")
  })

  it("returns undefined for an invalid id", () => {
    expect(getAchievementById("nonexistent")).toBeUndefined()
  })
})

describe("checkMilestoneEligibility", () => {
  it("returns first-node when user has 1+ nodes", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 1,
      supportsGiven: 0,
      libraryEntries: 0,
      reviewsCompleted: 0,
      threadsCreated: 0,
    })
    expect(eligible).toContain("first-node")
  })

  it("returns first-entry when user has 1+ library entries", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 0,
      libraryEntries: 1,
      reviewsCompleted: 0,
      threadsCreated: 0,
    })
    expect(eligible).toContain("first-entry")
  })

  it("returns supporter-100 when user has 100+ supports given", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 100,
      libraryEntries: 0,
      reviewsCompleted: 0,
      threadsCreated: 0,
    })
    expect(eligible).toContain("supporter-100")
  })

  it("does not return supporter-100 when user has 99 supports", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 99,
      libraryEntries: 0,
      reviewsCompleted: 0,
      threadsCreated: 0,
    })
    expect(eligible).not.toContain("supporter-100")
  })

  it("returns library-scholar when user has 10+ entries", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 0,
      libraryEntries: 10,
      reviewsCompleted: 0,
      threadsCreated: 0,
    })
    expect(eligible).toContain("library-scholar")
  })

  it("returns peer-reviewer when user has 5+ reviews completed", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 0,
      libraryEntries: 0,
      reviewsCompleted: 5,
      threadsCreated: 0,
    })
    expect(eligible).toContain("peer-reviewer")
  })

  it("returns first-thread when user has 1+ threads", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 0,
      libraryEntries: 0,
      reviewsCompleted: 0,
      threadsCreated: 1,
    })
    expect(eligible).toContain("first-thread")
  })

  it("returns empty array when user has no activity", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 0,
      supportsGiven: 0,
      libraryEntries: 0,
      reviewsCompleted: 0,
      threadsCreated: 0,
    })
    expect(eligible).toEqual([])
  })

  it("returns multiple achievements when multiple criteria are met", () => {
    const eligible = checkMilestoneEligibility({
      nodesCreated: 5,
      supportsGiven: 150,
      libraryEntries: 12,
      reviewsCompleted: 7,
      threadsCreated: 3,
    })
    expect(eligible).toContain("first-node")
    expect(eligible).toContain("supporter-100")
    expect(eligible).toContain("library-scholar")
    expect(eligible).toContain("peer-reviewer")
    expect(eligible).toContain("first-entry")
    expect(eligible).toContain("first-thread")
  })
})
