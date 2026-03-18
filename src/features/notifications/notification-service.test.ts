import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

const mockBatch = {
  update: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}

let mockQueryResults: Array<{ id: string; data: (() => Record<string, unknown>) | Record<string, unknown>; ref: object }> = []

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __isCollection: true })),
  doc: vi.fn((...args: unknown[]) => {
    if (args.length === 3) {
      return { __collection: args[1], __id: args[2] }
    }
    return { __isDoc: true }
  }),
  addDoc: vi.fn(async () => ({ id: "new-notif-id" })),
  getDocs: vi.fn(async () => ({
    docs: mockQueryResults,
    size: mockQueryResults.length,
  })),
  updateDoc: vi.fn(async () => {}),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => fakeTimestamp),
  writeBatch: vi.fn(() => mockBatch),
  onSnapshot: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "./notification-service"
import { addDoc, updateDoc, getDocs } from "firebase/firestore"

beforeEach(() => {
  vi.clearAllMocks()
  mockQueryResults = []
})

describe("createNotification", () => {
  it("creates a notification document in Firestore", async () => {
    await createNotification({
      userId: "user-1",
      type: "reply",
      message: "Someone replied to your thread",
      link: "/advancements/fusion/discussions/thread-1",
    })

    expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
      userId: "user-1",
      type: "reply",
      message: "Someone replied to your thread",
      link: "/advancements/fusion/discussions/thread-1",
      read: false,
      createdAt: fakeTimestamp,
    })
  })
})

describe("getNotifications", () => {
  it("returns parsed notifications for a user", async () => {
    mockQueryResults = [
      {
        id: "notif-1",
        data: () => ({
          userId: "user-1",
          type: "support",
          message: "Your idea was supported",
          link: "/advancements/fusion/tree/node-1",
          read: false,
          createdAt: fakeTimestamp,
        }),
        ref: {},
      },
    ]

    const result = await getNotifications("user-1")
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("notif-1")
    expect(result[0]?.type).toBe("support")
    expect(result[0]?.read).toBe(false)
  })

  it("filters out invalid notification documents", async () => {
    mockQueryResults = [
      {
        id: "notif-bad",
        data: () => ({ userId: "user-1" }),
        ref: {},
      },
    ]

    const result = await getNotifications("user-1")
    expect(result).toHaveLength(0)
  })
})

describe("markAsRead", () => {
  it("updates the read field to true", async () => {
    await markAsRead("notif-1")
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: "notifications", __id: "notif-1" }),
      { read: true },
    )
  })
})

describe("markAllAsRead", () => {
  it("batch updates all unread notifications for a user", async () => {
    const ref1 = { __ref: "notif-1" }
    const ref2 = { __ref: "notif-2" }
    mockQueryResults = [
      { id: "notif-1", data: {}, ref: ref1 },
      { id: "notif-2", data: {}, ref: ref2 },
    ]

    await markAllAsRead("user-1")

    expect(getDocs).toHaveBeenCalled()
    expect(mockBatch.update).toHaveBeenCalledTimes(2)
    expect(mockBatch.update).toHaveBeenCalledWith(ref1, { read: true })
    expect(mockBatch.update).toHaveBeenCalledWith(ref2, { read: true })
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it("does nothing when no unread notifications exist", async () => {
    mockQueryResults = []

    await markAllAsRead("user-1")

    expect(mockBatch.update).not.toHaveBeenCalled()
    expect(mockBatch.commit).toHaveBeenCalled()
  })
})
