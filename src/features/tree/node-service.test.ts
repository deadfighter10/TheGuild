import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

const mockDocRef = { id: "new-node-id" }

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
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date("2025-01-01") })),
    increment: vi.fn((n: number) => ({ __increment: n })),
    onSnapshot: vi.fn(),
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

import { createNode, supportNode, setNodeStatus, editNode, getNode, getNodeLineage } from "./node-service"
import { setDoc, updateDoc } from "firebase/firestore"
import { addRateLimitToBatch } from "@/lib/rate-limit"
import { createNotification } from "@/features/notifications/notification-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
})

describe("createNode", () => {
  const validParams = {
    authorId: "user-1",
    authorRep: 200,
    advancementId: "adv-1",
    parentNodeId: null,
    title: "My Idea",
    description: "A description of the idea",
  }

  it("creates a node when validation passes", async () => {
    const result = await createNode(validParams)

    expect(result).toEqual({ success: true, nodeId: "new-node-id" })
    expect(mockBatch.set).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      advancementId: "adv-1",
      authorId: "user-1",
      title: "My Idea",
      description: "A description of the idea",
      status: "theoretical",
      supportCount: 0,
    }))
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("adds rate limit to the batch", async () => {
    await createNode(validParams)

    expect(addRateLimitToBatch).toHaveBeenCalledWith(mockBatch, "user-1", "nodes")
  })

  it("trims title and description", async () => {
    await createNode({ ...validParams, title: "  Spaced  ", description: "  Desc  " })

    expect(mockBatch.set).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      title: "Spaced",
      description: "Desc",
    }))
  })

  it("rejects when rep is too low", async () => {
    const result = await createNode({ ...validParams, authorRep: 50 })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it("rejects empty title", async () => {
    const result = await createNode({ ...validParams, title: "" })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })
})

describe("supportNode", () => {
  function setupNodeDoc(overrides: Record<string, unknown> = {}) {
    mockDocSnapshots["nodes/node-1"] = {
      exists: true,
      id: "node-1",
      data: {
        advancementId: "adv-1",
        parentNodeId: null,
        authorId: "author-1",
        title: "Test Node",
        description: "Desc",
        status: "theoretical",
        supportCount: 3,
        createdAt: fakeTimestamp,
        ...overrides,
      },
    }
  }

  it("supports a node and increments counts", async () => {
    setupNodeDoc()

    const result = await supportNode("user-1", 200, "node-1")

    expect(result).toEqual({ success: true })
    expect(setDoc).toHaveBeenCalled()
    expect(updateDoc).toHaveBeenCalledTimes(2)
  })

  it("rejects when node does not exist", async () => {
    const result = await supportNode("user-1", 200, "node-1")

    expect(result).toEqual({ success: false, reason: "Node not found" })
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("rejects when user has already supported", async () => {
    setupNodeDoc()
    mockDocSnapshots["nodeSupports/user-1_node-1"] = {
      exists: true,
      id: "user-1_node-1",
      data: {},
    }

    const result = await supportNode("user-1", 200, "node-1")

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("sends notification to node author when supporter is different", async () => {
    setupNodeDoc({ authorId: "other-user" })
    mockDocSnapshots["users/user-1"] = {
      exists: true,
      id: "user-1",
      data: { displayName: "Alice" },
    }

    await supportNode("user-1", 200, "node-1")

    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "other-user",
      type: "support",
    }))
  })

  it("does not notify when supporting own node", async () => {
    setupNodeDoc({ authorId: "user-1" })

    await supportNode("user-1", 200, "node-1")

    expect(createNotification).not.toHaveBeenCalled()
  })
})

describe("setNodeStatus", () => {
  it("updates status when moderator has enough rep", async () => {
    const result = await setNodeStatus(3000, "node-1", "proven")

    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalled()
  })

  it("rejects when rep is too low for moderation", async () => {
    const result = await setNodeStatus(100, "node-1", "proven")

    expect(result).toEqual({ success: false, reason: expect.any(String) })
    expect(updateDoc).not.toHaveBeenCalled()
  })
})

describe("editNode", () => {
  function setupNodeDoc(overrides: Record<string, unknown> = {}) {
    mockDocSnapshots["nodes/node-1"] = {
      exists: true,
      id: "node-1",
      data: {
        advancementId: "adv-1",
        parentNodeId: null,
        authorId: "user-1",
        title: "Original Title",
        description: "Original Desc",
        status: "theoretical",
        supportCount: 0,
        createdAt: fakeTimestamp,
        ...overrides,
      },
    }
  }

  it("allows author to edit their own node", async () => {
    setupNodeDoc()

    const result = await editNode({
      userId: "user-1",
      userRep: 200,
      nodeId: "node-1",
      title: "Updated Title",
      description: "Updated Desc",
    })

    expect(result).toEqual({ success: true })
    expect(updateDoc).toHaveBeenCalled()
  })

  it("rejects edit by non-author without moderator rep", async () => {
    setupNodeDoc({ authorId: "other-user" })

    const result = await editNode({
      userId: "user-1",
      userRep: 200,
      nodeId: "node-1",
      title: "Updated",
      description: "Updated",
    })

    expect(result).toEqual({ success: false, reason: expect.any(String) })
  })

  it("rejects when node does not exist", async () => {
    const result = await editNode({
      userId: "user-1",
      userRep: 200,
      nodeId: "node-1",
      title: "Updated",
      description: "Updated",
    })

    expect(result).toEqual({ success: false, reason: "Node not found" })
  })
})

describe("getNode", () => {
  it("returns the node when it exists", async () => {
    mockDocSnapshots["nodes/node-1"] = {
      exists: true,
      id: "node-1",
      data: {
        advancementId: "adv-1",
        parentNodeId: null,
        authorId: "user-1",
        title: "Test Node",
        description: "A description",
        status: "theoretical",
        supportCount: 3,
        createdAt: fakeTimestamp,
      },
    }

    const result = await getNode("node-1")

    expect(result).toEqual(expect.objectContaining({
      id: "node-1",
      title: "Test Node",
      advancementId: "adv-1",
      supportCount: 3,
    }))
  })

  it("returns null when node does not exist", async () => {
    const result = await getNode("nonexistent")

    expect(result).toBeNull()
  })
})

describe("getNodeLineage", () => {
  function setupNode(id: string, parentNodeId: string | null, title: string) {
    mockDocSnapshots[`nodes/${id}`] = {
      exists: true,
      id,
      data: {
        advancementId: "adv-1",
        parentNodeId,
        authorId: "user-1",
        title,
        description: "Desc",
        status: "theoretical",
        supportCount: 0,
        createdAt: fakeTimestamp,
      },
    }
  }

  it("returns single-item array for a root node", async () => {
    setupNode("root-1", null, "Root Idea")

    const lineage = await getNodeLineage("root-1")

    expect(lineage.map((n) => n.id)).toEqual(["root-1"])
  })

  it("returns lineage from root to leaf in order", async () => {
    setupNode("root-1", null, "Root")
    setupNode("mid-1", "root-1", "Middle")
    setupNode("leaf-1", "mid-1", "Leaf")

    const lineage = await getNodeLineage("leaf-1")

    expect(lineage.map((n) => n.id)).toEqual(["root-1", "mid-1", "leaf-1"])
  })

  it("returns empty array when node does not exist", async () => {
    const lineage = await getNodeLineage("nonexistent")

    expect(lineage).toEqual([])
  })
})
