import { describe, it, beforeAll, afterAll, beforeEach } from "vitest"
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { readFileSync } from "fs"
import { setDoc, doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore"

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

function moderatorUserDoc() {
  return { ...contributorUserDoc(), repPoints: 3000 }
}

function adminUserDoc() {
  return { ...contributorUserDoc(), repPoints: -1 }
}

async function setupUser(uid: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
    const adminDb = adminCtx.firestore()
    await setDoc(doc(adminDb, "users", uid), data)
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "test-guild-rules",
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

describe("users collection", () => {
  it("allows authenticated users to read any user", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("reader")
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, "users", "user-1")))
  })

  it("denies unauthenticated reads", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "users", "user-1")))
  })

  it("allows users to create their own profile", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "users", "user-1"), contributorUserDoc()))
  })

  it("denies creating another user's profile", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "users", "user-2"), contributorUserDoc()))
  })

  it("denies users from changing their own repPoints", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "user-1"), { repPoints: 9999 }))
  })

  it("allows users to update their own displayName and bio", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(updateDoc(doc(db, "users", "user-1"), {
      displayName: "New Name",
      bio: "New bio",
      repPoints: 500,
      emailVerified: true,
      isSchoolEmail: false,
      role: "user",
    }))
  })

  it("denies deleting user docs", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(deleteDoc(doc(db, "users", "user-1")))
  })

  it("enforces displayName length limit", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    const longName = "a".repeat(51)
    await assertFails(setDoc(doc(db, "users", "user-1"), { ...contributorUserDoc(), displayName: longName }))
  })
})

describe("nodes collection", () => {
  it("allows contributors to create nodes with their own authorId", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "user-1",
      title: "Test Node",
      description: "A test idea",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("denies observers from creating nodes", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "observer-1",
      title: "Test Node",
      description: "A test idea",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("denies creating nodes with a different authorId", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "someone-else",
      title: "Test Node",
      description: "A test idea",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("enforces title length limit", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "nodes", "node-1"), {
      advancementId: "fusion",
      parentNodeId: null,
      authorId: "user-1",
      title: "a".repeat(201),
      description: "A test idea",
      status: "theoretical",
      supportCount: 0,
      createdAt: serverTimestamp(),
    }))
  })

  it("allows author to update their own node", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "nodes", "node-1"), {
        advancementId: "fusion",
        parentNodeId: null,
        authorId: "user-1",
        title: "Test Node",
        description: "A test idea",
        status: "theoretical",
        supportCount: 0,
      })
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(updateDoc(doc(db, "nodes", "node-1"), { title: "Updated" }))
  })

  it("denies non-author non-moderator from updating a node", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "nodes", "node-1"), {
        advancementId: "fusion",
        parentNodeId: null,
        authorId: "user-1",
        title: "Test Node",
        description: "A test idea",
        status: "theoretical",
        supportCount: 0,
      })
    })
    await setupUser("user-2", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-2")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "nodes", "node-1"), { title: "Hacked" }))
  })

  it("denies deleting nodes", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "nodes", "node-1"), {
        authorId: "user-1",
        title: "Test",
      })
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(deleteDoc(doc(db, "nodes", "node-1")))
  })
})

describe("discussionThreads collection", () => {
  it("allows contributors to create threads", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "discussionThreads", "thread-1"), {
      advancementId: "fusion",
      authorId: "user-1",
      authorName: "Test User",
      title: "Discussion topic",
      body: "Let's discuss this",
      replyCount: 0,
      lastActivityAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }))
  })

  it("allows author to delete their own thread", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "discussionThreads", "thread-1"), {
        authorId: "user-1",
        title: "Thread",
        body: "Body",
      })
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(deleteDoc(doc(db, "discussionThreads", "thread-1")))
  })

  it("denies non-author non-moderator from deleting a thread", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "discussionThreads", "thread-1"), {
        authorId: "user-1",
        title: "Thread",
        body: "Body",
      })
    })
    await setupUser("user-2", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-2")
    const db = ctx.firestore()
    await assertFails(deleteDoc(doc(db, "discussionThreads", "thread-1")))
  })
})

describe("flags collection", () => {
  it("allows authenticated users to create flags with their own reporterId", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "flags", "flag-1"), {
      targetCollection: "nodes",
      targetId: "node-1",
      targetTitle: "Bad Node",
      reporterId: "user-1",
      reporterName: "Test User",
      reason: "spam",
      details: "",
      status: "pending",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: serverTimestamp(),
    }))
  })

  it("denies flag reads for non-moderators", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "flags", "flag-1"), {
        reporterId: "user-1",
        reason: "spam",
        status: "pending",
      })
    })
    await setupUser("user-2", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-2")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "flags", "flag-1")))
  })

  it("allows moderators to read flags", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "flags", "flag-1"), {
        reporterId: "user-1",
        reason: "spam",
        status: "pending",
      })
    })
    await setupUser("mod-1", moderatorUserDoc())
    const ctx = testEnv.authenticatedContext("mod-1")
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, "flags", "flag-1")))
  })
})

describe("bookmarks collection", () => {
  it("allows users to create their own bookmarks", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "bookmarks", "bm-1"), {
      userId: "user-1",
      targetType: "node",
      targetId: "node-1",
      targetTitle: "My Bookmark",
      createdAt: serverTimestamp(),
    }))
  })

  it("denies creating bookmarks for another user", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "bookmarks", "bm-1"), {
      userId: "user-2",
      targetType: "node",
      targetId: "node-1",
      targetTitle: "Stolen Bookmark",
      createdAt: serverTimestamp(),
    }))
  })

  it("allows users to delete their own bookmarks", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "bookmarks", "bm-1"), {
        userId: "user-1",
        targetType: "node",
        targetId: "node-1",
        targetTitle: "My Bookmark",
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(deleteDoc(doc(db, "bookmarks", "bm-1")))
  })

  it("denies reading another user's bookmarks", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "bookmarks", "bm-1"), {
        userId: "user-1",
        targetType: "node",
        targetId: "node-1",
        targetTitle: "My Bookmark",
      })
    })
    const ctx = testEnv.authenticatedContext("user-2")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "bookmarks", "bm-1")))
  })
})

describe("notifications collection", () => {
  it("allows users to read their own notifications", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "notifications", "notif-1"), {
        userId: "user-1",
        type: "reply",
        message: "Someone replied",
        link: "/discussions",
        read: false,
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, "notifications", "notif-1")))
  })

  it("denies reading another user's notifications", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "notifications", "notif-1"), {
        userId: "user-1",
        type: "reply",
        message: "Someone replied",
        link: "/discussions",
        read: false,
      })
    })
    const ctx = testEnv.authenticatedContext("user-2")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "notifications", "notif-1")))
  })

  it("allows creating notifications with valid type and link", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "notifications", "notif-new"), {
      userId: "user-2",
      type: "reply",
      message: "Someone replied",
      link: "/discussions",
      read: false,
      createdAt: serverTimestamp(),
    }))
  })

  it("denies creating notifications with invalid type (S21)", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "notifications", "notif-bad"), {
      userId: "user-2",
      type: "hacked",
      message: "Fake notification",
      link: "/somewhere",
      read: false,
      createdAt: serverTimestamp(),
    }))
  })

  it("denies creating notifications with link not starting with / (S21)", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "notifications", "notif-bad"), {
      userId: "user-2",
      type: "reply",
      message: "Click here",
      link: "https://evil.com",
      read: false,
      createdAt: serverTimestamp(),
    }))
  })

  it("denies deleting notifications", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "notifications", "notif-1"), {
        userId: "user-1",
        type: "reply",
        message: "Someone replied",
        link: "/discussions",
        read: false,
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(deleteDoc(doc(db, "notifications", "notif-1")))
  })
})

describe("auditLog collection", () => {
  it("denies non-admin reads", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "auditLog", "log-1"), {
        actorId: "admin-1",
        action: "delete_user",
      })
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "auditLog", "log-1")))
  })

  it("allows admin (rep=-1) to read audit log", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "auditLog", "log-1"), {
        actorId: "admin-1",
        action: "delete_user",
      })
    })
    await setupUser("admin-1", adminUserDoc())
    const ctx = testEnv.authenticatedContext("admin-1")
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, "auditLog", "log-1")))
  })
})

describe("libraryEntries collection", () => {
  it("denies contributors with <1500 rep from creating entries", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "libraryEntries", "entry-1"), {
      advancementId: "fusion",
      authorId: "user-1",
      title: "Test Entry",
      content: "Content here",
      contentType: "article",
      difficulty: "introductory",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  })

  it("allows users with 1500+ rep to create entries", async () => {
    await setupUser("scholar-1", { ...contributorUserDoc(), repPoints: 1500 })
    const ctx = testEnv.authenticatedContext("scholar-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "libraryEntries", "entry-1"), {
      advancementId: "fusion",
      authorId: "scholar-1",
      title: "Test Entry",
      content: "Content here",
      contentType: "article",
      difficulty: "introductory",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  })

  it("allows admin to create entries regardless of rep", async () => {
    await setupUser("admin-1", adminUserDoc())
    const ctx = testEnv.authenticatedContext("admin-1")
    const db = ctx.firestore()
    await assertSucceeds(setDoc(doc(db, "libraryEntries", "entry-1"), {
      advancementId: "fusion",
      authorId: "admin-1",
      title: "Admin Entry",
      content: "Content",
      contentType: "article",
      difficulty: "introductory",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  })
})

describe("repHistory subcollection", () => {
  async function seedRepEvent(userId: string, eventId: string) {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      const adminDb = adminCtx.firestore()
      await setDoc(doc(adminDb, "users", userId, "repHistory", eventId), {
        userId,
        delta: 10,
        reason: "node_created",
        sourceId: "node-1",
        sourceDescription: "Created a node",
        timestamp: serverTimestamp(),
        balanceAfter: 110,
      })
    })
  }

  it("allows a user to read their own rep history", async () => {
    await setupUser("user-1", contributorUserDoc())
    await seedRepEvent("user-1", "event-1")
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertSucceeds(getDoc(doc(db, "users", "user-1", "repHistory", "event-1")))
  })

  it("denies reading another user's rep history", async () => {
    await setupUser("user-1", contributorUserDoc())
    await setupUser("user-2", contributorUserDoc())
    await seedRepEvent("user-1", "event-1")
    const ctx = testEnv.authenticatedContext("user-2")
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "users", "user-1", "repHistory", "event-1")))
  })

  it("denies unauthenticated read of rep history", async () => {
    await setupUser("user-1", contributorUserDoc())
    await seedRepEvent("user-1", "event-1")
    const ctx = testEnv.unauthenticatedContext()
    const db = ctx.firestore()
    await assertFails(getDoc(doc(db, "users", "user-1", "repHistory", "event-1")))
  })

  it("denies client-side creation of rep events", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(setDoc(doc(db, "users", "user-1", "repHistory", "fake-event"), {
      userId: "user-1",
      delta: 9999,
      reason: "admin_adjustment",
      sourceId: null,
      sourceDescription: "Self-granted rep",
      timestamp: serverTimestamp(),
      balanceAfter: 9999,
    }))
  })

  it("denies client-side update of rep events", async () => {
    await setupUser("user-1", contributorUserDoc())
    await seedRepEvent("user-1", "event-1")
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(updateDoc(doc(db, "users", "user-1", "repHistory", "event-1"), {
      delta: 9999,
    }))
  })

  it("denies client-side deletion of rep events", async () => {
    await setupUser("user-1", contributorUserDoc())
    await seedRepEvent("user-1", "event-1")
    const ctx = testEnv.authenticatedContext("user-1")
    const db = ctx.firestore()
    await assertFails(deleteDoc(doc(db, "users", "user-1", "repHistory", "event-1")))
  })
})

describe("peerReviews collection", () => {
  function peerReviewDoc(overrides: Record<string, unknown> = {}) {
    return {
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Test Node",
      advancementId: "fusion",
      authorId: "user-1",
      authorName: "Test User",
      status: "pending",
      reviewerId: null,
      reviewerName: null,
      feedback: null,
      decision: null,
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      ...overrides,
    }
  }

  it("allows authenticated users to read peer reviews", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "peerReviews", "pr-1"), peerReviewDoc())
    })
    await setupUser("user-2", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-2")
    await assertSucceeds(getDoc(doc(ctx.firestore(), "peerReviews", "pr-1")))
  })

  it("denies unauthenticated reads", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "peerReviews", "pr-1"), peerReviewDoc())
    })
    const ctx = testEnv.unauthenticatedContext()
    await assertFails(getDoc(doc(ctx.firestore(), "peerReviews", "pr-1")))
  })

  it("allows contributors to create peer reviews with their own authorId", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "peerReviews", "pr-1"), peerReviewDoc()))
  })

  it("denies creating peer reviews with a different authorId", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(setDoc(doc(ctx.firestore(), "peerReviews", "pr-1"), peerReviewDoc({ authorId: "someone-else" })))
  })

  it("denies observers from creating peer reviews", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    await assertFails(setDoc(doc(ctx.firestore(), "peerReviews", "pr-1"), peerReviewDoc({ authorId: "observer-1" })))
  })

  it("allows contributors to update peer reviews (claim review)", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "peerReviews", "pr-1"), peerReviewDoc())
    })
    await setupUser("reviewer-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("reviewer-1")
    await assertSucceeds(updateDoc(doc(ctx.firestore(), "peerReviews", "pr-1"), {
      reviewerId: "reviewer-1",
      reviewerName: "Reviewer",
      status: "in_review",
    }))
  })

  it("denies deleting peer reviews", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "peerReviews", "pr-1"), peerReviewDoc())
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(deleteDoc(doc(ctx.firestore(), "peerReviews", "pr-1")))
  })
})

describe("achievements collection", () => {
  it("allows authenticated users to read achievements", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "achievements", "user-1_first-node"), {
        userId: "user-1",
        achievementId: "first-node",
        earnedAt: serverTimestamp(),
      })
    })
    const ctx = testEnv.authenticatedContext("user-2")
    await assertSucceeds(getDoc(doc(ctx.firestore(), "achievements", "user-1_first-node")))
  })

  it("allows users to create their own achievements", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "achievements", "user-1_first-node"), {
      userId: "user-1",
      achievementId: "first-node",
      earnedAt: serverTimestamp(),
    }))
  })

  it("denies creating achievements for another user", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(setDoc(doc(ctx.firestore(), "achievements", "user-2_first-node"), {
      userId: "user-2",
      achievementId: "first-node",
      earnedAt: serverTimestamp(),
    }))
  })

  it("denies updating achievements", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "achievements", "user-1_first-node"), {
        userId: "user-1",
        achievementId: "first-node",
        earnedAt: serverTimestamp(),
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(updateDoc(doc(ctx.firestore(), "achievements", "user-1_first-node"), {
      achievementId: "hacked",
    }))
  })

  it("denies deleting achievements", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "achievements", "user-1_first-node"), {
        userId: "user-1",
        achievementId: "first-node",
        earnedAt: serverTimestamp(),
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(deleteDoc(doc(ctx.firestore(), "achievements", "user-1_first-node")))
  })
})

describe("spotlights collection", () => {
  function spotlightDoc(overrides: Record<string, unknown> = {}) {
    return {
      contentType: "node",
      contentId: "node-1",
      contentTitle: "Great Idea",
      advancementId: "fusion",
      authorId: "author-1",
      authorName: "Author",
      nominatedBy: "user-1",
      nominatorName: "Nominator",
      votes: 1,
      weekId: "2026-W12",
      createdAt: serverTimestamp(),
      ...overrides,
    }
  }

  it("allows authenticated users to read spotlights", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "spotlights", "spot-1"), spotlightDoc())
    })
    const ctx = testEnv.authenticatedContext("user-2")
    await assertSucceeds(getDoc(doc(ctx.firestore(), "spotlights", "spot-1")))
  })

  it("allows contributors to create spotlights with own nominatedBy", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "spotlights", "spot-1"), spotlightDoc()))
  })

  it("denies creating spotlights with a different nominatedBy", async () => {
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(setDoc(doc(ctx.firestore(), "spotlights", "spot-1"), spotlightDoc({ nominatedBy: "someone-else" })))
  })

  it("denies observers from creating spotlights", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    await assertFails(setDoc(doc(ctx.firestore(), "spotlights", "spot-1"), spotlightDoc({ nominatedBy: "observer-1" })))
  })

  it("allows authenticated users to update spotlights (vote)", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "spotlights", "spot-1"), spotlightDoc())
    })
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertSucceeds(updateDoc(doc(ctx.firestore(), "spotlights", "spot-1"), { votes: 2 }))
  })

  it("denies deleting spotlights", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "spotlights", "spot-1"), spotlightDoc())
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(deleteDoc(doc(ctx.firestore(), "spotlights", "spot-1")))
  })
})

describe("contentCollaborators collection", () => {
  function collaboratorDoc(overrides: Record<string, unknown> = {}) {
    return {
      contentId: "node-1",
      contentType: "node",
      userId: "collab-1",
      displayName: "Collaborator",
      addedBy: "user-1",
      addedAt: serverTimestamp(),
      ...overrides,
    }
  }

  it("allows authenticated users to read collaborators", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "contentCollaborators", "node-1_collab-1"), collaboratorDoc())
    })
    const ctx = testEnv.authenticatedContext("user-2")
    await assertSucceeds(getDoc(doc(ctx.firestore(), "contentCollaborators", "node-1_collab-1")))
  })

  it("allows authenticated users to create collaborator records", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "contentCollaborators", "node-1_collab-1"), collaboratorDoc()))
  })

  it("denies unauthenticated collaborator creation", async () => {
    const ctx = testEnv.unauthenticatedContext()
    await assertFails(setDoc(doc(ctx.firestore(), "contentCollaborators", "node-1_collab-1"), collaboratorDoc()))
  })

  it("allows authenticated users to delete collaborator records", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "contentCollaborators", "node-1_collab-1"), collaboratorDoc())
    })
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(deleteDoc(doc(ctx.firestore(), "contentCollaborators", "node-1_collab-1")))
  })

  it("denies updating collaborator records", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "contentCollaborators", "node-1_collab-1"), collaboratorDoc())
    })
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(updateDoc(doc(ctx.firestore(), "contentCollaborators", "node-1_collab-1"), { displayName: "Hacked" }))
  })
})

describe("pageViews collection", () => {
  it("allows unauthenticated users to create page views", async () => {
    const ctx = testEnv.unauthenticatedContext()
    await assertSucceeds(setDoc(doc(ctx.firestore(), "pageViews", "pv-1"), {
      path: "/advancements/fusion",
      timestamp: serverTimestamp(),
    }))
  })

  it("allows authenticated users to create page views", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "pageViews", "pv-1"), {
      path: "/advancements/fusion",
      timestamp: serverTimestamp(),
    }))
  })

  it("denies page views with path exceeding 500 chars", async () => {
    const ctx = testEnv.unauthenticatedContext()
    await assertFails(setDoc(doc(ctx.firestore(), "pageViews", "pv-1"), {
      path: "a".repeat(501),
      timestamp: serverTimestamp(),
    }))
  })

  it("denies reading page views for non-admin users", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "pageViews", "pv-1"), {
        path: "/test",
        timestamp: serverTimestamp(),
      })
    })
    await setupUser("user-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(getDoc(doc(ctx.firestore(), "pageViews", "pv-1")))
  })

  it("allows admin to read page views", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "pageViews", "pv-1"), {
        path: "/test",
        timestamp: serverTimestamp(),
      })
    })
    await setupUser("admin-1", adminUserDoc())
    const ctx = testEnv.authenticatedContext("admin-1")
    await assertSucceeds(getDoc(doc(ctx.firestore(), "pageViews", "pv-1")))
  })

  it("denies updating page views", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "pageViews", "pv-1"), {
        path: "/test",
        timestamp: serverTimestamp(),
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(updateDoc(doc(ctx.firestore(), "pageViews", "pv-1"), { path: "/hacked" }))
  })

  it("denies deleting page views", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "pageViews", "pv-1"), {
        path: "/test",
        timestamp: serverTimestamp(),
      })
    })
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(deleteDoc(doc(ctx.firestore(), "pageViews", "pv-1")))
  })
})

describe("newsLinks update rule (S17 fix)", () => {
  async function seedNewsLink() {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "newsLinks", "link-1"), {
        advancementId: "fusion",
        submitterId: "author-1",
        title: "Test Link",
        url: "https://example.com",
        score: 5,
        createdAt: serverTimestamp(),
      })
    })
  }

  it("allows the submitter to update their own link", async () => {
    await seedNewsLink()
    await setupUser("author-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("author-1")
    await assertSucceeds(updateDoc(doc(ctx.firestore(), "newsLinks", "link-1"), { title: "Updated Title" }))
  })

  it("allows moderators to update any link", async () => {
    await seedNewsLink()
    await setupUser("mod-1", moderatorUserDoc())
    const ctx = testEnv.authenticatedContext("mod-1")
    await assertSucceeds(updateDoc(doc(ctx.firestore(), "newsLinks", "link-1"), { title: "Mod Edit" }))
  })

  it("allows contributors to update only score", async () => {
    await seedNewsLink()
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertSucceeds(updateDoc(doc(ctx.firestore(), "newsLinks", "link-1"), { score: 6 }))
  })

  it("denies non-owner contributors from updating non-score fields", async () => {
    await seedNewsLink()
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertFails(updateDoc(doc(ctx.firestore(), "newsLinks", "link-1"), { title: "Hijacked" }))
  })

  it("denies observers from updating score", async () => {
    await seedNewsLink()
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    await assertFails(updateDoc(doc(ctx.firestore(), "newsLinks", "link-1"), { score: 6 }))
  })
})

describe("spotlightVotes collection (S18 fix)", () => {
  it("allows contributors to create their own vote", async () => {
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "spotlightVotes", "voter-1_spot-1"), {
      spotlightId: "spot-1",
      voterId: "voter-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("denies creating a vote with a different voterId", async () => {
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertFails(setDoc(doc(ctx.firestore(), "spotlightVotes", "voter-1_spot-1"), {
      spotlightId: "spot-1",
      voterId: "someone-else",
      createdAt: serverTimestamp(),
    }))
  })

  it("denies observers from voting", async () => {
    await setupUser("observer-1", observerUserDoc())
    const ctx = testEnv.authenticatedContext("observer-1")
    await assertFails(setDoc(doc(ctx.firestore(), "spotlightVotes", "observer-1_spot-1"), {
      spotlightId: "spot-1",
      voterId: "observer-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("denies updating votes", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "spotlightVotes", "voter-1_spot-1"), {
        spotlightId: "spot-1",
        voterId: "voter-1",
      })
    })
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertFails(updateDoc(doc(ctx.firestore(), "spotlightVotes", "voter-1_spot-1"), {
      spotlightId: "spot-2",
    }))
  })

  it("denies deleting votes", async () => {
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(doc(adminCtx.firestore(), "spotlightVotes", "voter-1_spot-1"), {
        spotlightId: "spot-1",
        voterId: "voter-1",
      })
    })
    await setupUser("voter-1", contributorUserDoc())
    const ctx = testEnv.authenticatedContext("voter-1")
    await assertFails(deleteDoc(doc(ctx.firestore(), "spotlightVotes", "voter-1_spot-1")))
  })
})

describe("libraryEntryVersions create rule (S20 fix)", () => {
  it("allows creating versions with own editedBy", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    await assertSucceeds(setDoc(doc(ctx.firestore(), "libraryEntryVersions", "v-1"), {
      entryId: "entry-1",
      title: "Old Title",
      content: "Old content",
      contentType: "article",
      difficulty: "introductory",
      editedBy: "user-1",
      createdAt: serverTimestamp(),
    }))
  })

  it("denies creating versions with a different editedBy", async () => {
    const ctx = testEnv.authenticatedContext("user-1")
    await assertFails(setDoc(doc(ctx.firestore(), "libraryEntryVersions", "v-1"), {
      entryId: "entry-1",
      title: "Old Title",
      content: "Old content",
      contentType: "article",
      difficulty: "introductory",
      editedBy: "someone-else",
      createdAt: serverTimestamp(),
    }))
  })
})
