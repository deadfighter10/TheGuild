import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  limit,
} from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { db, app } from "@/lib/firebase"
import type { GuildUser } from "@/domain/user"
import type { TreeNode } from "@/domain/node"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"
import type { DiscussionThread } from "@/domain/discussion"
import {
  parseGuildUserDoc,
  parseTreeNodeDoc,
  parseLibraryEntryDoc,
  parseNewsLinkDoc,
  parseDiscussionThreadDoc,
} from "@/lib/firestore-schemas"

const functions = getFunctions(app)

export async function getAllUsers(): Promise<readonly GuildUser[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseGuildUserDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((user): user is GuildUser => user !== null)
}

export async function updateUserRep(uid: string, newRep: number): Promise<void> {
  const adminUpdateRep = httpsCallable(functions, "adminUpdateUserRep")
  await adminUpdateRep({ uid, repPoints: newRep })
}

export async function deleteUser(uid: string): Promise<void> {
  const deleteUserAccount = httpsCallable(functions, "deleteUserAccount")
  await deleteUserAccount({ uid })
}

export async function getAllNodes(): Promise<readonly TreeNode[]> {
  const q = query(collection(db, "nodes"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseTreeNodeDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((node): node is TreeNode => node !== null)
}

export async function deleteNode(nodeId: string): Promise<void> {
  const adminDelete = httpsCallable(functions, "adminDeleteContent")
  await adminDelete({ collection: "nodes", docId: nodeId })
}

export async function deleteLibraryEntry(entryId: string): Promise<void> {
  const adminDelete = httpsCallable(functions, "adminDeleteContent")
  await adminDelete({ collection: "libraryEntries", docId: entryId })
}

export async function getAllLibraryEntries(): Promise<readonly LibraryEntry[]> {
  const q = query(collection(db, "libraryEntries"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseLibraryEntryDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((entry): entry is LibraryEntry => entry !== null)
}

export async function getAllNewsLinks(): Promise<readonly NewsLink[]> {
  const q = query(collection(db, "newsLinks"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseNewsLinkDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((link): link is NewsLink => link !== null)
}

export async function deleteNewsLink(linkId: string): Promise<void> {
  const adminDelete = httpsCallable(functions, "adminDeleteContent")
  await adminDelete({ collection: "newsLinks", docId: linkId })
}

export async function getAllThreads(): Promise<readonly DiscussionThread[]> {
  const q = query(collection(db, "discussionThreads"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => parseDiscussionThreadDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .filter((thread): thread is DiscussionThread => thread !== null)
}

export async function deleteThread(threadId: string): Promise<void> {
  const adminDelete = httpsCallable(functions, "adminDeleteContent")
  await adminDelete({ collection: "discussionThreads", docId: threadId })
}

export async function updateNodeField(nodeId: string, field: string, value: unknown): Promise<void> {
  const adminUpdate = httpsCallable(functions, "adminUpdateContent")
  await adminUpdate({ collection: "nodes", docId: nodeId, field, value })
}

export type AdminStats = {
  readonly users: number
  readonly nodes: number
  readonly libraryEntries: number
  readonly newsLinks: number
  readonly threads: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const [users, nodes, entries, links, threads] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(collection(db, "nodes")),
    getCountFromServer(collection(db, "libraryEntries")),
    getCountFromServer(collection(db, "newsLinks")),
    getCountFromServer(collection(db, "discussionThreads")),
  ])
  return {
    users: users.data().count,
    nodes: nodes.data().count,
    libraryEntries: entries.data().count,
    newsLinks: links.data().count,
    threads: threads.data().count,
  }
}
