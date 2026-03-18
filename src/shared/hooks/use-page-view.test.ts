import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAddDoc = vi.fn((_ref: unknown, _data: unknown) => Promise.resolve())
let mockPathname = "/"
let mockUser: { uid: string } | null = null

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

import { usePageView } from "./use-page-view"

beforeEach(() => {
  vi.clearAllMocks()
  mockPathname = "/"
  mockUser = null
})

describe("usePageView", () => {
  it("does not record page view when user is not authenticated", () => {
    mockUser = null
    mockPathname = "/advancements"

    usePageView()

    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  it("records page view when user is authenticated", () => {
    mockUser = { uid: "user-1" }
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

  it("records the correct path", () => {
    mockUser = { uid: "user-1" }
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
