import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserAchievement } from "@/domain/achievement"

function achievementDocId(userId: string, achievementId: string): string {
  return `${userId}_${achievementId}`
}

function parseUserAchievementDoc(id: string, data: Record<string, unknown>): UserAchievement | null {
  const userId = data["userId"]
  const achievementId = data["achievementId"]
  const earnedAt = data["earnedAt"]

  if (typeof userId !== "string" || typeof achievementId !== "string") {
    return null
  }

  const date = earnedAt && typeof earnedAt === "object" && typeof (earnedAt as Record<string, unknown>)["toDate"] === "function"
    ? (earnedAt as { toDate: () => Date }).toDate()
    : new Date()

  return { id, userId, achievementId, earnedAt: date }
}

export async function getUserAchievements(userId: string): Promise<readonly UserAchievement[]> {
  const q = query(
    collection(db, "achievements"),
    where("userId", "==", userId),
    orderBy("earnedAt", "desc"),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parseUserAchievementDoc(d.id, d.data()))
    .filter((item): item is UserAchievement => item !== null)
}

export async function awardAchievement(userId: string, achievementId: string): Promise<void> {
  const docId = achievementDocId(userId, achievementId)
  const docRef = doc(db, "achievements", docId)
  const existing = await getDoc(docRef)
  if (existing.exists()) {
    return
  }

  const batch = writeBatch(db)
  batch.set(docRef, {
    userId,
    achievementId,
    earnedAt: serverTimestamp(),
  })
  await batch.commit()
}
