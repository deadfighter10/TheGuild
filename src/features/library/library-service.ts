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
import { validateCreateLibraryEntry, validateEditLibraryEntry } from "@/domain/library-entry"
import type { LibraryEntry, Difficulty, ContentType } from "@/domain/library-entry"

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
  const entry = docToEntry(entryDoc.id, data)

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
  const items = snapshot.docs.map((docSnap) => docToEntry(docSnap.id, docSnap.data()))
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null

  return { items, lastDoc, hasMore: snapshot.docs.length === PAGE_SIZE }
}

export async function getLibraryEntry(entryId: string): Promise<LibraryEntry | null> {
  const entryDoc = await getDoc(doc(db, "libraryEntries", entryId))
  if (!entryDoc.exists()) return null
  return docToEntry(entryDoc.id, entryDoc.data())
}

export async function getLibraryEntriesByAuthor(authorId: string): Promise<readonly LibraryEntry[]> {
  const q = query(
    collection(db, "libraryEntries"),
    where("authorId", "==", authorId),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => docToEntry(docSnap.id, docSnap.data()))
}

function docToEntry(id: string, data: Record<string, unknown>): LibraryEntry {
  const entry: LibraryEntry = {
    id,
    advancementId: data["advancementId"] as string,
    authorId: data["authorId"] as string,
    title: data["title"] as string,
    content: (data["content"] as string) ?? "",
    contentType: (data["contentType"] as ContentType) ?? "article",
    difficulty: data["difficulty"] as Difficulty,
    createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    updatedAt: (data["updatedAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
  }

  const url = data["url"] as string | undefined
  if (url) {
    return { ...entry, url }
  }

  return entry
}
