import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore"
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { parseDiscussionThreadDoc, parseDiscussionReplyDoc } from "@/lib/firestore-schemas"
import { validateCreateThread, validateCreateReply, validateEditThread, validateEditReply, validateDeleteThread, validateDeleteReply } from "@/domain/discussion"
import type { DiscussionThread, DiscussionReply } from "@/domain/discussion"
import { createNotification } from "@/features/notifications/notification-service"
import { formatNotificationMessage, notificationLink } from "@/domain/notification"

type CreateThreadParams = {
  readonly authorId: string
  readonly authorName: string
  readonly authorRep: number
  readonly advancementId: string
  readonly title: string
  readonly body: string
}

type CreateThreadResult =
  | { readonly success: true; readonly threadId: string }
  | { readonly success: false; readonly reason: string }

export async function createThread(params: CreateThreadParams): Promise<CreateThreadResult> {
  const validation = validateCreateThread({
    authorRep: params.authorRep,
    title: params.title,
    body: params.body,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const rateCheck = await checkRateLimit(params.authorId, "discussionThreads")
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason }
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "discussionThreads"))
  batch.set(newDocRef, {
    advancementId: params.advancementId,
    authorId: params.authorId,
    authorName: params.authorName,
    title: params.title.trim(),
    body: params.body.trim(),
    replyCount: 0,
    lastActivityAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
  addRateLimitToBatch(batch, params.authorId, "discussionThreads")
  await batch.commit()

  return { success: true, threadId: newDocRef.id }
}

const PAGE_SIZE = 20

export type PageResult<T> = {
  readonly items: readonly T[]
  readonly lastDoc: QueryDocumentSnapshot<DocumentData> | null
  readonly hasMore: boolean
}

export async function getThreadsByAdvancement(
  advancementId: string,
  cursor?: QueryDocumentSnapshot<DocumentData>,
): Promise<PageResult<DiscussionThread>> {
  const constraints = [
    where("advancementId", "==", advancementId),
    orderBy("lastActivityAt", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE),
  ]
  const q = query(collection(db, "discussionThreads"), ...constraints)
  const snapshot = await getDocs(q)

  const items = snapshot.docs
    .map((docSnap) => parseDiscussionThreadDoc(docSnap.id, docSnap.data()))
    .filter((item): item is DiscussionThread => item !== null)

  const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null
  return { items, lastDoc, hasMore: snapshot.docs.length === PAGE_SIZE }
}

type CreateReplyParams = {
  readonly authorId: string
  readonly authorName: string
  readonly authorRep: number
  readonly threadId: string
  readonly body: string
}

type CreateReplyResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function createReply(params: CreateReplyParams): Promise<CreateReplyResult> {
  const validation = validateCreateReply({
    authorRep: params.authorRep,
    body: params.body,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const rateCheck = await checkRateLimit(params.authorId, "discussionReplies")
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason }
  }

  const batch = writeBatch(db)
  const replyRef = doc(collection(db, "discussionReplies"))
  batch.set(replyRef, {
    threadId: params.threadId,
    authorId: params.authorId,
    authorName: params.authorName,
    body: params.body.trim(),
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, "discussionThreads", params.threadId), {
    replyCount: increment(1),
    lastActivityAt: serverTimestamp(),
  })
  addRateLimitToBatch(batch, params.authorId, "discussionReplies")
  await batch.commit()

  // Notify thread author (if not replying to own thread)
  const threadDoc = await getDoc(doc(db, "discussionThreads", params.threadId))
  const threadData = threadDoc.data()
  if (threadData && threadData["authorId"] !== params.authorId) {
    const threadAdvId = threadData["advancementId"] as string | undefined
    createNotification({
      userId: threadData["authorId"] as string,
      type: "reply",
      message: formatNotificationMessage({
        type: "reply",
        actorName: params.authorName,
        targetTitle: threadData["title"] as string,
      }),
      link: notificationLink({ type: "reply", advancementId: threadAdvId }),
    }).catch((err) => console.error("Failed to send reply notification:", err))
  }

  return { success: true }
}

export async function getThreadsByAuthor(authorId: string): Promise<readonly DiscussionThread[]> {
  const q = query(
    collection(db, "discussionThreads"),
    where("authorId", "==", authorId),
    orderBy("lastActivityAt", "desc"),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((docSnap) => parseDiscussionThreadDoc(docSnap.id, docSnap.data()))
    .filter((item): item is DiscussionThread => item !== null)
}

export async function getRepliesByThread(threadId: string): Promise<readonly DiscussionReply[]> {
  const q = query(
    collection(db, "discussionReplies"),
    where("threadId", "==", threadId),
    orderBy("createdAt", "asc"),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((docSnap) => parseDiscussionReplyDoc(docSnap.id, docSnap.data()))
    .filter((item): item is DiscussionReply => item !== null)
}

type MutationResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export function subscribeToThreadsByAdvancement(
  advancementId: string,
  onData: (threads: readonly DiscussionThread[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, "discussionThreads"),
    where("advancementId", "==", advancementId),
    orderBy("lastActivityAt", "desc"),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const threads = snapshot.docs.map((docSnap) => parseDiscussionThreadDoc(docSnap.id, docSnap.data())).filter((item): item is DiscussionThread => item !== null)
      onData(threads)
    },
    onError,
  )
}

export function subscribeToRepliesByThread(
  threadId: string,
  onData: (replies: readonly DiscussionReply[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, "discussionReplies"),
    where("threadId", "==", threadId),
    orderBy("createdAt", "asc"),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const replies = snapshot.docs.map((docSnap) => parseDiscussionReplyDoc(docSnap.id, docSnap.data())).filter((item): item is DiscussionReply => item !== null)
      onData(replies)
    },
    onError,
  )
}

export async function editThread(params: {
  readonly userId: string
  readonly userRep: number
  readonly threadId: string
  readonly title: string
  readonly body: string
}): Promise<MutationResult> {
  const threadDoc = await getDoc(doc(db, "discussionThreads", params.threadId))
  if (!threadDoc.exists()) return { success: false, reason: "Thread not found" }

  const thread = parseDiscussionThreadDoc(threadDoc.id, threadDoc.data())
  if (!thread) return { success: false, reason: "Invalid thread data" }
  const validation = validateEditThread({
    userId: params.userId,
    userRep: params.userRep,
    thread,
    title: params.title,
    body: params.body,
  })

  if (!validation.valid) return { success: false, reason: validation.reason }

  await updateDoc(doc(db, "discussionThreads", params.threadId), {
    title: params.title.trim(),
    body: params.body.trim(),
    updatedAt: serverTimestamp(),
  })

  return { success: true }
}

export async function editReply(params: {
  readonly userId: string
  readonly userRep: number
  readonly replyId: string
  readonly body: string
}): Promise<MutationResult> {
  const replyDoc = await getDoc(doc(db, "discussionReplies", params.replyId))
  if (!replyDoc.exists()) return { success: false, reason: "Reply not found" }

  const reply = parseDiscussionReplyDoc(replyDoc.id, replyDoc.data())
  if (!reply) return { success: false, reason: "Invalid reply data" }
  const validation = validateEditReply({
    userId: params.userId,
    userRep: params.userRep,
    reply,
    body: params.body,
  })

  if (!validation.valid) return { success: false, reason: validation.reason }

  await updateDoc(doc(db, "discussionReplies", params.replyId), {
    body: params.body.trim(),
    updatedAt: serverTimestamp(),
  })

  return { success: true }
}

export async function deleteThread(params: {
  readonly userId: string
  readonly userRep: number
  readonly threadId: string
}): Promise<MutationResult> {
  const threadDoc = await getDoc(doc(db, "discussionThreads", params.threadId))
  if (!threadDoc.exists()) return { success: false, reason: "Thread not found" }

  const thread = parseDiscussionThreadDoc(threadDoc.id, threadDoc.data())
  if (!thread) return { success: false, reason: "Invalid thread data" }
  const validation = validateDeleteThread({
    userId: params.userId,
    userRep: params.userRep,
    thread,
  })

  if (!validation.valid) return { success: false, reason: validation.reason }

  await deleteDoc(doc(db, "discussionThreads", params.threadId))
  return { success: true }
}

export async function deleteReply(params: {
  readonly userId: string
  readonly userRep: number
  readonly replyId: string
  readonly threadId: string
}): Promise<MutationResult> {
  const replyDoc = await getDoc(doc(db, "discussionReplies", params.replyId))
  if (!replyDoc.exists()) return { success: false, reason: "Reply not found" }

  const reply = parseDiscussionReplyDoc(replyDoc.id, replyDoc.data())
  if (!reply) return { success: false, reason: "Invalid reply data" }
  const validation = validateDeleteReply({
    userId: params.userId,
    userRep: params.userRep,
    reply,
  })

  if (!validation.valid) return { success: false, reason: validation.reason }

  await deleteDoc(doc(db, "discussionReplies", params.replyId))
  await updateDoc(doc(db, "discussionThreads", params.threadId), {
    replyCount: increment(-1),
  })

  return { success: true }
}
