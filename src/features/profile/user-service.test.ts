import { describe, it, expect, vi } from "vitest"

const fakeTimestamp = { toDate: () => new Date("2025-01-01") }

let mockDocSnapshots: Record<string, { exists: boolean; id: string; data: Record<string, unknown> }> = {}

vi.mock("firebase/firestore", () => {
  const docSnapshots = () => mockDocSnapshots
  return {
    doc: vi.fn((_db: unknown, _col: string, id: string) => ({ __id: id })),
    getDoc: vi.fn(async (ref: { __id: string }) => {
      const snap = docSnapshots()[ref.__id]
      return {
        exists: () => snap?.exists ?? false,
        id: snap?.id ?? ref.__id,
        data: () => snap?.data ?? {},
      }
    }),
  }
})

vi.mock("@/lib/firebase", () => ({ db: {} }))

import { getUserById } from "./user-service"

describe("getUserById", () => {
  it("returns a GuildUser when the document exists", async () => {
    mockDocSnapshots = {
      "user-1": {
        exists: true,
        id: "user-1",
        data: {
          email: "test@example.com",
          displayName: "Test User",
          repPoints: 150,
          isSchoolEmail: false,
          emailVerified: true,
          createdAt: fakeTimestamp,
          onboardingComplete: true,
          country: "US",
          background: null,
          interests: ["fusion"],
          bio: "Hello",
          photoURL: null,
        },
      },
    }
    const user = await getUserById("user-1")
    expect(user).not.toBeNull()
    expect(user?.uid).toBe("user-1")
    expect(user?.displayName).toBe("Test User")
    expect(user?.repPoints).toBe(150)
  })

  it("returns null when the document does not exist", async () => {
    mockDocSnapshots = {}
    const user = await getUserById("nonexistent")
    expect(user).toBeNull()
  })
})
