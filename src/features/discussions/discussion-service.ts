import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { validateCreateThread, validateCreateReply } from "@/domain/discussion"
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

export async function getThreadsByAdvancement(advancementId: string): Promise<readonly DiscussionThread[]> {
  const q = query(
    collection(db, "discussionThreads"),
    where("advancementId", "==", advancementId),
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
