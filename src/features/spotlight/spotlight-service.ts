import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { spotlightWeekId, type SpotlightContentType, type Spotlight } from "@/domain/spotlight"
import { createNotification } from "@/features/notifications/notification-service"
import { formatNotificationMessage, notificationLink } from "@/domain/notification"

function parseSpotlightDoc(id: string, data: Record<string, unknown>): Spotlight | null {
  const contentType = data["contentType"] as string
  const contentId = data["contentId"] as string
  const contentTitle = data["contentTitle"] as string
  const advancementId = data["advancementId"] as string
  const authorId = data["authorId"] as string
  const authorName = data["authorName"] as string
  const nominatedBy = data["nominatedBy"] as string
  const nominatorName = data["nominatorName"] as string
  const votes = data["votes"] as number
  const weekId = data["weekId"] as string
  const createdAt = data["createdAt"]

  if (!contentType || !contentId || !contentTitle) return null

  const date = createdAt && typeof createdAt === "object" && typeof (createdAt as Record<string, unknown>)["toDate"] === "function"
    ? (createdAt as { toDate: () => Date }).toDate()
    : new Date()

  return {
    id,
    contentType: contentType as SpotlightContentType,
    contentId,
    contentTitle,
    advancementId,
    authorId,
    authorName,
    nominatedBy,
    nominatorName,
    votes: votes ?? 0,
    weekId,
    createdAt: date,
  }
}

export async function nominateForSpotlight(params: {
  readonly contentType: SpotlightContentType
  readonly contentId: string
  readonly contentTitle: string
  readonly advancementId: string
  readonly authorId: string
  readonly authorName: string
  readonly nominatedBy: string
  readonly nominatorName: string
}): Promise<string> {
  const weekId = spotlightWeekId(new Date())

  const existing = await getDocs(
    query(
      collection(db, "spotlights"),
      where("contentId", "==", params.contentId),
      where("weekId", "==", weekId),
    ),
  )
  if (!existing.empty) {
    throw new Error("This content has already been nominated this week")
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "spotlights"))
  batch.set(newDocRef, {
    contentType: params.contentType,
    contentId: params.contentId,
    contentTitle: params.contentTitle,
    advancementId: params.advancementId,
    authorId: params.authorId,
    authorName: params.authorName,
    nominatedBy: params.nominatedBy,
    nominatorName: params.nominatorName,
    votes: 1,
    weekId,
    createdAt: serverTimestamp(),
  })
  await batch.commit()

  createNotification({
    userId: params.authorId,
    type: "support",
    message: formatNotificationMessage({
      type: "support",
      actorName: params.nominatorName,
      targetTitle: params.contentTitle,
    }),
    link: notificationLink({ type: "support", advancementId: params.advancementId }),
  }).catch((err) => console.error("Failed to send spotlight notification:", err))

  return newDocRef.id
}

export async function voteForSpotlight(spotlightId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, "spotlights", spotlightId), {
    votes: increment(1),
  })
  await batch.commit()
}

export async function getCurrentSpotlights(advancementId: string): Promise<readonly Spotlight[]> {
  const weekId = spotlightWeekId(new Date())

  const q = query(
    collection(db, "spotlights"),
    where("advancementId", "==", advancementId),
    where("weekId", "==", weekId),
    orderBy("votes", "desc"),
    limit(10),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parseSpotlightDoc(d.id, d.data()))
    .filter((item): item is Spotlight => item !== null)
}
