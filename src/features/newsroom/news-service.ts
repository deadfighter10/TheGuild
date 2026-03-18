import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore"
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { parseNewsLinkDoc } from "@/lib/firestore-schemas"
import { validateSubmitNewsLink, validateVoteNewsLink } from "@/domain/news-link"
import type { NewsLink, VoteValue } from "@/domain/news-link"

type SubmitLinkParams = {
  readonly submitterId: string
  readonly submitterRep: number
  readonly advancementId: string
  readonly title: string
  readonly url: string
}

type SubmitLinkResult =
  | { readonly success: true; readonly linkId: string }
  | { readonly success: false; readonly reason: string }

export async function submitNewsLink(params: SubmitLinkParams): Promise<SubmitLinkResult> {
  const validation = validateSubmitNewsLink({
    submitterRep: params.submitterRep,
    title: params.title,
    url: params.url,
    advancementId: params.advancementId,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const rateCheck = await checkRateLimit(params.submitterId, "newsLinks")
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason }
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "newsLinks"))
  batch.set(newDocRef, {
    advancementId: params.advancementId,
    submitterId: params.submitterId,
    title: params.title.trim(),
    url: params.url.trim(),
    score: 0,
    createdAt: serverTimestamp(),
  })
  addRateLimitToBatch(batch, params.submitterId, "newsLinks")
  await batch.commit()

  return { success: true, linkId: newDocRef.id }
}

const PAGE_SIZE = 20

export type PageResult<T> = {
  readonly items: readonly T[]
  readonly lastDoc: QueryDocumentSnapshot<DocumentData> | null
  readonly hasMore: boolean
}

export async function getNewsLinks(
  advancementId?: string,
  cursor?: QueryDocumentSnapshot<DocumentData>,
): Promise<PageResult<NewsLink>> {
  const ref = collection(db, "newsLinks")
  const constraints = [
    ...(advancementId ? [where("advancementId", "==", advancementId)] : []),
    orderBy("createdAt", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE),
  ]
  const q = query(ref, ...constraints)

  const snapshot = await getDocs(q)
  const items = snapshot.docs.map((docSnap) => parseNewsLinkDoc(docSnap.id, docSnap.data())).filter((item): item is NewsLink => item !== null)
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null

  return { items, lastDoc, hasMore: snapshot.docs.length === PAGE_SIZE }
}

type VoteResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function voteNewsLink(
  userId: string,
  userRep: number,
  linkId: string,
  newVote: VoteValue,
): Promise<VoteResult> {
  const linkDoc = await getDoc(doc(db, "newsLinks", linkId))
  if (!linkDoc.exists()) {
    return { success: false, reason: "Link not found" }
  }

  const link = parseNewsLinkDoc(linkDoc.id, linkDoc.data())
  if (!link) {
    return { success: false, reason: "Invalid link data" }
  }

  const voteId = `${userId}_${linkId}`
  const voteRef = doc(db, "newsVotes", voteId)
  const existingVoteDoc = await getDoc(voteRef)
  const existingVote = existingVoteDoc.exists()
    ? (existingVoteDoc.data()["value"] as VoteValue)
    : null

  const validation = validateVoteNewsLink({
    userId,
    userRep,
    link,
    existingVote,
    newVote,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const scoreDelta = existingVote === null
    ? newVote
    : newVote - existingVote

  await setDoc(voteRef, {
    newsLinkId: linkId,
    userId,
    value: newVote,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, "newsLinks", linkId), {
    score: increment(scoreDelta),
  })

  return { success: true }
}

export async function getUserVote(userId: string, linkId: string): Promise<VoteValue | null> {
  const voteRef = doc(db, "newsVotes", `${userId}_${linkId}`)
  const voteDoc = await getDoc(voteRef)
  if (!voteDoc.exists()) return null
  return voteDoc.data()["value"] as VoteValue
}

export async function getNewsLinksBySubmitter(submitterId: string): Promise<readonly NewsLink[]> {
  const q = query(
    collection(db, "newsLinks"),
    where("submitterId", "==", submitterId),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => parseNewsLinkDoc(docSnap.id, docSnap.data())).filter((item): item is NewsLink => item !== null)
}

export function subscribeToNewsLinks(
  advancementId: string | undefined,
  onData: (links: readonly NewsLink[]) => void,
  onError: (error: Error) => void,
): () => void {
  const ref = collection(db, "newsLinks")
  const constraints = [
    ...(advancementId ? [where("advancementId", "==", advancementId)] : []),
    orderBy("createdAt", "desc"),
  ]
  const q = query(ref, ...constraints)

  return onSnapshot(
    q,
    (snapshot) => {
      const links = snapshot.docs.map((docSnap) => parseNewsLinkDoc(docSnap.id, docSnap.data())).filter((item): item is NewsLink => item !== null)
      onData(links)
    },
    onError,
  )
}
