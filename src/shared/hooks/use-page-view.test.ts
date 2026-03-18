import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAddDoc = vi.fn((_ref: unknown, _data: unknown) => Promise.resolve())
let mockPathname = "/"
let mockUser: { uid: string } | null = null
let mockStorage: Record<string, string> = {}

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}))

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ __isCollection: true })),
  addDoc: (ref: unknown, data: unknown) => mockAddDoc(ref, data),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}))

vi.mock("@/lib/firebase", () => ({ db: {} }))

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ firebaseUser: mockUser }),
}))

vi.mock("react", async () => {
  const actual = await vi.importActual("react")
  let refValue: string | null = null
  return {
    ...actual,
    useEffect: (fn: () => void) => fn(),
    useRef: () => ({
      get current() { return refValue },
      set current(v: string | null) { refValue = v },
    }),
  }
})

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value },
    removeItem: (key: string) => { delete mockStorage[key] },
  },
  writable: true,
})

import { usePageView, isWithinPageViewLimit } from "./use-page-view"

beforeEach(() => {
  vi.clearAllMocks()
  mockPathname = "/"
  mockUser = null
  mockStorage = {}
})

describe("usePageView", () => {
  it("records page view for anonymous visitors", () => {
    mockUser = null
    mockPathname = "/advancements"

    usePageView()

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: "/advancements",
        timestamp: { __serverTimestamp: true },
      }),
    )
  })

  it("records page view for authenticated users", () => {
    mockUser = { uid: "user-1" }
    mockPathname = "/library"

    usePageView()

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: "/library",
        timestamp: { __serverTimestamp: true },
      }),
    )
  })

  it("records the correct path", () => {
    mockPathname = "/advancements/fusion"

    usePageView()

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: "/advancements/fusion" }),
    )
  })

  it("does not include user ID in the page view data", () => {
    mockUser = { uid: "user-1" }
    mockPathname = "/profile"

    usePageView()

    const callArgs = (mockAddDoc.mock.calls[0] as unknown[])?.[1] as Record<string, unknown>
    expect(callArgs).not.toHaveProperty("userId")
    expect(callArgs).not.toHaveProperty("uid")
  })
})

describe("isWithinPageViewLimit", () => {
  it("allows the first page view", () => {
    expect(isWithinPageViewLimit([], Date.now())).toBe(true)
  })

  it("allows views under the limit", () => {
    const now = Date.now()
    const timestamps = Array.from({ length: 50 }, (_, i) => now - i * 1000)
    expect(isWithinPageViewLimit(timestamps, now)).toBe(true)
  })

  it("blocks views at or over the hourly limit", () => {
    const now = Date.now()
    const timestamps = Array.from({ length: 120 }, (_, i) => now - i * 1000)
    expect(isWithinPageViewLimit(timestamps, now)).toBe(false)
  })

  it("does not count timestamps older than 1 hour", () => {
    const now = Date.now()
    const oldTimestamps = Array.from({ length: 120 }, (_, i) => now - 3600001 - i * 1000)
    expect(isWithinPageViewLimit(oldTimestamps, now)).toBe(true)
  })

  it("mixes old and recent timestamps correctly", () => {
    const now = Date.now()
    const recent = Array.from({ length: 50 }, (_, i) => now - i * 1000)
    const old = Array.from({ length: 100 }, (_, i) => now - 3600001 - i * 1000)
    expect(isWithinPageViewLimit([...recent, ...old], now)).toBe(true)
  })
})
