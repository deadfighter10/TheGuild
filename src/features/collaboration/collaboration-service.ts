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
import { collaboratorDocId, type Collaborator } from "@/domain/collaborator"
import { createNotification } from "@/features/notifications/notification-service"

function parseCollaboratorDoc(id: string, data: Record<string, unknown>): Collaborator | null {
  const contentId = data["contentId"] as string
  const contentType = data["contentType"] as string
  const userId = data["userId"] as string
  const displayName = data["displayName"] as string
  const addedBy = data["addedBy"] as string
  const addedAt = data["addedAt"]

  if (!contentId || !userId) return null

  const date = addedAt && typeof addedAt === "object" && typeof (addedAt as Record<string, unknown>)["toDate"] === "function"
    ? (addedAt as { toDate: () => Date }).toDate()
    : new Date()

  return {
    id,
    contentId,
    contentType: contentType as Collaborator["contentType"],
    userId,
    displayName,
    addedBy,
    addedAt: date,
  }
}

export async function addCollaborator(params: {
  readonly contentId: string
  readonly contentType: "node" | "libraryEntry"
  readonly contentTitle: string
  readonly userId: string
  readonly displayName: string
  readonly addedBy: string
}): Promise<void> {
  const docId = collaboratorDocId(params.contentId, params.userId)
  const docRef = doc(db, "contentCollaborators", docId)
  const existing = await getDoc(docRef)
  if (existing.exists()) {
    throw new Error("This user is already a collaborator")
  }

  const batch = writeBatch(db)
  batch.set(docRef, {
    contentId: params.contentId,
    contentType: params.contentType,
    userId: params.userId,
    displayName: params.displayName,
    addedBy: params.addedBy,
    addedAt: serverTimestamp(),
  })
  await batch.commit()

  createNotification({
    userId: params.userId,
    type: "support",
    message: `You were added as a collaborator on "${params.contentTitle}"`,
    link: "/profile",
  }).catch((err) => console.error("Failed to send collaborator notification:", err))
}

export async function removeCollaborator(contentId: string, userId: string): Promise<void> {
  const docId = collaboratorDocId(contentId, userId)
  const docRef = doc(db, "contentCollaborators", docId)
  const batch = writeBatch(db)
  batch.delete(docRef)
  await batch.commit()
}

export async function getCollaborators(contentId: string): Promise<readonly Collaborator[]> {
  const q = query(
    collection(db, "contentCollaborators"),
    where("contentId", "==", contentId),
    orderBy("addedAt", "desc"),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parseCollaboratorDoc(d.id, d.data()))
    .filter((item): item is Collaborator => item !== null)
}

export async function isCollaborator(contentId: string, userId: string): Promise<boolean> {
  const docId = collaboratorDocId(contentId, userId)
  const docRef = doc(db, "contentCollaborators", docId)
  const snap = await getDoc(docRef)
  return snap.exists()
}
