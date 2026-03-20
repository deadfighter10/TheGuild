import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockSetCustomUserClaims,
  mockDeleteUser,
  mockRevokeRefreshTokens,
  mockDocGet,
  mockDocUpdate,
  mockDocDelete,
  mockCountGet,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSetCustomUserClaims: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockRevokeRefreshTokens: vi.fn(),
  mockDocGet: vi.fn(),
  mockDocUpdate: vi.fn(),
  mockDocDelete: vi.fn(),
  mockCountGet: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    getUser: mockGetUser,
    setCustomUserClaims: mockSetCustomUserClaims,
    deleteUser: mockDeleteUser,
    revokeRefreshTokens: mockRevokeRefreshTokens,
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    doc: () => ({
      get: mockDocGet,
      update: mockDocUpdate,
      set: vi.fn(),
      delete: mockDocDelete,
    }),
    collection: () => ({
      where: () => ({
        where: () => ({
          count: () => ({
            get: mockCountGet,
          }),
          orderBy: () => ({
            limit: () => ({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
        }),
      }),
    }),
  }),
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
  },
  Timestamp: {
    fromDate: (d: Date) => d,
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  onCall: (handler: (request: unknown) => Promise<unknown>) => handler,
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: vi.fn(() => vi.fn()),
}));

import * as functions from "./index";

type CallableFn = (request: unknown) => Promise<unknown>;

function getFunction(name: string): CallableFn {
  return (functions as Record<string, CallableFn>)[name];
}

function expectHttpsError(error: unknown, code: string) {
  expect(error).toBeInstanceOf(Error);
  expect((error as { code: string }).code).toBe(code);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("claimSchoolEmailBonus", () => {
  const fn = getFunction("claimSchoolEmailBonus");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws failed-precondition when email not verified", async () => {
    mockGetUser.mockResolvedValue({ emailVerified: false });
    try {
      await fn({ auth: { uid: "u1" }, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "failed-precondition");
    }
  });

  it("throws not-found when user profile missing", async () => {
    mockGetUser.mockResolvedValue({ emailVerified: true });
    mockDocGet.mockResolvedValue({ data: () => null });
    try {
      await fn({ auth: { uid: "u1" }, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "not-found");
    }
  });
});

describe("setAdminClaim", () => {
  const fn = getFunction("setAdminClaim");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when uid missing", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument when admin not boolean", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { uid: "u1", admin: "yes" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws permission-denied for non-admin caller", async () => {
    mockGetUser.mockResolvedValue({ customClaims: null });
    mockDocGet.mockResolvedValue({ data: () => ({ role: "user", repPoints: 100 }) });
    try {
      await fn({ auth: { uid: "regular" }, data: { uid: "u1", admin: true } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "permission-denied");
    }
  });

  it("throws invalid-argument when removing own admin", async () => {
    mockGetUser.mockResolvedValue({ customClaims: { admin: true } });
    try {
      await fn({ auth: { uid: "a1" }, data: { uid: "a1", admin: false } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });
});

describe("adminUpdateUserRep", () => {
  const fn = getFunction("adminUpdateUserRep");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when uid missing", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { repPoints: 100 } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for non-integer repPoints", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { uid: "u1", repPoints: 1.5 } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for string repPoints", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { uid: "u1", repPoints: "100" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });
});

describe("adminDeleteContent", () => {
  const fn = getFunction("adminDeleteContent");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when collection missing", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { docId: "d1" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument when docId missing", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { collection: "nodes" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for disallowed collection", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { collection: "users", docId: "d1" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });
});

describe("adminUpdateContent", () => {
  const fn = getFunction("adminUpdateContent");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when field missing", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { collection: "nodes", docId: "n1", value: "proven" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for disallowed field", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { collection: "nodes", docId: "n1", field: "authorId", value: "x" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for invalid status value", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { collection: "nodes", docId: "n1", field: "status", value: "bad" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for non-integer repPoints", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: { collection: "users", docId: "u1", field: "repPoints", value: "abc" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });
});

describe("checkContentRateLimit", () => {
  const fn = getFunction("checkContentRateLimit");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when collection missing", async () => {
    try {
      await fn({ auth: { uid: "u1" }, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("returns allowed true when under limit", async () => {
    mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
    const result = await fn({ auth: { uid: "u1" }, data: { collection: "nodes" } });
    expect(result).toEqual({ allowed: true });
  });

  it("throws resource-exhausted when over limit", async () => {
    mockCountGet.mockResolvedValue({ data: () => ({ count: 999 }) });
    try {
      await fn({ auth: { uid: "u1" }, data: { collection: "nodes" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "resource-exhausted");
    }
  });
});

describe("migrateAdminStatus", () => {
  const fn = getFunction("migrateAdminStatus");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("returns isAdmin false for non-admin", async () => {
    mockGetUser.mockResolvedValue({ customClaims: null });
    mockDocGet.mockResolvedValue({ data: () => ({ role: "user", repPoints: 100 }) });
    const result = await fn({ auth: { uid: "u1" }, data: {} });
    expect(result).toEqual({ isAdmin: false, migrated: false });
  });
});

describe("revokeAllSessions", () => {
  const fn = getFunction("revokeAllSessions");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("succeeds for authenticated user", async () => {
    mockRevokeRefreshTokens.mockResolvedValue(undefined);
    const result = await fn({ auth: { uid: "u1" }, data: {} });
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ success: true });
  });
});

describe("deleteUserAccount", () => {
  const fn = getFunction("deleteUserAccount");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when uid missing", async () => {
    try {
      await fn({ auth: { uid: "a" }, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument when deleting own account", async () => {
    try {
      await fn({ auth: { uid: "a1" }, data: { uid: "a1" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });
});

describe("updateDigestPreferences", () => {
  const fn = getFunction("updateDigestPreferences");

  it("throws unauthenticated when no auth", async () => {
    try {
      await fn({ auth: null, data: {} });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "unauthenticated");
    }
  });

  it("throws invalid-argument when enabled not boolean", async () => {
    try {
      await fn({ auth: { uid: "u1" }, data: { enabled: "yes", period: "daily" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws invalid-argument for invalid period", async () => {
    try {
      await fn({ auth: { uid: "u1" }, data: { enabled: true, period: "monthly" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "invalid-argument");
    }
  });

  it("throws not-found when user profile missing", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    try {
      await fn({ auth: { uid: "u1" }, data: { enabled: true, period: "daily" } });
      expect.fail("should throw");
    } catch (e) {
      expectHttpsError(e, "not-found");
    }
  });
});
