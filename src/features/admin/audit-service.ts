import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AuditAction, AuditLogEntry } from "@/domain/audit-log"

export async function logAuditEvent(params: {
  readonly actorId: string
  readonly actorName: string
  readonly action: AuditAction
  readonly targetCollection: string
  readonly targetId: string
  readonly details: string
}): Promise<void> {
  await addDoc(collection(db, "auditLog"), {
    ...params,
    createdAt: serverTimestamp(),
  })
}

export async function getAuditLog(count = 100): Promise<readonly AuditLogEntry[]> {
  const q = query(
    collection(db, "auditLog"),
    orderBy("createdAt", "desc"),
    limit(count),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      actorId: d["actorId"] as string,
      actorName: d["actorName"] as string,
      action: d["action"] as AuditAction,
      targetCollection: d["targetCollection"] as string,
      targetId: d["targetId"] as string,
      details: d["details"] as string,
      createdAt: (d["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}
