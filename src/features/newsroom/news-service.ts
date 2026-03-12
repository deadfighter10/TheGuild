import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
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

  const docRef = await addDoc(collection(db, "newsLinks"), {
    advancementId: params.advancementId,
    submitterId: params.submitterId,
    title: params.title.trim(),
    url: params.url.trim(),
    score: 0,
    createdAt: serverTimestamp(),
  })

  return { success: true, linkId: docRef.id }
}

export async function getNewsLinks(advancementId?: string): Promise<readonly NewsLink[]> {
  const ref = collection(db, "newsLinks")
  const q = advancementId
    ? query(ref, where("advancementId", "==", advancementId), orderBy("createdAt", "desc"))
    : query(ref, orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => docToLink(docSnap.id, docSnap.data()))
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

  const link = docToLink(linkDoc.id, linkDoc.data())

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
  return snapshot.docs.map((docSnap) => docToLink(docSnap.id, docSnap.data()))
}

function docToLink(id: string, data: Record<string, unknown>): NewsLink {
  return {
    id,
    advancementId: data["advancementId"] as string,
    submitterId: data["submitterId"] as string,
    title: data["title"] as string,
    url: data["url"] as string,
    score: data["score"] as number,
    createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
  }
}
