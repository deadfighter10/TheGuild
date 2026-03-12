import { describe, it, expect } from "vitest"
import {
  validateSubmitNewsLink,
  validateVoteNewsLink,
  type NewsLink,
} from "./news-link"

function makeNewsLink(overrides: Partial<NewsLink> = {}): NewsLink {
  return {
    id: "link-1",
    advancementId: "fusion",
    submitterId: "user-1",
    title: "New fusion breakthrough reported",
    url: "https://example.com/fusion-news",
    score: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  }
}

describe("validateSubmitNewsLink", () => {
  it("allows a contributor (100+ Rep) to submit a link", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 100,
      title: "Breaking news",
      url: "https://example.com/article",
      advancementId: "fusion",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects an observer (under 100 Rep)", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 99,
      title: "Breaking news",
      url: "https://example.com/article",
      advancementId: "fusion",
    })
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to submit news links",
    })
  })

  it("rejects an empty title", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 100,
      title: "",
      url: "https://example.com/article",
      advancementId: "fusion",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects a whitespace-only title", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 100,
      title: "   ",
      url: "https://example.com/article",
      advancementId: "fusion",
    })
    expect(result).toEqual({
      valid: false,
      reason: "Title is required",
    })
  })

  it("rejects an empty URL", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 100,
      title: "Breaking news",
      url: "",
      advancementId: "fusion",
    })
    expect(result).toEqual({
      valid: false,
      reason: "URL is required",
    })
  })

  it("rejects an invalid URL", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 100,
      title: "Breaking news",
      url: "not-a-url",
      advancementId: "fusion",
    })
    expect(result).toEqual({
      valid: false,
      reason: "URL must start with http:// or https://",
    })
  })

  it("accepts http URLs", () => {
    const result = validateSubmitNewsLink({
      submitterRep: 100,
      title: "Article",
      url: "http://example.com/article",
      advancementId: "fusion",
    })
    expect(result).toEqual({ valid: true })
  })
})

describe("validateVoteNewsLink", () => {
  it("allows a contributor to upvote", () => {
    const link = makeNewsLink({ submitterId: "user-2" })
    const result = validateVoteNewsLink({
      userId: "user-1",
      userRep: 100,
      link,
      existingVote: null,
      newVote: 1,
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows a contributor to downvote", () => {
    const link = makeNewsLink({ submitterId: "user-2" })
    const result = validateVoteNewsLink({
      userId: "user-1",
      userRep: 100,
      link,
      existingVote: null,
      newVote: -1,
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects an observer", () => {
    const link = makeNewsLink({ submitterId: "user-2" })
    const result = validateVoteNewsLink({
      userId: "user-1",
      userRep: 50,
      link,
      existingVote: null,
      newVote: 1,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to vote",
    })
  })

  it("rejects voting on your own link", () => {
    const link = makeNewsLink({ submitterId: "user-1" })
    const result = validateVoteNewsLink({
      userId: "user-1",
      userRep: 100,
      link,
      existingVote: null,
      newVote: 1,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You cannot vote on your own submission",
    })
  })

  it("rejects voting the same direction twice", () => {
    const link = makeNewsLink({ submitterId: "user-2" })
    const result = validateVoteNewsLink({
      userId: "user-1",
      userRep: 100,
      link,
      existingVote: 1,
      newVote: 1,
    })
    expect(result).toEqual({
      valid: false,
      reason: "You have already voted this way",
    })
  })

  it("allows changing vote direction", () => {
    const link = makeNewsLink({ submitterId: "user-2" })
    const result = validateVoteNewsLink({
      userId: "user-1",
      userRep: 100,
      link,
      existingVote: 1,
      newVote: -1,
    })
    expect(result).toEqual({ valid: true })
  })
})
