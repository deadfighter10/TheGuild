import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const auth = getAuth();

async function assertAdmin(callerUid: string): Promise<void> {
  const userDoc = await db.doc(`users/${callerUid}`).get();
  const data = userDoc.data();
  if (!data || data["repPoints"] !== -1) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

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
