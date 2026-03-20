import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const db = getFirestore();
const auth = getAuth();

const SCHOOL_EMAIL_BONUS = 100;

async function assertAdmin(callerUid: string): Promise<void> {
  const claims = (await auth.getUser(callerUid)).customClaims;
  if (claims && claims["admin"] === true) return;

  const userDoc = await db.doc(`users/${callerUid}`).get();
  const data = userDoc.data();
  if (!data) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  if (data["role"] === "admin") {
    await auth.setCustomUserClaims(callerUid, { admin: true });
    return;
  }

  if (data["repPoints"] === -1) {
    await auth.setCustomUserClaims(callerUid, { admin: true });
    await db.doc(`users/${callerUid}`).update({ role: "admin", repPoints: 0 });
    return;
  }

  throw new HttpsError("permission-denied", "Admin access required");
}

// S5: Claim school email verification bonus
// Called by client when Firebase Auth email becomes verified
export const claimSchoolEmailBonus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const callerUid = request.auth.uid;

  // Verify email is actually verified in Firebase Auth
  const firebaseUser = await auth.getUser(callerUid);
  if (!firebaseUser.emailVerified) {
    throw new HttpsError("failed-precondition", "Email not verified");
  }

  const userDoc = await db.doc(`users/${callerUid}`).get();
  const data = userDoc.data();
  if (!data) {
    throw new HttpsError("not-found", "User profile not found");
  }

  // Prevent double-claiming
  if (data["emailVerified"] === true) {
    return { success: true, alreadyClaimed: true };
  }

  if (!data["isSchoolEmail"]) {
    // Not a school email, just mark as verified
    await db.doc(`users/${callerUid}`).update({ emailVerified: true });
    return { success: true, bonusGranted: false };
  }

  // Grant bonus and mark verified atomically
  await db.doc(`users/${callerUid}`).update({
    emailVerified: true,
    repPoints: FieldValue.increment(SCHOOL_EMAIL_BONUS),
  });

  return { success: true, bonusGranted: true, bonus: SCHOOL_EMAIL_BONUS };
});

// S3: Set admin custom claims (admin-only)
export const setAdminClaim = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const targetUid = request.data?.uid as string | undefined;
  const isAdmin = request.data?.admin as boolean | undefined;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "uid is required");
  }
  if (typeof isAdmin !== "boolean") {
    throw new HttpsError("invalid-argument", "admin must be a boolean");
  }

  await assertAdmin(request.auth.uid);

  if (targetUid === request.auth.uid && !isAdmin) {
    throw new HttpsError("invalid-argument", "Cannot remove your own admin access");
  }

  await auth.setCustomUserClaims(targetUid, { admin: isAdmin });
  await db.doc(`users/${targetUid}`).update({ role: isAdmin ? "admin" : "user" });

  return { success: true };
});

// S3: Admin update user rep (server-enforced)
export const adminUpdateUserRep = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const targetUid = request.data?.uid as string | undefined;
  const newRep = request.data?.repPoints as number | undefined;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "uid is required");
  }
  if (typeof newRep !== "number" || !Number.isInteger(newRep)) {
    throw new HttpsError("invalid-argument", "repPoints must be an integer");
  }

  await assertAdmin(request.auth.uid);

  await db.doc(`users/${targetUid}`).update({ repPoints: newRep });

  return { success: true };
});

// S3: Admin delete content (server-enforced)
export const adminDeleteContent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const collectionName = request.data?.collection as string | undefined;
  const docId = request.data?.docId as string | undefined;

  if (!collectionName || typeof collectionName !== "string") {
    throw new HttpsError("invalid-argument", "collection is required");
  }
  if (!docId || typeof docId !== "string") {
    throw new HttpsError("invalid-argument", "docId is required");
  }

  const allowedCollections = [
    "nodes",
    "libraryEntries",
    "newsLinks",
    "discussionThreads",
    "discussionReplies",
  ];
  if (!allowedCollections.includes(collectionName)) {
    throw new HttpsError("invalid-argument", "Invalid collection");
  }

  await assertAdmin(request.auth.uid);

  await db.doc(`${collectionName}/${docId}`).delete();

  return { success: true };
});

// S3: Admin update content field (server-enforced)
export const adminUpdateContent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const collectionName = request.data?.collection as string | undefined;
  const docId = request.data?.docId as string | undefined;
  const field = request.data?.field as string | undefined;
  const value = request.data?.value;

  if (!collectionName || typeof collectionName !== "string") {
    throw new HttpsError("invalid-argument", "collection is required");
  }
  if (!docId || typeof docId !== "string") {
    throw new HttpsError("invalid-argument", "docId is required");
  }
  if (!field || typeof field !== "string") {
    throw new HttpsError("invalid-argument", "field is required");
  }

  const allowedUpdates: Record<string, readonly string[]> = {
    nodes: ["status"],
    users: ["repPoints"],
  };
  const allowedFields = allowedUpdates[collectionName];
  if (!allowedFields || !allowedFields.includes(field)) {
    throw new HttpsError("invalid-argument", `Cannot update '${field}' on '${collectionName}'`);
  }

  // S22: Validate field values
  if (collectionName === "nodes" && field === "status") {
    const validStatuses = ["theoretical", "proven", "disproved"];
    if (typeof value !== "string" || !validStatuses.includes(value)) {
      throw new HttpsError("invalid-argument", `Invalid status value. Must be one of: ${validStatuses.join(", ")}`);
    }
  }
  if (collectionName === "users" && field === "repPoints") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new HttpsError("invalid-argument", "repPoints must be an integer");
    }
  }

  await assertAdmin(request.auth.uid);

  await db.doc(`${collectionName}/${docId}`).update({ [field]: value });

  return { success: true };
});

// S7 Phase 2: Rate-limited content creation
const RATE_LIMITS: Record<string, { maxPerHour: number }> = {
  nodes: { maxPerHour: 10 },
  discussionThreads: { maxPerHour: 15 },
  discussionReplies: { maxPerHour: 30 },
  newsLinks: { maxPerHour: 10 },
  libraryEntries: { maxPerHour: 5 },
  flags: { maxPerHour: 10 },
};

async function checkRateLimit(userId: string, collectionName: string): Promise<void> {
  const limit = RATE_LIMITS[collectionName];
  if (!limit) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const authorField = collectionName === "newsLinks" ? "submitterId" :
                      collectionName === "flags" ? "reporterId" : "authorId";

  const recentDocs = await db.collection(collectionName)
    .where(authorField, "==", userId)
    .where("createdAt", ">", oneHourAgo)
    .count()
    .get();

  if (recentDocs.data().count >= limit.maxPerHour) {
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit exceeded. Maximum ${limit.maxPerHour} per hour for ${collectionName}.`
    );
  }
}

export const checkContentRateLimit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const collectionName = request.data?.collection as string | undefined;
  if (!collectionName || typeof collectionName !== "string") {
    throw new HttpsError("invalid-argument", "collection is required");
  }

  await checkRateLimit(request.auth.uid, collectionName);
  return { allowed: true };
});

// Legacy admin migration: checks if caller has legacy admin markers and migrates them
export const migrateAdminStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  try {
    await assertAdmin(request.auth.uid);
    return { isAdmin: true, migrated: true };
  } catch {
    return { isAdmin: false, migrated: false };
  }
});

// S10: Revoke all sessions (sign out everywhere)
export const revokeAllSessions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  await auth.revokeRefreshTokens(request.auth.uid);
  return { success: true };
});

// Existing: Admin delete user account
export const deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const targetUid = request.data?.uid as string | undefined;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  if (targetUid === request.auth.uid) {
    throw new HttpsError("invalid-argument", "Cannot delete your own account");
  }

  await assertAdmin(request.auth.uid);

  await auth.deleteUser(targetUid);
  await db.doc(`users/${targetUid}`).delete();

  return { success: true };
});

// Email digest: update user preferences
export const updateDigestPreferences = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const enabled = request.data?.enabled as boolean | undefined;
  const period = request.data?.period as string | undefined;

  if (typeof enabled !== "boolean") {
    throw new HttpsError("invalid-argument", "enabled must be a boolean");
  }
  if (period !== "daily" && period !== "weekly") {
    throw new HttpsError("invalid-argument", "period must be 'daily' or 'weekly'");
  }

  const userRef = db.doc(`users/${request.auth.uid}`);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found");
  }

  const existing = userDoc.data()?.digestPreferences;
  const lastSentAt = existing?.lastSentAt ?? null;

  await userRef.update({
    digestPreferences: { enabled, period, lastSentAt },
  });

  return { success: true };
});

// Email digest: scheduled job to send digest emails
// Runs daily at 08:00 UTC. Weekly digests are skipped if < 7 days elapsed.
export const sendDigestEmails = onSchedule("every day 08:00", async () => {
  const DAILY_MS = 24 * 60 * 60 * 1000;
  const WEEKLY_MS = 7 * DAILY_MS;
  const now = new Date();

  // 1. Query all users with digest enabled
  const usersSnapshot = await db
    .collection("users")
    .where("digestPreferences.enabled", "==", true)
    .get();

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const prefs = userData.digestPreferences;
    if (!prefs || !prefs.enabled) continue;

    // 2. Check if enough time has elapsed
    const lastSentAt = prefs.lastSentAt?.toDate?.() ?? null;
    const intervalMs = prefs.period === "weekly" ? WEEKLY_MS : DAILY_MS;

    if (lastSentAt !== null) {
      const elapsed = now.getTime() - lastSentAt.getTime();
      if (elapsed < intervalMs) continue;
    }

    // 3. Query recent content in user's followed advancements
    const interests: string[] = userData.interests ?? [];
    if (interests.length === 0) continue;

    const sinceDate = lastSentAt ?? new Date(now.getTime() - intervalMs);
    const sinceTimestamp = Timestamp.fromDate(sinceDate);

    const contentQueries = [
      { collection: "nodes", type: "idea" as const, advField: "advancementId" },
      { collection: "libraryEntries", type: "library" as const, advField: "advancementId" },
      { collection: "discussionThreads", type: "thread" as const, advField: "advancementId" },
      { collection: "newsLinks", type: "link" as const, advField: "advancementId" },
    ];

    const entries: Array<{ title: string; type: string; advancementId: string; createdAt: Date; url: string }> = [];

    for (const query of contentQueries) {
      const snapshot = await db
        .collection(query.collection)
        .where(query.advField, "in", interests)
        .where("createdAt", ">", sinceTimestamp)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        entries.push({
          title: data.title ?? "Untitled",
          type: query.type,
          advancementId: data[query.advField],
          createdAt: data.createdAt?.toDate?.() ?? now,
          url: `/${query.collection}/${doc.id}`,
        });
      }
    }

    if (entries.length === 0) continue;

    // 4. Format and send email
    // TODO: Integrate with SendGrid or Resend for actual email delivery.
    // For now, log the digest that would be sent.
    const userName = userData.displayName ?? "Guild Member";
    console.log(
      `[Digest] Would send ${entries.length} entries to ${userData.email} (${userName}), period: ${prefs.period}`
    );

    // 5. Update lastSentAt
    await db.doc(`users/${userDoc.id}`).update({
      "digestPreferences.lastSentAt": Timestamp.fromDate(now),
    });
  }
});
