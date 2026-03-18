import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { parseNotificationDoc } from "@/lib/firestore-schemas"
import type { Notification, NotificationType } from "@/domain/notification"

export async function createNotification(params: {
  readonly userId: string
  readonly type: NotificationType
  readonly message: string
  readonly link: string
}): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId: params.userId,
    type: params.type,
    message: params.message,
    link: params.link,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export async function getNotifications(userId: string): Promise<readonly Notification[]> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parseNotificationDoc(d.id, d.data()))
    .filter((item): item is Notification => item !== null)
}

export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void,
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false),
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size)
  })
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true })
}

export async function markAllAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false),
  )
  const snapshot = await getDocs(q)
  const batch = writeBatch(db)
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { read: true })
  })
  await batch.commit()
}

