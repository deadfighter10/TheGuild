import { describe, it, expect } from "vitest"
import {
  validateCreateThread,
  validateCreateReply,
  validateEditThread,
  validateEditReply,
  validateDeleteThread,
  validateDeleteReply,
  type DiscussionThread,
  type DiscussionReply,
} from "./discussion"

function makeThread(overrides: Partial<DiscussionThread> = {}): DiscussionThread {
  return {
    id: "thread-1",
    advancementId: "fusion",
    authorId: "user-1",
    authorName: "Alice",
    title: "Plasma confinement discussion",
    body: "Thoughts on tokamak design",
    replyCount: 0,
    lastActivityAt: new Date("2025-01-01"),
    createdAt: new Date("2025-01-01"),
    ...overrides,
  }
}

function makeReply(overrides: Partial<DiscussionReply> = {}): DiscussionReply {
  return {
    id: "reply-1",
    threadId: "thread-1",
    authorId: "user-2",
    authorName: "Bob",
    body: "Great point about stellarators",
    createdAt: new Date("2025-01-01"),
    ...overrides,
  }
}

describe("validateCreateThread", () => {
  it("allows a contributor to create a thread", () => {
    const result = validateCreateThread({ authorRep: 100, authorRole: "user", title: "Valid title", body: "Valid body" })
    expect(result).toEqual({ valid: true })
  })

  it("rejects observer (rep < 100)", () => {
    const result = validateCreateThread({ authorRep: 50, authorRole: "user", title: "Title", body: "Body" })
    expect(result.valid).toBe(false)
  })

  it("allows admin regardless of rep", () => {
    const result = validateCreateThread({ authorRep: 0, authorRole: "admin", title: "Admin thread", body: "Admin body" })
    expect(result).toEqual({ valid: true })
  })

  it("rejects empty title", () => {
    const result = validateCreateThread({ authorRep: 100, authorRole: "user", title: "", body: "Body" })
    expect(result.valid).toBe(false)
  })

  it("rejects short title", () => {
    const result = validateCreateThread({ authorRep: 100, authorRole: "user", title: "Hi", body: "Body" })
    expect(result.valid).toBe(false)
  })

  it("rejects empty body", () => {
    const result = validateCreateThread({ authorRep: 100, authorRole: "user", title: "Valid title", body: "" })
    expect(result.valid).toBe(false)
  })
})

describe("validateCreateReply", () => {
  it("allows a contributor to reply", () => {
    const result = validateCreateReply({ authorRep: 100, authorRole: "user", body: "Good reply" })
    expect(result).toEqual({ valid: true })
  })

  it("rejects empty body", () => {
    const result = validateCreateReply({ authorRep: 100, authorRole: "user", body: "  " })
    expect(result.valid).toBe(false)
  })
})

describe("validateEditThread", () => {
  it("allows the author to edit their own thread", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      thread,
      title: "Updated title",
      body: "Updated body",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to edit any thread", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "mod-user",
      userRep: 3000,
      userRole: "user",
      thread,
      title: "Moderated title",
      body: "Moderated body",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows admin to edit any thread", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "admin-user",
      userRep: 0,
      userRole: "admin",
      thread,
      title: "Admin title",
      body: "Admin body",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects non-author non-moderator", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "user-2",
      userRep: 500,
      userRole: "user",
      thread,
      title: "Updated",
      body: "Updated",
    })
    expect(result.valid).toBe(false)
  })

  it("rejects empty title", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      thread,
      title: "",
      body: "Valid body",
    })
    expect(result.valid).toBe(false)
  })

  it("rejects short title", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      thread,
      title: "Hi",
      body: "Valid body",
    })
    expect(result.valid).toBe(false)
  })

  it("rejects empty body", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateEditThread({
      userId: "user-1",
      userRep: 100,
      userRole: "user",
      thread,
      title: "Valid title",
      body: "  ",
    })
    expect(result.valid).toBe(false)
  })
})

describe("validateEditReply", () => {
  it("allows the author to edit their own reply", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateEditReply({
      userId: "user-2",
      userRep: 100,
      userRole: "user",
      reply,
      body: "Updated reply",
    })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to edit any reply", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateEditReply({
      userId: "mod-user",
      userRep: 3000,
      userRole: "user",
      reply,
      body: "Moderated reply",
    })
    expect(result).toEqual({ valid: true })
  })

  it("rejects non-author non-moderator", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateEditReply({
      userId: "user-3",
      userRep: 500,
      userRole: "user",
      reply,
      body: "Updated",
    })
    expect(result.valid).toBe(false)
  })

  it("rejects empty body", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateEditReply({
      userId: "user-2",
      userRep: 100,
      userRole: "user",
      reply,
      body: "",
    })
    expect(result.valid).toBe(false)
  })
})

describe("validateDeleteThread", () => {
  it("allows the author to delete their own thread", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateDeleteThread({ userId: "user-1", userRep: 100, userRole: "user", thread })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to delete any thread", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateDeleteThread({ userId: "mod-user", userRep: 3000, userRole: "user", thread })
    expect(result).toEqual({ valid: true })
  })

  it("allows admin to delete any thread", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateDeleteThread({ userId: "admin-user", userRep: 0, userRole: "admin", thread })
    expect(result).toEqual({ valid: true })
  })

  it("rejects non-author non-moderator", () => {
    const thread = makeThread({ authorId: "user-1" })
    const result = validateDeleteThread({ userId: "user-2", userRep: 500, userRole: "user", thread })
    expect(result.valid).toBe(false)
  })
})

describe("validateDeleteReply", () => {
  it("allows the author to delete their own reply", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateDeleteReply({ userId: "user-2", userRep: 100, userRole: "user", reply })
    expect(result).toEqual({ valid: true })
  })

  it("allows a moderator to delete any reply", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateDeleteReply({ userId: "mod-user", userRep: 3000, userRole: "user", reply })
    expect(result).toEqual({ valid: true })
  })

  it("rejects non-author non-moderator", () => {
    const reply = makeReply({ authorId: "user-2" })
    const result = validateDeleteReply({ userId: "user-3", userRep: 500, userRole: "user", reply })
    expect(result.valid).toBe(false)
  })
})
