import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore"
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { checkRateLimit } from "@/lib/rate-limit"
import { validateCreateLibraryEntry, validateEditLibraryEntry } from "@/domain/library-entry"
import type { LibraryEntry, Difficulty, ContentType, EntryVersion } from "@/domain/library-entry"
import { parseLibraryEntryDoc, parseEntryVersionDoc } from "@/lib/firestore-schemas"

type CreateEntryParams = {
  readonly authorId: string
  readonly authorRep: number
  readonly advancementId: string
  readonly title: string
  readonly content: string
  readonly contentType: ContentType
  readonly url?: string | undefined
  readonly difficulty: Difficulty
}

type CreateEntryResult =
  | { readonly success: true; readonly entryId: string }
  | { readonly success: false; readonly reason: string }

export async function createLibraryEntry(params: CreateEntryParams): Promise<CreateEntryResult> {
  const validation = validateCreateLibraryEntry({
    authorRep: params.authorRep,
    title: params.title,
    content: params.content,
    contentType: params.contentType,
    url: params.url,
    advancementId: params.advancementId,
    difficulty: params.difficulty,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const rateCheck = await checkRateLimit(params.authorId, "libraryEntries")
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason }
  }

  const docData: Record<string, unknown> = {
    advancementId: params.advancementId,
    authorId: params.authorId,
    title: params.title.trim(),
    content: params.content.trim(),
    contentType: params.contentType,
    difficulty: params.difficulty,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (params.url?.trim()) {
    docData["url"] = params.url.trim()
  }

  const docRef = await addDoc(collection(db, "libraryEntries"), docData)

  return { success: true, entryId: docRef.id }
}

type EditEntryParams = {
  readonly userId: string
  readonly userRep: number
  readonly entryId: string
  readonly title: string
  readonly content: string
  readonly contentType: ContentType
  readonly url?: string | undefined
  readonly difficulty: Difficulty
}

type EditEntryResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function editLibraryEntry(params: EditEntryParams): Promise<EditEntryResult> {
  const entryDoc = await getDoc(doc(db, "libraryEntries", params.entryId))
  if (!entryDoc.exists()) {
    return { success: false, reason: "Entry not found" }
  }

  const data = entryDoc.data()
  const entry = parseLibraryEntryDoc(entryDoc.id, data as Record<string, unknown>)
  if (!entry) {
    return { success: false, reason: "Entry data is invalid" }
  }

  const validation = validateEditLibraryEntry({
    userId: params.userId,
    userRep: params.userRep,
    entry,
    title: params.title,
    content: params.content,
    contentType: params.contentType,
    url: params.url,
    difficulty: params.difficulty,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  await addDoc(collection(db, "libraryEntryVersions"), {
    entryId: params.entryId,
    title: entry.title,
    content: entry.content,
    contentType: entry.contentType,
    difficulty: entry.difficulty,
    editedBy: params.userId,
    createdAt: serverTimestamp(),
  })

  const updateData: Record<string, unknown> = {
    title: params.title.trim(),
    content: params.content.trim(),
    contentType: params.contentType,
    difficulty: params.difficulty,
    updatedAt: serverTimestamp(),
  }

  if (params.url?.trim()) {
    updateData["url"] = params.url.trim()
  }

  await updateDoc(doc(db, "libraryEntries", params.entryId), updateData)

  return { success: true }
}

const PAGE_SIZE = 20

export type PageResult<T> = {
  readonly items: readonly T[]
  readonly lastDoc: QueryDocumentSnapshot<DocumentData> | null
  readonly hasMore: boolean
}

export async function getLibraryEntries(
  advancementId?: string,
  cursor?: QueryDocumentSnapshot<DocumentData>,
): Promise<PageResult<LibraryEntry>> {
  const ref = collection(db, "libraryEntries")
  const constraints = [
    ...(advancementId ? [where("advancementId", "==", advancementId)] : []),
    orderBy("createdAt", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(PAGE_SIZE),
  ]
  const q = query(ref, ...constraints)

  const snapshot = await getDocs(q)
  const items = snapshot.docs
    .map((docSnap) => parseLibraryEntryDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item): item is LibraryEntry => item !== null)
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null

  return { items, lastDoc, hasMore: snapshot.docs.length === PAGE_SIZE }
}

export async function getLibraryEntry(entryId: string): Promise<LibraryEntry | null> {
  const entryDoc = await getDoc(doc(db, "libraryEntries", entryId))
  if (!entryDoc.exists()) return null
  return parseLibraryEntryDoc(entryDoc.id, entryDoc.data() as Record<string, unknown>)
}

export async function getLibraryEntriesByAuthor(authorId: string): Promise<readonly LibraryEntry[]> {
  const q = query(
    collection(db, "libraryEntries"),
    where("authorId", "==", authorId),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseLibraryEntryDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item): item is LibraryEntry => item !== null)
}

export type { EntryVersion } from "@/domain/library-entry"

export async function getEntryVersions(entryId: string): Promise<readonly EntryVersion[]> {
  const q = query(
    collection(db, "libraryEntryVersions"),
    where("entryId", "==", entryId),
    orderBy("createdAt", "desc"),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseEntryVersionDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((item): item is EntryVersion => item !== null)
}

