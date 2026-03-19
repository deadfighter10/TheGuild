import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01T00:00:00Z") }

let mockQueryResults: readonly { id: string; data: () => Record<string, unknown> }[] = []
const mockAddDoc = vi.fn(async (..._args: unknown[]) => ({ id: "new-event-id" }))

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, ...pathSegments: string[]) => ({
    __path: pathSegments.join("/"),
  })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDocs: vi.fn(async () => ({
    empty: mockQueryResults.length === 0,
    docs: mockQueryResults,
  })),
  query: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn((...args: unknown[]) => ({ __orderBy: args })),
  limit: vi.fn((n: number) => ({ __limit: n })),
  serverTimestamp: vi.fn(() => fakeTimestamp),
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

import { addRepEvent, getRepHistory } from "./rep-history-service"

beforeEach(() => {
  vi.clearAllMocks()
  mockQueryResults = []
})

describe("addRepEvent", () => {
  it("writes a rep event to the repHistory subcollection", async () => {
    await addRepEvent({
      userId: "user-1",
      delta: 10,
      reason: "node_created",
      sourceId: "node-abc",
      sourceDescription: "Created node 'Telomere Extension'",
      balanceAfter: 110,
    })

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __path: "users/user-1/repHistory" }),
      expect.objectContaining({
        userId: "user-1",
        delta: 10,
        reason: "node_created",
        sourceId: "node-abc",
        sourceDescription: "Created node 'Telomere Extension'",
        balanceAfter: 110,
        timestamp: fakeTimestamp,
      }),
    )
  })

  it("writes a negative delta event", async () => {
    await addRepEvent({
      userId: "user-1",
      delta: -100,
      reason: "moderation_penalty",
      sourceId: "flag-1",
      sourceDescription: "Spam penalty",
      balanceAfter: 50,
    })

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        delta: -100,
        reason: "moderation_penalty",
        balanceAfter: 50,
      }),
    )
  })

  it("writes an event with null sourceId", async () => {
    await addRepEvent({
      userId: "user-1",
      delta: 33,
      reason: "onboarding_action",
      sourceId: null,
      sourceDescription: "Completed tutorial",
      balanceAfter: 33,
    })

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceId: null,
      }),
    )
  })
})

describe("getRepHistory", () => {
  it("returns parsed rep events for a user", async () => {
    mockQueryResults = [
      {
        id: "event-1",
        data: () => ({
          userId: "user-1",
          delta: 10,
          reason: "node_created",
          sourceId: "node-abc",
          sourceDescription: "Created node",
          timestamp: fakeTimestamp,
          balanceAfter: 110,
        }),
      },
      {
        id: "event-2",
        data: () => ({
          userId: "user-1",
          delta: -100,
          reason: "moderation_penalty",
          sourceId: "flag-1",
          sourceDescription: "Spam",
          timestamp: fakeTimestamp,
          balanceAfter: 10,
        }),
      },
    ]

    const events = await getRepHistory("user-1")

    expect(events).toHaveLength(2)
    expect(events[0]!.id).toBe("event-1")
    expect(events[0]!.delta).toBe(10)
    expect(events[0]!.reason).toBe("node_created")
    expect(events[1]!.id).toBe("event-2")
    expect(events[1]!.delta).toBe(-100)
  })

  it("returns empty array when no events exist", async () => {
    const events = await getRepHistory("user-1")

    expect(events).toEqual([])
  })

  it("filters out invalid documents", async () => {
    mockQueryResults = [
      {
        id: "event-1",
        data: () => ({
          userId: "user-1",
          delta: 10,
          reason: "node_created",
          sourceId: null,
          sourceDescription: "Created node",
          timestamp: fakeTimestamp,
          balanceAfter: 110,
        }),
      },
      {
        id: "event-bad",
        data: () => ({
          userId: "user-1",
          delta: "not-a-number",
        }),
      },
    ]

    const events = await getRepHistory("user-1")

    expect(events).toHaveLength(1)
    expect(events[0]!.id).toBe("event-1")
  })

  it("respects the limit parameter", async () => {
    mockQueryResults = [
      {
        id: "event-1",
        data: () => ({
          userId: "user-1",
          delta: 10,
          reason: "node_created",
          sourceId: null,
          sourceDescription: "test",
          timestamp: fakeTimestamp,
          balanceAfter: 10,
        }),
      },
    ]

    await getRepHistory("user-1", 5)

    const { limit } = await import("firebase/firestore")
    expect(limit).toHaveBeenCalledWith(5)
  })
})
