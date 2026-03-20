import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

let mockDocs: readonly { id: string; data: () => Record<string, unknown> }[] = []
let mockCounts: readonly number[] = []
let countIndex = 0
const mockCallable = vi.fn(async () => ({ data: {} }))

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: mockDocs })),
  getCountFromServer: vi.fn(async () => {
    const count = mockCounts[countIndex] ?? 0
    countIndex++
    return { data: () => ({ count }) }
  }),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockCallable),
}))

vi.mock("@/lib/firebase", () => ({ db: {}, app: {} }))

import {
  getAllUsers,
  updateUserRep,
  deleteUser,
  getAllNodes,
  deleteNode,
  deleteLibraryEntry,
  getAllLibraryEntries,
  getAllNewsLinks,
  deleteNewsLink,
  getAllThreads,
  deleteThread,
  updateNodeField,
  getAdminStats,
} from "./admin-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocs = []
  mockCounts = []
  countIndex = 0
})

describe("getAllUsers", () => {
  it("returns parsed users from Firestore", async () => {
    mockDocs = [
      {
        id: "u1",
        data: () => ({
          email: "a@b.com",
          displayName: "Alice",
          repPoints: 100,
          isSchoolEmail: false,
          emailVerified: true,
          createdAt: fakeTimestamp,
          onboardingComplete: true,
          country: null,
          background: null,
          interests: [],
          bio: "",
          photoURL: null,
        }),
      },
    ]
    const users = await getAllUsers()
    expect(users).toHaveLength(1)
    expect(users[0]!.displayName).toBe("Alice")
  })

  it("filters out invalid documents", async () => {
    mockDocs = [
      { id: "bad", data: () => ({ invalid: true }) },
    ]
    const users = await getAllUsers()
    expect(users).toHaveLength(0)
  })
})

describe("getAllNodes", () => {
  it("returns parsed nodes", async () => {
    mockDocs = [
      {
        id: "n1",
        data: () => ({
          advancementId: "fusion",
          parentNodeId: null,
          authorId: "u1",
          title: "Test Node",
          description: "Desc",
          status: "theoretical",
          supportCount: 0,
          createdAt: fakeTimestamp,
        }),
      },
    ]
    const nodes = await getAllNodes()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.title).toBe("Test Node")
  })
})

describe("getAllLibraryEntries", () => {
  it("returns parsed library entries", async () => {
    mockDocs = [
      {
        id: "e1",
        data: () => ({
          advancementId: "fusion",
          authorId: "u1",
          title: "Entry",
          content: "Content",
          contentType: "article",
          difficulty: "introductory",
          createdAt: fakeTimestamp,
          updatedAt: fakeTimestamp,
        }),
      },
    ]
    const entries = await getAllLibraryEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe("Entry")
  })
})

describe("getAllNewsLinks", () => {
  it("returns parsed news links", async () => {
    mockDocs = [
      {
        id: "l1",
        data: () => ({
          advancementId: "fusion",
          submitterId: "u1",
          title: "News",
          url: "https://example.com",
          score: 5,
          createdAt: fakeTimestamp,
        }),
      },
    ]
    const links = await getAllNewsLinks()
    expect(links).toHaveLength(1)
    expect(links[0]!.title).toBe("News")
  })
})

describe("getAllThreads", () => {
  it("returns parsed threads", async () => {
    mockDocs = [
      {
        id: "t1",
        data: () => ({
          advancementId: "fusion",
          authorId: "u1",
          authorName: "Alice",
          title: "Thread",
          body: "Body",
          replyCount: 0,
          lastActivityAt: fakeTimestamp,
          createdAt: fakeTimestamp,
        }),
      },
    ]
    const threads = await getAllThreads()
    expect(threads).toHaveLength(1)
    expect(threads[0]!.title).toBe("Thread")
  })
})

describe("admin actions", () => {
  it("updateUserRep calls Cloud Function", async () => {
    await updateUserRep("u1", 500)
    expect(mockCallable).toHaveBeenCalledWith({ uid: "u1", repPoints: 500 })
  })

  it("deleteUser calls Cloud Function", async () => {
    await deleteUser("u1")
    expect(mockCallable).toHaveBeenCalledWith({ uid: "u1" })
  })

  it("deleteNode calls Cloud Function", async () => {
    await deleteNode("n1")
    expect(mockCallable).toHaveBeenCalledWith({ collection: "nodes", docId: "n1" })
  })

  it("deleteLibraryEntry calls Cloud Function", async () => {
    await deleteLibraryEntry("e1")
    expect(mockCallable).toHaveBeenCalledWith({ collection: "libraryEntries", docId: "e1" })
  })

  it("deleteNewsLink calls Cloud Function", async () => {
    await deleteNewsLink("l1")
    expect(mockCallable).toHaveBeenCalledWith({ collection: "newsLinks", docId: "l1" })
  })

  it("deleteThread calls Cloud Function", async () => {
    await deleteThread("t1")
    expect(mockCallable).toHaveBeenCalledWith({ collection: "discussionThreads", docId: "t1" })
  })

  it("updateNodeField calls Cloud Function", async () => {
    await updateNodeField("n1", "status", "proven")
    expect(mockCallable).toHaveBeenCalledWith({ collection: "nodes", docId: "n1", field: "status", value: "proven" })
  })
})

describe("getAdminStats", () => {
  it("returns counts for all collections", async () => {
    mockCounts = [100, 50, 25, 10, 30]
    const stats = await getAdminStats()
    expect(stats).toEqual({
      users: 100,
      nodes: 50,
      libraryEntries: 25,
      newsLinks: 10,
      threads: 30,
    })
  })
})
