import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { bookmarkId } from "@/domain/bookmark"
import type { Bookmark, BookmarkTargetType } from "@/domain/bookmark"

type ToggleBookmarkParams = {
  readonly userId: string
  readonly targetType: BookmarkTargetType
  readonly targetId: string
  readonly targetTitle: string
  readonly advancementId: string
}

export async function toggleBookmark(params: ToggleBookmarkParams): Promise<boolean> {
  const id = bookmarkId(params.userId, params.targetType, params.targetId)
  const ref = doc(db, "bookmarks", id)
  const existing = await getDoc(ref)

  if (existing.exists()) {
    await deleteDoc(ref)
    return false
  }

  await setDoc(ref, {
    userId: params.userId,
    targetType: params.targetType,
    targetId: params.targetId,
    targetTitle: params.targetTitle,
    advancementId: params.advancementId,
    createdAt: serverTimestamp(),
  })
  return true
}

export async function isBookmarked(
  userId: string,
  targetType: BookmarkTargetType,
  targetId: string,
): Promise<boolean> {
  const id = bookmarkId(userId, targetType, targetId)
  const ref = doc(db, "bookmarks", id)
  const snap = await getDoc(ref)
  return snap.exists()
}

export async function getUserBookmarks(userId: string): Promise<readonly Bookmark[]> {
  const q = query(
    collection(db, "bookmarks"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) return []

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    const createdAt = data["createdAt"] && typeof data["createdAt"] === "object" && typeof (data["createdAt"] as Record<string, unknown>).toDate === "function"
      ? ((data["createdAt"] as { toDate: () => Date }).toDate())
      : new Date()

    return {
      id: docSnap.id,
      userId: data["userId"] as string,
      targetType: data["targetType"] as BookmarkTargetType,
      targetId: data["targetId"] as string,
      targetTitle: data["targetTitle"] as string,
      advancementId: data["advancementId"] as string,
      createdAt,
    }
  })
}
