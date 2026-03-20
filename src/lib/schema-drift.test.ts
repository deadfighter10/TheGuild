import { describe, it, expect, vi } from "vitest"
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
  parseRepEventDoc,
} from "./firestore-schemas"

vi.spyOn(console, "error").mockImplementation(() => {})

function makeTimestamp() {
  return { toDate: () => new Date("2026-01-01") }
}

describe("parseTreeNodeDoc", () => {
  const valid = {
    advancementId: "fusion",
    parentNodeId: null,
    authorId: "u1",
    title: "Test",
    description: "Desc",
    status: "theoretical",
    supportCount: 0,
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseTreeNodeDoc("n1", valid)).toMatchObject({ id: "n1", title: "Test" })
  })

  it("rejects document missing title", () => {
    const { title: _, ...missing } = valid
    expect(parseTreeNodeDoc("n1", missing)).toBeNull()
  })

  it("rejects document with invalid status", () => {
    expect(parseTreeNodeDoc("n1", { ...valid, status: "invalid" })).toBeNull()
  })
})

describe("parseNewsLinkDoc", () => {
  const valid = {
    advancementId: "fusion",
    submitterId: "u1",
    title: "Link",
    url: "https://example.com",
    score: 5,
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseNewsLinkDoc("l1", valid)).toMatchObject({ id: "l1", title: "Link" })
  })

  it("rejects document missing url", () => {
    const { url: _, ...missing } = valid
    expect(parseNewsLinkDoc("l1", missing)).toBeNull()
  })

  it("rejects document with non-number score", () => {
    expect(parseNewsLinkDoc("l1", { ...valid, score: "five" })).toBeNull()
  })
})

describe("parseDiscussionThreadDoc", () => {
  const valid = {
    advancementId: "fusion",
    authorId: "u1",
    authorName: "User",
    title: "Thread",
    body: "Content",
    replyCount: 0,
    lastActivityAt: makeTimestamp(),
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseDiscussionThreadDoc("t1", valid)).toMatchObject({ id: "t1", title: "Thread" })
  })

  it("rejects document missing authorName", () => {
    const { authorName: _, ...missing } = valid
    expect(parseDiscussionThreadDoc("t1", missing)).toBeNull()
  })
})

describe("parseDiscussionReplyDoc", () => {
  const valid = {
    threadId: "t1",
    authorId: "u1",
    authorName: "User",
    body: "Reply",
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseDiscussionReplyDoc("r1", valid)).toMatchObject({ id: "r1", body: "Reply" })
  })

  it("rejects document missing threadId", () => {
    const { threadId: _, ...missing } = valid
    expect(parseDiscussionReplyDoc("r1", missing)).toBeNull()
  })
})

describe("parseContentFlagDoc", () => {
  const valid = {
    targetCollection: "nodes",
    targetId: "n1",
    targetTitle: "Bad",
    reporterId: "u1",
    reporterName: "User",
    reason: "spam",
    details: "",
    status: "pending",
    resolvedBy: null,
    resolvedAt: null,
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseContentFlagDoc("f1", valid)).toMatchObject({ id: "f1", reason: "spam" })
  })

  it("rejects document with invalid reason", () => {
    expect(parseContentFlagDoc("f1", { ...valid, reason: "invalid" })).toBeNull()
  })

  it("rejects document with invalid targetCollection", () => {
    expect(parseContentFlagDoc("f1", { ...valid, targetCollection: "hacked" })).toBeNull()
  })

  it("rejects document with invalid status", () => {
    expect(parseContentFlagDoc("f1", { ...valid, status: "resolved" })).toBeNull()
  })
})

describe("parseNotificationDoc", () => {
  const valid = {
    userId: "u1",
    type: "reply",
    message: "New reply",
    link: "/discussions",
    read: false,
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseNotificationDoc("n1", valid)).toMatchObject({ id: "n1", type: "reply" })
  })

  it("rejects document with invalid type", () => {
    expect(parseNotificationDoc("n1", { ...valid, type: "hacked" })).toBeNull()
  })

  it("rejects document missing message", () => {
    const { message: _, ...missing } = valid
    expect(parseNotificationDoc("n1", missing)).toBeNull()
  })
})

describe("parseGuildUserDoc", () => {
  const valid = {
    email: "test@example.com",
    displayName: "User",
    repPoints: 100,
    isSchoolEmail: false,
    emailVerified: true,
    createdAt: makeTimestamp(),
    onboardingComplete: true,
    country: null,
    background: null,
    interests: [],
    bio: "",
    photoURL: null,
    role: "user",
  }

  it("parses a valid document", () => {
    expect(parseGuildUserDoc("u1", valid)).toMatchObject({ uid: "u1", displayName: "User" })
  })

  it("rejects document missing email", () => {
    const { email: _, ...missing } = valid
    expect(parseGuildUserDoc("u1", missing)).toBeNull()
  })

  it("rejects document with invalid role", () => {
    expect(parseGuildUserDoc("u1", { ...valid, role: "superadmin" })).toBeNull()
  })

  it("rejects document with invalid background", () => {
    expect(parseGuildUserDoc("u1", { ...valid, background: "wizard" })).toBeNull()
  })

  it("rejects document with non-boolean isSchoolEmail", () => {
    expect(parseGuildUserDoc("u1", { ...valid, isSchoolEmail: "yes" })).toBeNull()
  })
})

describe("parseLibraryEntryDoc", () => {
  const valid = {
    advancementId: "fusion",
    authorId: "u1",
    title: "Entry",
    content: "Content",
    contentType: "article",
    difficulty: "introductory",
    createdAt: makeTimestamp(),
    updatedAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseLibraryEntryDoc("e1", valid)).toMatchObject({ id: "e1", title: "Entry" })
  })

  it("rejects document with invalid contentType", () => {
    expect(parseLibraryEntryDoc("e1", { ...valid, contentType: "podcast" })).toBeNull()
  })

  it("rejects document with invalid difficulty", () => {
    expect(parseLibraryEntryDoc("e1", { ...valid, difficulty: "expert" })).toBeNull()
  })
})

describe("parseEntryVersionDoc", () => {
  const valid = {
    entryId: "e1",
    title: "Title",
    content: "Content",
    contentType: "article",
    difficulty: "introductory",
    editedBy: "u1",
    createdAt: makeTimestamp(),
  }

  it("parses a valid document", () => {
    expect(parseEntryVersionDoc("v1", valid)).toMatchObject({ id: "v1", editedBy: "u1" })
  })

  it("rejects document missing entryId", () => {
    const { entryId: _, ...missing } = valid
    expect(parseEntryVersionDoc("v1", missing)).toBeNull()
  })
})

describe("parsePeerReviewDoc", () => {
  const valid = {
    contentType: "node",
    contentId: "n1",
    contentTitle: "Node",
    advancementId: "fusion",
    authorId: "u1",
    authorName: "User",
    status: "pending",
    reviewerId: null,
    reviewerName: null,
    feedback: null,
    decision: null,
    submittedAt: makeTimestamp(),
    reviewedAt: null,
  }

  it("parses a valid document", () => {
    expect(parsePeerReviewDoc("pr1", valid)).toMatchObject({ id: "pr1", status: "pending" })
  })

  it("rejects document with invalid status", () => {
    expect(parsePeerReviewDoc("pr1", { ...valid, status: "invalid" })).toBeNull()
  })

  it("rejects document with invalid contentType", () => {
    expect(parsePeerReviewDoc("pr1", { ...valid, contentType: "comment" })).toBeNull()
  })

  it("rejects document with invalid decision", () => {
    expect(parsePeerReviewDoc("pr1", { ...valid, decision: "maybe" })).toBeNull()
  })
})

describe("parseRepEventDoc", () => {
  const valid = {
    userId: "u1",
    delta: 100,
    reason: "school_email_verified",
    sourceId: null,
    sourceDescription: "School email verified",
    timestamp: makeTimestamp(),
    balanceAfter: 100,
  }

  it("parses a valid document", () => {
    expect(parseRepEventDoc("re1", valid)).toMatchObject({ id: "re1", delta: 100 })
  })

  it("rejects document with invalid reason", () => {
    expect(parseRepEventDoc("re1", { ...valid, reason: "cheating" })).toBeNull()
  })

  it("rejects document missing sourceDescription", () => {
    const { sourceDescription: _, ...missing } = valid
    expect(parseRepEventDoc("re1", missing)).toBeNull()
  })
})
