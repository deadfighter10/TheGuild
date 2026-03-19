import { describe, it, expect, vi, beforeEach } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}
let mockQueryResults: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {}

const mockTransaction = {
  get: vi.fn(async (ref: { __collection?: string; __id?: string }) => {
    const key = `${ref.__collection}/${ref.__id}`
    const snap = mockDocSnapshots[key]
    return {
      exists: () => snap?.exists ?? false,
      id: snap?.id ?? ref.__id ?? "",
      data: () => snap?.data ?? {},
    }
  }),
  set: vi.fn(),
  update: vi.fn(),
}

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __isCollection: true })),
  doc: vi.fn((...args: unknown[]) => {
    if (args.length === 1 || (args.length === 2 && typeof args[0] === "object")) {
      return { __isDoc: true, id: "new-vouch-id" }
    }
    return { __collection: args[1], __id: args[2] }
  }),
  getDoc: vi.fn(async (ref: { __collection?: string; __id?: string }) => {
    const key = `${ref.__collection}/${ref.__id}`
    const snap = mockDocSnapshots[key]
    return {
      exists: () => snap?.exists ?? false,
      id: snap?.id ?? ref.__id ?? "",
      data: () => snap?.data ?? {},
    }
  }),
  getDocs: vi.fn(async () => {
    const key = Object.keys(mockQueryResults)[0] ?? "default"
    const results = mockQueryResults[key] ?? []
    delete mockQueryResults[key]
    return {
      empty: results.length === 0,
      docs: results.map((r) => ({
        id: r.id,
        data: () => r.data,
      })),
    }
  }),
  query: vi.fn((_ref, ...constraints: unknown[]) => {
    return { __query: true, constraints }
  }),
  where: vi.fn((field: string, _op: string, value: unknown) => ({ __where: field, __value: value })),
  runTransaction: vi.fn(async (_db: unknown, fn: (transaction: typeof mockTransaction) => Promise<void>) => {
    await fn(mockTransaction)
  }),
  serverTimestamp: vi.fn(() => fakeTimestamp),
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))
vi.mock("@/features/notifications/notification-service", () => ({
  createNotification: vi.fn(async () => {}),
}))

import {
  vouchForUser,
  searchUserByEmail,
  hasBeenVouched,
  hasVouchedForSomeone,
} from "./vouch-service"
import { getDocs } from "firebase/firestore"

type MockSnapshot = Awaited<ReturnType<typeof getDocs>>

beforeEach(() => {
  vi.clearAllMocks()
  mockDocSnapshots = {}
  mockQueryResults = {}
})

describe("vouchForUser", () => {
  it("fails when voucher tries to vouch for themselves", async () => {
    const result = await vouchForUser("user-1", "user-1", 100, "user")
    expect(result).toEqual({ valid: false, reason: "You cannot vouch for yourself" })
  })

  it("fails when voucher does not have enough Rep", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ empty: true, docs: [] } as unknown as MockSnapshot)
      .mockResolvedValueOnce({ empty: true, docs: [] } as unknown as MockSnapshot)

    const result = await vouchForUser("user-1", "user-2", 50, "user")
    expect(result).toEqual({
      valid: false,
      reason: "You need at least 100 Rep to vouch for someone",
    })
  })

  it("succeeds with valid vouch request", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ empty: true, docs: [] } as unknown as MockSnapshot)
      .mockResolvedValueOnce({ empty: true, docs: [] } as unknown as MockSnapshot)

    mockDocSnapshots["users/user-2"] = {
      exists: true,
      id: "user-2",
      data: { repPoints: 0, displayName: "Bob" },
    }
    mockDocSnapshots["users/user-1"] = {
      exists: true,
      id: "user-1",
      data: { displayName: "Alice" },
    }

    const result = await vouchForUser("user-1", "user-2", 100, "user")
    expect(result).toEqual({ valid: true })
    expect(mockTransaction.set).toHaveBeenCalled()
    expect(mockTransaction.update).toHaveBeenCalled()
  })
})

describe("searchUserByEmail", () => {
  it("returns null when no user found", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as unknown as MockSnapshot)

    const result = await searchUserByEmail("nobody@example.com", "user-1")
    expect(result).toBeNull()
  })

  it("returns null when found user is the current user", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: "user-1",
        data: () => ({ displayName: "Alice", email: "alice@example.com" }),
      }],
    } as unknown as MockSnapshot)

    const result = await searchUserByEmail("alice@example.com", "user-1")
    expect(result).toBeNull()
  })

  it("returns user data when found", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: "user-2",
        data: () => ({ displayName: "Bob", email: "bob@example.com" }),
      }],
    } as unknown as MockSnapshot)

    const result = await searchUserByEmail("bob@example.com", "user-1")
    expect(result).toEqual({
      uid: "user-2",
      displayName: "Bob",
      email: "bob@example.com",
    })
  })
})

describe("hasBeenVouched", () => {
  it("returns false when user has not been vouched", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as unknown as MockSnapshot)

    expect(await hasBeenVouched("user-1")).toBe(false)
  })

  it("returns true when user has been vouched", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{ id: "vouch-1" }],
    } as unknown as MockSnapshot)

    expect(await hasBeenVouched("user-1")).toBe(true)
  })
})

describe("hasVouchedForSomeone", () => {
  it("returns false when user has not vouched for anyone", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as unknown as MockSnapshot)

    expect(await hasVouchedForSomeone("user-1")).toBe(false)
  })

  it("returns true when user has vouched for someone", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{ id: "vouch-1" }],
    } as unknown as MockSnapshot)

    expect(await hasVouchedForSomeone("user-1")).toBe(true)
  })
})
