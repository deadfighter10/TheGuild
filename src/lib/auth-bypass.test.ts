import { describe, it, beforeAll, afterAll, beforeEach } from "vitest"
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { readFileSync } from "fs"
import { setDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"

let testEnv: RulesTestEnvironment

const RULES = readFileSync("firestore.rules", "utf8")

function contributorUserDoc() {
  return {
    email: "test@example.com",
    displayName: "Test User",
    repPoints: 500,
    isSchoolEmail: false,
    emailVerified: true,
    createdAt: serverTimestamp(),
    onboardingComplete: true,
    country: null,
    background: null,
    interests: [],
    bio: "",
    photoURL: null,
    role: "user",
  }
}

function observerUserDoc() {
  return { ...contributorUserDoc(), repPoints: 50 }
}

async function setupUser(uid: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const adminDb = adminCtx.firestore()
    await setDoc(doc(adminDb, "users", uid), data)
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "test-auth-bypass",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: RULES,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

describe("unauthenticated write rejection", () => {
  it("rejects unauthenticated user profile creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "users", "user-1"), contributorUserDoc()))
  })

  it("rejects unauthenticated node creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "user-1",
      title: "Hack",
      description: "Injected",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated discussion thread creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "discussionThreads", "thread-1"), {
      advancementId: "fusion",
      authorId: "ghost",
      authorName: "Ghost",
      title: "Spam",
      body: "Spam content",
      replyCount: 0,
      lastActivityAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated discussion reply creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "discussionReplies", "reply-1"), {
      threadId: "thread-1",
      authorId: "ghost",
      authorName: "Ghost",
      body: "Spam reply",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated news link creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "newsLinks", "link-1"), {
      advancementId: "fusion",
      submitterId: "ghost",
      title: "Spam Link",
      url: "https://evil.com",
      score: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated vouch creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "vouches", "vouch-1"), {
      voucherId: "ghost",
      voucheeId: "user-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated flag creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "flags", "flag-1"), {
      targetCollection: "nodes",
      targetId: "node-1",
      targetTitle: "Bad Node",
      reporterId: "ghost",
      reporterName: "Ghost",
      reason: "spam",
      details: "",
      status: "pending",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated bookmark creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "bookmarks", "bm-1"), {
      userId: "ghost",
      targetType: "node",
      targetId: "node-1",
      targetTitle: "Bookmark",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects unauthenticated reads on protected collections", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "users", "user-1")))
    await assertFails(getDoc(doc(db, "nodes", "nonexistent")))
    await assertFails(getDoc(doc(db, "vouches", "nonexistent")))
  })
})

describe("wrong-user write rejection", () => {
  it("rejects creating another user's profile", async () => {
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "users", "victim"), contributorUserDoc()))
  })

  it("rejects creating a node with a different authorId", async () => {
    await setupUser("attacker", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "victim",
      title: "Impersonated Node",
      description: "Fake",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects creating a vouch with a different voucherId", async () => {
    await setupUser("attacker", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "vouches", "vouch-1"), {
      voucherId: "victim",
      voucheeId: "someone",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects creating a node support with a different userId", async () => {
    await setupUser("attacker", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodeSupports", "sup-1"), {
      userId: "victim",
      nodeId: "node-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects creating a news vote with a different userId", async () => {
    await setupUser("attacker", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "newsVotes", "vote-1"), {
      userId: "victim",
      linkId: "link-1",
      direction: "up",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects creating a flag with a different reporterId", async () => {
    await setupUser("attacker", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "flags", "flag-1"), {
      targetCollection: "nodes",
      targetId: "node-1",
      targetTitle: "Framed",
      reporterId: "victim",
      reporterName: "Victim",
      reason: "spam",
      details: "",
      status: "pending",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects creating a bookmark for another user", async () => {
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "bookmarks", "bm-1"), {
      userId: "victim",
      targetType: "node",
      targetId: "node-1",
      targetTitle: "Stolen",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects updating another user's profile", async () => {
    await setupUser("victim", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("attacker")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "victim"), {
      displayName: "Hacked",
      bio: "Pwned",
      repPoints: 500,
      emailVerified: true,
      isSchoolEmail: false,
      role: "user",
    }))
  })
})

describe("protected field modification rejection", () => {
  it("rejects modifying own repPoints", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "user-1"), {
      displayName: "Test User",
      bio: "",
      repPoints: 9999,
      emailVerified: true,
      isSchoolEmail: false,
      role: "user",
    }))
  })

  it("rejects modifying own emailVerified", async () => {
    await setupUser("user-1", { ...contributorUserDoc(), emailVerified: false })
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "user-1"), {
      displayName: "Test User",
      bio: "",
      repPoints: 500,
      emailVerified: true,
      isSchoolEmail: false,
      role: "user",
    }))
  })

  it("rejects modifying own isSchoolEmail", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "user-1"), {
      displayName: "Test User",
      bio: "",
      repPoints: 500,
      emailVerified: true,
      isSchoolEmail: true,
      role: "user",
    }))
  })

  it("rejects modifying own role", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "user-1"), {
      displayName: "Test User",
      bio: "",
      repPoints: 500,
      emailVerified: true,
      isSchoolEmail: false,
      role: "admin",
    }))
  })

  it("rejects client-side creation of rep history events", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "users", "user-1", "repHistory", "fake"), {
      userId: "user-1",
      delta: 99999,
      reason: "admin_adjustment",
      sourceId: null,
      sourceDescription: "Self-grant",
      timestamp: serverTimestamp(),
      balanceAfter: 99999,
    }))
  })
})

describe("insufficient rep rejection", () => {
  it("rejects observer creating a node", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "observer-1",
      title: "Observer Node",
      description: "Not enough rep",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects observer creating a vouch", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "vouches", "vouch-1"), {
      voucherId: "observer-1",
      voucheeId: "user-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects observer creating a node support", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodeSupports", "sup-1"), {
      userId: "observer-1",
      nodeId: "node-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects observer creating a news vote", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "newsVotes", "vote-1"), {
      userId: "observer-1",
      linkId: "link-1",
      direction: "up",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects observer creating a discussion thread", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "discussionThreads", "thread-1"), {
      advancementId: "fusion",
      authorId: "observer-1",
      authorName: "Observer",
      title: "Locked out",
      body: "No rep",
      replyCount: 0,
      lastActivityAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects observer creating a discussion reply", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "discussionReplies", "reply-1"), {
      threadId: "thread-1",
      authorId: "observer-1",
      authorName: "Observer",
      body: "No rep reply",
      createdAt: serverTimestamp(),
    }))
  })

  it("rejects non-moderator reading flags", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "flags", "flag-1"), {
        reporterId: "user-1",
        reason: "spam",
        status: "pending",
      })
    })
    await setupUser("contributor-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("contributor-1")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "flags", "flag-1")))
  })

  it("rejects non-admin reading audit log", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "auditLog", "log-1"), {
        actorId: "admin-1",
        action: "test",
      })
    })
    await setupUser("contributor-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("contributor-1")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "auditLog", "log-1")))
  })

  it("rejects non-admin reading page views", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "pageViews", "pv-1"), {
        path: "/test",
        timestamp: serverTimestamp(),
      })
    })
    await setupUser("contributor-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("contributor-1")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "pageViews", "pv-1")))
  })

  it("allows contributor to create node (positive control)", async () => {
    await setupUser("contributor-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("contributor-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "contributor-1",
      title: "Valid Node",
      description: "Has enough rep",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })
})

describe("advancements immutability", () => {
  it("rejects any write to advancements collection", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "advancements", "fake"), {
      name: "Fake Advancement",
      slug: "fake",
    }))
  })

  it("rejects unauthenticated reads of advancements", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "advancements", "fusion"), {
        name: "Nuclear Fusion",
        slug: "fusion",
      })
    })
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "advancements", "fusion")))
  })

  it("allows authenticated reads of advancements", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "advancements", "fusion"), {
        name: "Nuclear Fusion",
        slug: "fusion",
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, "advancements", "fusion")))
  })
})
