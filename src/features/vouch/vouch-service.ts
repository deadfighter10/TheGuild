import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { validateVouch, type VouchValidation } from "@/domain/vouch"
import { REP_THRESHOLDS } from "@/domain/reputation"

export async function vouchForUser(
  voucherId: string,
  voucheeId: string,
  voucherRep: number,
): Promise<VouchValidation> {
  const vouchesRef = collection(db, "vouches")

  const [voucheeVouches, voucherVouches] = await Promise.all([
    getDocs(query(vouchesRef, where("voucheeId", "==", voucheeId))),
    getDocs(query(vouchesRef, where("voucherId", "==", voucherId))),
  ])

  const validation = validateVouch({
    voucherId,
    voucheeId,
    voucherRep,
    voucheeHasBeenVouched: !voucheeVouches.empty,
    voucherHasVouchedBefore: !voucherVouches.empty,
  })

  if (!validation.valid) return validation

  await runTransaction(db, async (transaction) => {
    const voucheeRef = doc(db, "users", voucheeId)
    const voucheeDoc = await transaction.get(voucheeRef)

    if (!voucheeDoc.exists()) {
      throw new Error("User not found")
    }

    const currentRep = voucheeDoc.data()["repPoints"] as number

    transaction.set(doc(vouchesRef), {
      voucherId,
      voucheeId,
      createdAt: new Date(),
    })

    transaction.update(voucheeRef, {
      repPoints: currentRep + REP_THRESHOLDS.vouchBonus,
    })
  })

  return { valid: true }
}

export async function searchUserByEmail(
  email: string,
  currentUserId: string,
): Promise<{ uid: string; displayName: string; email: string } | null> {
  const usersRef = collection(db, "users")
  const snapshot = await getDocs(query(usersRef, where("email", "==", email)))

  if (snapshot.empty) return null

  const userDoc = snapshot.docs[0]
  if (!userDoc || userDoc.id === currentUserId) return null

  const data = userDoc.data()
  return {
    uid: userDoc.id,
    displayName: data["displayName"] as string,
    email: data["email"] as string,
  }
}

export async function hasBeenVouched(userId: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(db, "vouches"), where("voucheeId", "==", userId)),
  )
  return !snapshot.empty
}

export async function hasVouchedForSomeone(userId: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(db, "vouches"), where("voucherId", "==", userId)),
  )
  return !snapshot.empty
}
