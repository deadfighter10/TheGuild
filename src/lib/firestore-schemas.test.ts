import { describe, it, expect } from "vitest"
import {
  parseTreeNodeDoc,
  parseNewsLinkDoc,
  parseDiscussionThreadDoc,
  parseDiscussionReplyDoc,
  parseContentFlagDoc,
  parseNotificationDoc,
  parseGuildUserDoc,
  parseLibraryEntryDoc,
  parseEntryVersionDoc,
  parsePeerReviewDoc,
} from "./firestore-schemas"

const fakeTimestamp = { toDate: () => new Date("2025-01-01T00:00:00Z") }

describe("parseTreeNodeDoc", () => {
  it("parses a valid Firestore document", () => {
    const result = parseTreeNodeDoc("node-1", {
      advancementId: "adv-1",
      parentNodeId: null,
      authorId: "user-1",
      title: "Test Node",
      description: "A description",
      status: "theoretical",
      supportCount: 5,
      createdAt: fakeTimestamp,
    })
    expect(result).toEqual({
      id: "node-1",
      advancementId: "adv-1",
      parentNodeId: null,
      authorId: "user-1",
      title: "Test Node",
      description: "A description",
      status: "theoretical",
      supportCount: 5,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    })
  })

  it("defaults missing parentNodeId to null", () => {
    const result = parseTreeNodeDoc("node-1", {
      advancementId: "adv-1",
      authorId: "user-1",
      title: "Test",
      description: "Desc",
      status: "proven",
      supportCount: 0,
      createdAt: fakeTimestamp,
    })
    expect(result?.parentNodeId).toBeNull()
  })

  it("defaults missing createdAt to current date", () => {
    const before = Date.now()
    const result = parseTreeNodeDoc("node-1", {
      advancementId: "adv-1",
      parentNodeId: null,
      authorId: "user-1",
      title: "Test",
      description: "Desc",
      status: "theoretical",
      supportCount: 0,
    })
    expect(result?.createdAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it("returns null for invalid data", () => {
    const result = parseTreeNodeDoc("node-1", {
      advancementId: "adv-1",
      // missing required fields
    })
    expect(result).toBeNull()
  })
})

describe("parseNewsLinkDoc", () => {
  it("parses a valid document", () => {
    const result = parseNewsLinkDoc("link-1", {
      advancementId: "adv-1",
      submitterId: "user-1",
      title: "Cool Article",
      url: "https://example.com",
      score: 42,
      createdAt: fakeTimestamp,
    })
    expect(result).toEqual({
      id: "link-1",
      advancementId: "adv-1",
      submitterId: "user-1",
      title: "Cool Article",
      url: "https://example.com",
      score: 42,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    })
  })

  it("returns null for missing fields", () => {
    expect(parseNewsLinkDoc("link-1", { title: "No url" })).toBeNull()
  })
})

describe("parseDiscussionThreadDoc", () => {
  it("parses a valid document", () => {
    const result = parseDiscussionThreadDoc("thread-1", {
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      title: "Discussion",
      body: "Hello world",
      replyCount: 3,
      lastActivityAt: fakeTimestamp,
      createdAt: fakeTimestamp,
    })
    expect(result?.id).toBe("thread-1")
    expect(result?.replyCount).toBe(3)
    expect(result?.authorName).toBe("Alice")
  })

  it("defaults replyCount to 0 when missing", () => {
    const result = parseDiscussionThreadDoc("thread-1", {
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      title: "Test",
      body: "Body",
      lastActivityAt: fakeTimestamp,
      createdAt: fakeTimestamp,
    })
    expect(result?.replyCount).toBe(0)
  })
})

describe("parseDiscussionReplyDoc", () => {
  it("parses a valid document", () => {
    const result = parseDiscussionReplyDoc("reply-1", {
      threadId: "thread-1",
      authorId: "user-1",
      authorName: "Bob",
      body: "A reply",
      createdAt: fakeTimestamp,
    })
    expect(result).toEqual({
      id: "reply-1",
      threadId: "thread-1",
      authorId: "user-1",
      authorName: "Bob",
      body: "A reply",
      createdAt: new Date("2025-01-01T00:00:00Z"),
    })
  })
})

describe("parseContentFlagDoc", () => {
  it("parses a valid document", () => {
    const result = parseContentFlagDoc("flag-1", {
      targetCollection: "nodes",
      targetId: "node-1",
      targetTitle: "Bad Node",
      reporterId: "user-1",
      reporterName: "Charlie",
      reason: "spam",
      details: "Clearly spam",
      status: "pending",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: fakeTimestamp,
    })
    expect(result?.status).toBe("pending")
    expect(result?.resolvedBy).toBeNull()
    expect(result?.resolvedAt).toBeNull()
  })

  it("parses a resolved flag", () => {
    const result = parseContentFlagDoc("flag-1", {
      targetCollection: "newsLinks",
      targetId: "link-1",
      targetTitle: "Bad Link",
      reporterId: "user-1",
      reporterName: "Charlie",
      reason: "misinformation",
      details: "",
      status: "actioned",
      resolvedBy: "admin-1",
      resolvedAt: fakeTimestamp,
      createdAt: fakeTimestamp,
    })
    expect(result?.status).toBe("actioned")
    expect(result?.resolvedBy).toBe("admin-1")
    expect(result?.resolvedAt).toEqual(new Date("2025-01-01T00:00:00Z"))
  })
})

describe("parseNotificationDoc", () => {
  it("parses a valid document", () => {
    const result = parseNotificationDoc("notif-1", {
      userId: "user-1",
      type: "reply",
      message: "Someone replied",
      link: "/advancement/adv-1",
      read: false,
      createdAt: fakeTimestamp,
    })
    expect(result?.read).toBe(false)
    expect(result?.type).toBe("reply")
  })
})

describe("parseGuildUserDoc", () => {
  it("parses a valid user document with all fields", () => {
    const result = parseGuildUserDoc("user-1", {
      email: "alice@example.com",
      displayName: "Alice",
      repPoints: 500,
      isSchoolEmail: true,
      emailVerified: true,
      createdAt: fakeTimestamp,
      onboardingComplete: true,
      country: "US",
      background: "researcher",
      interests: ["fusion", "crispr"],
      bio: "Researcher at MIT",
      photoURL: "https://example.com/photo.jpg",
    })
    expect(result).toEqual({
      uid: "user-1",
      email: "alice@example.com",
      displayName: "Alice",
      repPoints: 500,
      isSchoolEmail: true,
      emailVerified: true,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      onboardingComplete: true,
      country: "US",
      background: "researcher",
      interests: ["fusion", "crispr"],
      bio: "Researcher at MIT",
      photoURL: "https://example.com/photo.jpg",
    })
  })

  it("defaults optional fields when missing", () => {
    const result = parseGuildUserDoc("user-2", {
      email: "bob@example.com",
      displayName: "Bob",
      repPoints: 0,
      isSchoolEmail: false,
    })
    expect(result?.emailVerified).toBe(false)
    expect(result?.onboardingComplete).toBe(false)
    expect(result?.country).toBeNull()
    expect(result?.background).toBeNull()
    expect(result?.interests).toEqual([])
    expect(result?.bio).toBe("")
    expect(result?.photoURL).toBeNull()
  })

  it("returns null for invalid data", () => {
    const result = parseGuildUserDoc("user-1", { email: "test@example.com" })
    expect(result).toBeNull()
  })
})

describe("parseLibraryEntryDoc", () => {
  it("parses a valid library entry with url", () => {
    const result = parseLibraryEntryDoc("entry-1", {
      advancementId: "adv-1",
      authorId: "user-1",
      title: "Intro to Fusion",
      content: "Article content",
      contentType: "article",
      difficulty: "introductory",
      url: "https://example.com/paper",
      createdAt: fakeTimestamp,
      updatedAt: fakeTimestamp,
    })
    expect(result).toEqual({
      id: "entry-1",
      advancementId: "adv-1",
      authorId: "user-1",
      title: "Intro to Fusion",
      content: "Article content",
      contentType: "article",
      difficulty: "introductory",
      url: "https://example.com/paper",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    })
  })

  it("omits url when not present", () => {
    const result = parseLibraryEntryDoc("entry-2", {
      advancementId: "adv-1",
      authorId: "user-1",
      title: "Test",
      content: "Body",
      contentType: "youtube",
      difficulty: "advanced",
      createdAt: fakeTimestamp,
      updatedAt: fakeTimestamp,
    })
    expect(result?.url).toBeUndefined()
  })

  it("defaults content to empty string when missing", () => {
    const result = parseLibraryEntryDoc("entry-3", {
      advancementId: "adv-1",
      authorId: "user-1",
      title: "Link Only",
      contentType: "link",
      difficulty: "intermediate",
      url: "https://example.com",
      createdAt: fakeTimestamp,
      updatedAt: fakeTimestamp,
    })
    expect(result?.content).toBe("")
  })

  it("returns null for invalid data", () => {
    expect(parseLibraryEntryDoc("entry-1", { title: "No author" })).toBeNull()
  })
})

describe("parseEntryVersionDoc", () => {
  it("parses a valid version document", () => {
    const result = parseEntryVersionDoc("ver-1", {
      entryId: "entry-1",
      title: "Old Title",
      content: "Old content",
      contentType: "article",
      difficulty: "introductory",
      editedBy: "user-1",
      createdAt: fakeTimestamp,
    })
    expect(result).toEqual({
      id: "ver-1",
      entryId: "entry-1",
      title: "Old Title",
      content: "Old content",
      contentType: "article",
      difficulty: "introductory",
      editedBy: "user-1",
      createdAt: new Date("2025-01-01T00:00:00Z"),
    })
  })

  it("defaults contentType and difficulty when missing", () => {
    const result = parseEntryVersionDoc("ver-2", {
      entryId: "entry-1",
      title: "Test",
      content: "Body",
      editedBy: "user-1",
      createdAt: fakeTimestamp,
    })
    expect(result?.contentType).toBe("article")
    expect(result?.difficulty).toBe("introductory")
  })
})

describe("parsePeerReviewDoc", () => {
  it("parses a valid pending peer review", () => {
    const result = parsePeerReviewDoc("review-1", {
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Telomere Extension",
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      status: "pending",
      reviewerId: null,
      reviewerName: null,
      feedback: null,
      decision: null,
      submittedAt: fakeTimestamp,
      reviewedAt: null,
    })
    expect(result).toEqual({
      id: "review-1",
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Telomere Extension",
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      status: "pending",
      reviewerId: null,
      reviewerName: null,
      feedback: null,
      decision: null,
      submittedAt: new Date("2025-01-01T00:00:00Z"),
      reviewedAt: null,
    })
  })

  it("parses a completed review with feedback", () => {
    const result = parsePeerReviewDoc("review-2", {
      contentType: "libraryEntry",
      contentId: "entry-1",
      contentTitle: "CRISPR Guide",
      advancementId: "adv-2",
      authorId: "user-1",
      authorName: "Alice",
      status: "approved",
      reviewerId: "mod-1",
      reviewerName: "Dr. Bob",
      feedback: {
        accuracy: { score: 5, comment: "Excellent" },
        clarity: { score: 4, comment: "Clear" },
        novelty: { score: 3, comment: "Standard" },
        evidenceQuality: { score: 5, comment: "Strong" },
        summary: "Well done",
      },
      decision: "approved",
      submittedAt: fakeTimestamp,
      reviewedAt: fakeTimestamp,
    })
    expect(result?.status).toBe("approved")
    expect(result?.reviewerId).toBe("mod-1")
    expect(result?.feedback?.accuracy.score).toBe(5)
    expect(result?.decision).toBe("approved")
    expect(result?.reviewedAt).toEqual(new Date("2025-01-01T00:00:00Z"))
  })

  it("defaults optional fields when missing", () => {
    const result = parsePeerReviewDoc("review-3", {
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Test",
      advancementId: "adv-1",
      authorId: "user-1",
      authorName: "Alice",
      status: "pending",
      submittedAt: fakeTimestamp,
    })
    expect(result?.reviewerId).toBeNull()
    expect(result?.reviewerName).toBeNull()
    expect(result?.feedback).toBeNull()
    expect(result?.decision).toBeNull()
    expect(result?.reviewedAt).toBeNull()
  })

  it("returns null for invalid data", () => {
    const result = parsePeerReviewDoc("review-1", {
      contentType: "invalid",
      contentId: "node-1",
    })
    expect(result).toBeNull()
  })
})
