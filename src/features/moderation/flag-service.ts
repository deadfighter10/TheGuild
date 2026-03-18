import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { parseContentFlagDoc } from "@/lib/firestore-schemas"
import type { ContentFlag, FlagReason, FlagTargetCollection, FlagStatus } from "@/domain/flag"
import { createNotification } from "@/features/notifications/notification-service"
import { formatNotificationMessage, notificationLink } from "@/domain/notification"

export async function flagContent(params: {
  readonly targetCollection: FlagTargetCollection
  readonly targetId: string
  readonly targetTitle: string
  readonly reporterId: string
  readonly reporterName: string
  readonly reason: FlagReason
  readonly details: string
}): Promise<string> {
  const existing = await getDocs(
    query(
      collection(db, "flags"),
      where("targetCollection", "==", params.targetCollection),
      where("targetId", "==", params.targetId),
      where("reporterId", "==", params.reporterId),
    )
  )
  if (!existing.empty) {
    throw new Error("You have already flagged this content")
  }

  const rateCheck = await checkRateLimit(params.reporterId, "flags")
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason)
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "flags"))
  batch.set(newDocRef, {
    targetCollection: params.targetCollection,
    targetId: params.targetId,
    targetTitle: params.targetTitle,
    reporterId: params.reporterId,
    reporterName: params.reporterName,
    reason: params.reason,
    details: params.details,
    status: "pending",
    resolvedBy: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  })
  addRateLimitToBatch(batch, params.reporterId, "flags")
  await batch.commit()

  // Notify content author
  const authorField = params.targetCollection === "newsLinks" ? "submitterId" : "authorId"
  const targetDoc = await getDoc(doc(db, params.targetCollection, params.targetId))
  const authorId = targetDoc.data()?.[authorField] as string | undefined
  if (authorId && authorId !== params.reporterId) {
    const advancementId = targetDoc.data()?.["advancementId"] as string | undefined
    createNotification({
      userId: authorId,
      type: "flag",
      message: formatNotificationMessage({
        type: "flag",
        actorName: "System",
        targetTitle: params.targetTitle,
      }),
      link: notificationLink({ type: "flag", advancementId }),
    }).catch((err) => console.error("Failed to send flag notification:", err))
  }

  return newDocRef.id
}

export async function getPendingFlags(): Promise<readonly ContentFlag[]> {
  const q = query(
    collection(db, "flags"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(100),
  )
  return mapFlags(await getDocs(q))
}

export async function getAllFlags(status?: FlagStatus): Promise<readonly ContentFlag[]> {
  const constraints = status
    ? [where("status", "==", status), orderBy("createdAt", "desc"), limit(100)]
    : [orderBy("createdAt", "desc"), limit(100)]

  const q = query(collection(db, "flags"), ...constraints)
  return mapFlags(await getDocs(q))
}

export async function resolveFlag(
  flagId: string,
  resolution: { readonly status: FlagStatus; readonly resolvedBy: string },
): Promise<void> {
  await updateDoc(doc(db, "flags", flagId), {
    status: resolution.status,
    resolvedBy: resolution.resolvedBy,
    resolvedAt: serverTimestamp(),
  })
}

function mapFlags(snapshot: { readonly docs: readonly { id: string; data: () => Record<string, unknown> }[] }): readonly ContentFlag[] {
  return snapshot.docs
    .map((d) => parseContentFlagDoc(d.id, d.data()))
    .filter((item): item is ContentFlag => item !== null)
}
