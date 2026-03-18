import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}
let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  const queryResults = () => mockQueryResults
  return {
    collection: vi.fn(() => ({ __isCollection: true })),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length >= 3) {
        const collectionName = args[1] as string
        const docId = args[2] as string
        return { __collection: collectionName, __id: docId }
      }
      return { id: "new-collab-id" }
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
    getDocs: vi.fn(async () => ({
      empty: queryResults().length === 0,
      docs: queryResults(),
    })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => fakeTimestamp),
    writeBatch: vi.fn(() => mockBatch),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/features/notifications/notification-service", () => ({
  createNotification: vi.fn(async () => {}),
}))

import {
  addCollaborator,
  removeCollaborator,
  getCollaborators,
  isCollaborator,
} from "./collaboration-service"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = []
})

describe("addCollaborator", () => {
  it("creates a collaborator document", async () => {
    await addCollaborator({
      contentId: "node-1",
      contentType: "node",
      contentTitle: "Test Idea",
      userId: "user-2",
      displayName: "Bob",
      addedBy: "author-1",
    })

    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "contentCollaborators", __id: "node-1_user-2" }),
      expect.objectContaining({
        contentId: "node-1",
        contentType: "node",
        userId: "user-2",
        displayName: "Bob",
        addedBy: "author-1",
        addedAt: fakeTimestamp,
      }),
    )
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("does not overwrite existing collaborator", async () => {
    mockDocSnapshots["contentCollaborators/node-1_user-2"] = {
      exists: true,
      id: "node-1_user-2",
      data: { userId: "user-2" },
    }

    await expect(addCollaborator({
      contentId: "node-1",
      contentType: "node",
      contentTitle: "Test Idea",
      userId: "user-2",
      displayName: "Bob",
      addedBy: "author-1",
    })).rejects.toThrow("This user is already a collaborator")
  })

  it("notifies the new collaborator", async () => {
    await addCollaborator({
      contentId: "node-1",
      contentType: "node",
      contentTitle: "Test Idea",
      userId: "user-2",
      displayName: "Bob",
      addedBy: "author-1",
    })

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-2",
    }))
  })
})

describe("removeCollaborator", () => {
  it("deletes the collaborator document", async () => {
    await removeCollaborator("node-1", "user-2")

    expect(mockBatch.delete).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "contentCollaborators", __id: "node-1_user-2" }),
    )
    expect(mockBatch.commit).toHaveBeenCalled()
  })
})

describe("getCollaborators", () => {
  it("returns empty array when no collaborators exist", async () => {
    const result = await getCollaborators("node-1")
    expect(result).toEqual([])
  })

  it("returns collaborator records", async () => {
    mockQueryResults = [
      {
        id: "node-1_user-2",
        data: () => ({
          contentId: "node-1",
          contentType: "node",
          userId: "user-2",
          displayName: "Bob",
          addedBy: "author-1",
          addedAt: fakeTimestamp,
        }),
      },
    ]

    const result = await getCollaborators("node-1")
    expect(result).toHaveLength(1)
    expect(result[0]?.userId).toBe("user-2")
    expect(result[0]?.displayName).toBe("Bob")
  })
})

describe("isCollaborator", () => {
  it("returns false when user is not a collaborator", async () => {
    const result = await isCollaborator("node-1", "user-2")
    expect(result).toBe(false)
  })

  it("returns true when user is a collaborator", async () => {
    mockDocSnapshots["contentCollaborators/node-1_user-2"] = {
      exists: true,
      id: "node-1_user-2",
      data: { userId: "user-2" },
    }

    const result = await isCollaborator("node-1", "user-2")
    expect(result).toBe(true)
  })
})
