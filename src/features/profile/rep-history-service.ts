import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { RepReason, RepEvent } from "@/domain/reputation"
import { parseRepEventDoc } from "@/lib/firestore-schemas"

type AddRepEventInput = {
  readonly userId: string
  readonly delta: number
  readonly reason: RepReason
  readonly sourceId: string | null
  readonly sourceDescription: string
  readonly balanceAfter: number
}

export async function addRepEvent(input: AddRepEventInput): Promise<void> {
  const colRef = collection(db, "users", input.userId, "repHistory")
  await addDoc(colRef, {
    userId: input.userId,
    delta: input.delta,
    reason: input.reason,
    sourceId: input.sourceId,
    sourceDescription: input.sourceDescription,
    balanceAfter: input.balanceAfter,
    timestamp: serverTimestamp(),
  })
}

export async function getRepHistory(userId: string, maxResults = 50): Promise<readonly RepEvent[]> {
  const colRef = collection(db, "users", userId, "repHistory")
  const q = query(colRef, orderBy("timestamp", "desc"), limit(maxResults))
  const snapshot = await getDocs(q)

  if (snapshot.empty) return []

  return snapshot.docs
    .map((doc) => parseRepEventDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((event): event is RepEvent => event !== null)
}
