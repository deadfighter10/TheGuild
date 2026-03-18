import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const auth = getAuth();

const SCHOOL_EMAIL_BONUS = 100;

async function assertAdmin(callerUid: string): Promise<void> {
  const claims = (await auth.getUser(callerUid)).customClaims;
  if (!claims || claims["admin"] !== true) {
    // Fallback: check legacy repPoints === -1 for migration
    const userDoc = await db.doc(`users/${callerUid}`).get();
    const data = userDoc.data();
    if (!data || data["repPoints"] !== -1) {
      throw new HttpsError("permission-denied", "Admin access required");
    }
    // Migrate legacy admin to custom claims
    await auth.setCustomUserClaims(callerUid, { admin: true });
  }
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

  // Update the repPoints to match (-1 for admin, 0 for non-admin)
  if (isAdmin) {
    await db.doc(`users/${targetUid}`).update({ repPoints: -1 });
  }

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
