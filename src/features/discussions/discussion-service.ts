import {
  collection,
  doc,
  addDoc,
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
} from "firebase/firestore"
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { validateCreateThread, validateCreateReply, validateEditThread, validateEditReply, validateDeleteThread, validateDeleteReply } from "@/domain/discussion"
import type { DiscussionThread, DiscussionReply } from "@/domain/discussion"

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

  const docRef = await addDoc(collection(db, "discussionThreads"), {
    advancementId: params.advancementId,
    authorId: params.authorId,
    authorName: params.authorName,
    title: params.title.trim(),
    body: params.body.trim(),
    replyCount: 0,
    lastActivityAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })

  return { success: true, threadId: docRef.id }
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

  const items = snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: data["advancementId"] as string,
      authorId: data["authorId"] as string,
      authorName: data["authorName"] as string,
      title: data["title"] as string,
      body: data["body"] as string,
      replyCount: (data["replyCount"] as number) ?? 0,
      lastActivityAt: (data["lastActivityAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
      createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })

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

  await addDoc(collection(db, "discussionReplies"), {
    threadId: params.threadId,
    authorId: params.authorId,
    authorName: params.authorName,
    body: params.body.trim(),
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, "discussionThreads", params.threadId), {
    replyCount: increment(1),
    lastActivityAt: serverTimestamp(),
  })

  return { success: true }
}

export async function getThreadsByAuthor(authorId: string): Promise<readonly DiscussionThread[]> {
  const q = query(
    collection(db, "discussionThreads"),
    where("authorId", "==", authorId),
    orderBy("lastActivityAt", "desc"),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: data["advancementId"] as string,
      authorId: data["authorId"] as string,
      authorName: data["authorName"] as string,
      title: data["title"] as string,
      body: data["body"] as string,
      replyCount: (data["replyCount"] as number) ?? 0,
      lastActivityAt: (data["lastActivityAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
      createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}

export async function getRepliesByThread(threadId: string): Promise<readonly DiscussionReply[]> {
  const q = query(
    collection(db, "discussionReplies"),
    where("threadId", "==", threadId),
    orderBy("createdAt", "asc"),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      threadId: data["threadId"] as string,
      authorId: data["authorId"] as string,
      authorName: data["authorName"] as string,
      body: data["body"] as string,
      createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}

type MutationResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

function docToThread(id: string, data: Record<string, unknown>): DiscussionThread {
  return {
    id,
    advancementId: data["advancementId"] as string,
    authorId: data["authorId"] as string,
    authorName: data["authorName"] as string,
    title: data["title"] as string,
    body: data["body"] as string,
    replyCount: (data["replyCount"] as number) ?? 0,
    lastActivityAt: (data["lastActivityAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
  }
}

function docToReply(id: string, data: Record<string, unknown>): DiscussionReply {
  return {
    id,
    threadId: data["threadId"] as string,
    authorId: data["authorId"] as string,
    authorName: data["authorName"] as string,
    body: data["body"] as string,
    createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
  }
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

  const thread = docToThread(threadDoc.id, threadDoc.data())
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

  const reply = docToReply(replyDoc.id, replyDoc.data())
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

  const thread = docToThread(threadDoc.id, threadDoc.data())
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

  const reply = docToReply(replyDoc.id, replyDoc.data())
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
