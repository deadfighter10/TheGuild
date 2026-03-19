import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockDocRef = { id: "new-entry-id" }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}
let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 3) {
        const collectionName = args[1] as string
        const docId = args[2] as string
        return { __collection: collectionName, __id: docId }
      }
      return mockDocRef
    }),
    addDoc: vi.fn(async () => mockDocRef),
    getDoc: vi.fn(async (ref: { __collection?: string; __id?: string }) => {
      const key = `${ref.__collection}/${ref.__id}`
      const snap = docSnapshots()[key]
      return {
        exists: () => snap?.exists ?? false,
        id: snap?.id ?? ref.__id ?? "",
        data: () => snap?.data ?? {},
      }
    }),
    getDocs: vi.fn(async () => ({ docs: queryResults() })),
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    serverTimestamp: vi.fn(() => fakeTimestamp),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

import { createLibraryEntry, editLibraryEntry, getEntryVersions } from "./library-service"
import { addDoc, updateDoc } from "firebase/firestore"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = []
})

describe("createLibraryEntry", () => {
  const validParams = {
    authorId: "user-1",
    authorRep: 1500,
    authorRole: "user" as const,
    advancementId: "adv-1",
    title: "Test Entry",
    content: "Some content",
    contentType: "article" as const,
    difficulty: "introductory" as const,
  }

  it("creates an entry when validation passes", async () => {
    const result = await createLibraryEntry(validParams)

    expect(result).toEqual({ success: true, entryId: "new-entry-id" })
    expect(addDoc).toHaveBeenCalled()
  })

  it("rejects when rep is too low", async () => {
    const result = await createLibraryEntry({ ...validParams, authorRep: 100 })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(addDoc).not.toHaveBeenCalled()
  })

  it("rejects empty title", async () => {
    const result = await createLibraryEntry({ ...validParams, title: "" })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("editLibraryEntry", () => {
  function setupEntry(authorId = "user-1") {
    mockDocSnapshots["libraryEntries/entry-1"] = {
      exists: true,
      id: "entry-1",
      data: {
        advancementId: "adv-1",
        authorId,
        title: "Original Title",
        content: "Original content",
        contentType: "article",
        difficulty: "introductory",
        createdAt: fakeTimestamp,
        updatedAt: fakeTimestamp,
      },
    }
  }

  it("updates entry when author edits", async () => {
    setupEntry()

    const result = await editLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user" as const,
      entryId: "entry-1",
      title: "Updated Title",
      content: "Updated content",
      contentType: "article",
      difficulty: "intermediate",
    })

    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalled()
  })

  it("saves a version snapshot before updating", async () => {
    setupEntry()

    await editLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user" as const,
      entryId: "entry-1",
      title: "Updated Title",
      content: "Updated content",
      contentType: "article",
      difficulty: "intermediate",
    })

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entryId: "entry-1",
        title: "Original Title",
        content: "Original content",
        editedBy: "user-1",
      }),
    )
  })

  it("rejects when entry does not exist", async () => {
    const result = await editLibraryEntry({
      userId: "user-1",
      userRep: 1500,
      userRole: "user" as const,
      entryId: "entry-1",
      title: "Updated",
      content: "Updated",
      contentType: "article",
      difficulty: "introductory",
    })

    expect(result).toEqual({ success: false, reason: "Entry not found" })
  })

  it("rejects edit by non-author without moderator rep", async () => {
    setupEntry("other-user")

    const result = await editLibraryEntry({
      userId: "user-1",
      userRep: 200,
      userRole: "user" as const,
      entryId: "entry-1",
      title: "Updated",
      content: "Updated",
      contentType: "article",
      difficulty: "introductory",
    })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })
})

describe("getEntryVersions", () => {
  it("returns versions for an entry", async () => {
    mockQueryResults = [
      {
        id: "ver-1",
        data: () => ({
          entryId: "entry-1",
          title: "Old Title",
          content: "Old content",
          contentType: "article",
          difficulty: "introductory",
          editedBy: "user-1",
          createdAt: fakeTimestamp,
        }),
      },
    ]

    const versions = await getEntryVersions("entry-1")

    expect(versions).toHaveLength(1)
    expect(versions[0]).toEqual(expect.objectContaining({
      id: "ver-1",
      title: "Old Title",
      editedBy: "user-1",
    }))
  })

  it("returns empty array when no versions exist", async () => {
    const versions = await getEntryVersions("entry-1")

    expect(versions).toEqual([])
  })
})
