import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-doc-id" }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1 || (args.length === 2 && typeof args[0] === "object" && (args[0] as Record<string, unknown>).__isCollection)) {
        return mockDocRef
      }
      const collectionName = args[1] as string
      const docId = args[2] as string
      return { __collection: collectionName, __id: docId }
    }),
    getDoc: vi.fn(async (ref: { __collection?: string; __id?: string }) => {
      const key = `${ref.__collection}/${ref.__id}`
      const snap = docSnapshots()[key]
      return {
        exists: () => snap?.exists ?? false,
        id: snap?.id ?? ref.__id ?? "",
        data: () => snap?.data ?? {},
      }
    }),
    getDocs: vi.fn(async () => ({ docs: [] })),
    deleteDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/lib/rate-limit", () => ({
  addRateLimitToBatch: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))
vi.mock("@/features/notifications/notification-service", () => ({
  createNotification: vi.fn(async () => {}),
}))

import { createThread, createReply, editThread, deleteThread, deleteReply } from "./discussion-service"
import { updateDoc, deleteDoc } from "firebase/firestore"
import { addRateLimitToBatch } from "@/lib/rate-limit"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
})

describe("createThread", () => {
  const validParams = {
    authorId: "user-1",
    authorName: "Alice",
    authorRep: 200,
    authorRole: "user" as const,
    advancementId: "adv-1",
    title: "Discussion Topic",
    body: "What do you think?",
  }

  it("creates a thread when validation passes", async () => {
    const result = await createThread(validParams)

    expect(result).toEqual({ success: true, threadId: "new-doc-id" })
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("adds rate limit to the batch", async () => {
    await createThread(validParams)

    expect(addRateLimitToBatch).toHaveBeenCalledWith(mockBatch, "user-1", "discussionThreads")
  })

  it("rejects when rep is too low", async () => {
    const result = await createThread({ ...validParams, authorRep: 50 })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it("rejects empty title", async () => {
    const result = await createThread({ ...validParams, title: "" })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("createReply", () => {
  const validParams = {
    authorId: "user-1",
    authorName: "Alice",
    authorRep: 200,
    authorRole: "user" as const,
    threadId: "thread-1",
    body: "I agree with this point.",
  }

  it("creates a reply and updates thread counters", async () => {
    mockDocSnapshots["discussionThreads/thread-1"] = {
      exists: true,
      id: "thread-1",
      data: { authorId: "other-user", advancementId: "adv-1", title: "Thread Title" },
    }

    const result = await createReply(validParams)

    expect(result).toEqual({ success: true })
    expect(mockBatch.set).toHaveBeenCalled()
    expect(mockBatch.update).toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("sends notification to thread author when different from replier", async () => {
    mockDocSnapshots["discussionThreads/thread-1"] = {
      exists: true,
      id: "thread-1",
      data: { authorId: "other-user", advancementId: "adv-1", title: "Thread Title" },
    }

    await createReply(validParams)

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "other-user",
      type: "reply",
    }))
  })

  it("does not notify when replying to own thread", async () => {
    mockDocSnapshots["discussionThreads/thread-1"] = {
      exists: true,
      id: "thread-1",
      data: { authorId: "user-1", advancementId: "adv-1", title: "My Thread" },
    }

    await createReply(validParams)

    expect(createNotification).not.toHaveBeenCalled()
  })

  it("rejects empty body", async () => {
    const result = await createReply({ ...validParams, body: "" })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("editThread", () => {
  function setupThread(authorId = "user-1") {
    mockDocSnapshots["discussionThreads/thread-1"] = {
      exists: true,
      id: "thread-1",
      data: {
        advancementId: "adv-1",
        authorId,
        authorName: "Alice",
        title: "Original",
        body: "Original body",
        replyCount: 0,
        lastActivityAt: fakeTimestamp,
        createdAt: fakeTimestamp,
      },
    }
  }

  it("allows author to edit their thread", async () => {
    setupThread()

    const result = await editThread({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      threadId: "thread-1",
      title: "Updated Title",
      body: "Updated Body",
    })

    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalled()
  })

  it("rejects when thread does not exist", async () => {
    const result = await editThread({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      threadId: "thread-1",
      title: "Updated",
      body: "Updated",
    })

    expect(result).toEqual({ success: false, reason: "Thread not found" })
  })

  it("rejects edit by non-author without moderator rep", async () => {
    setupThread("other-user")

    const result = await editThread({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      threadId: "thread-1",
      title: "Updated",
      body: "Updated",
    })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("deleteThread", () => {
  it("allows author to delete their thread", async () => {
    mockDocSnapshots["discussionThreads/thread-1"] = {
      exists: true,
      id: "thread-1",
      data: {
        advancementId: "adv-1",
        authorId: "user-1",
        authorName: "Alice",
        title: "To Delete",
        body: "Body",
        replyCount: 0,
        lastActivityAt: fakeTimestamp,
        createdAt: fakeTimestamp,
      },
    }

    const result = await deleteThread({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      threadId: "thread-1",
    })

    expect(result).toEqual({ success: true })
    expect(deleteDoc).toHaveBeenCalled()
  })

  it("rejects when thread does not exist", async () => {
    const result = await deleteThread({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      threadId: "thread-1",
    })

    expect(result).toEqual({ success: false, reason: "Thread not found" })
  })
})

describe("deleteReply", () => {
  it("allows author to delete their reply and decrements count", async () => {
    mockDocSnapshots["discussionReplies/reply-1"] = {
      exists: true,
      id: "reply-1",
      data: {
        threadId: "thread-1",
        authorId: "user-1",
        authorName: "Alice",
        body: "To delete",
        createdAt: fakeTimestamp,
      },
    }

    const result = await deleteReply({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      replyId: "reply-1",
      threadId: "thread-1",
    })

    expect(result).toEqual({ success: true })
    expect(deleteDoc).toHaveBeenCalled()
    expect(updateDoc).toHaveBeenCalled()
  })
})
