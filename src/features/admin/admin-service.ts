import {
  collection,
  doc,
  getDocs,
  getCountFromServer,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { db, app } from "@/lib/firebase"
import type { GuildUser } from "@/domain/user"
import type { UserBackground } from "@/domain/onboarding"
import type { TreeNode } from "@/domain/node"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"
import type { DiscussionThread } from "@/domain/discussion"

export async function getAllUsers(): Promise<readonly GuildUser[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      uid: docSnap.id,
      email: (d["email"] as string) ?? "",
      displayName: (d["displayName"] as string) ?? "",
      repPoints: (d["repPoints"] as number) ?? 0,
      isSchoolEmail: (d["isSchoolEmail"] as boolean) ?? false,
      createdAt: (d["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
      onboardingComplete: (d["onboardingComplete"] as boolean) ?? false,
      country: (d["country"] as string | undefined) ?? null,
      background: (d["background"] as UserBackground | undefined) ?? null,
      interests: (d["interests"] as readonly string[] | undefined) ?? [],
      bio: (d["bio"] as string | undefined) ?? "",
    }
  })
}

export async function updateUserRep(uid: string, newRep: number): Promise<void> {
  await updateDoc(doc(db, "users", uid), { repPoints: newRep })
}

export async function updateUserField(uid: string, field: string, value: unknown): Promise<void> {
  await updateDoc(doc(db, "users", uid), { [field]: value })
}

export async function deleteUser(uid: string): Promise<void> {
  const functions = getFunctions(app)
  const deleteUserAccount = httpsCallable(functions, "deleteUserAccount")
  await deleteUserAccount({ uid })
}

export async function getAllNodes(): Promise<readonly TreeNode[]> {
  const q = query(collection(db, "nodes"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: d["advancementId"] as string,
      parentNodeId: (d["parentNodeId"] as string | null) ?? null,
      authorId: d["authorId"] as string,
      title: d["title"] as string,
      description: d["description"] as string,
      status: d["status"] as TreeNode["status"],
      supportCount: (d["supportCount"] as number) ?? 0,
      createdAt: (d["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}

export async function deleteNode(nodeId: string): Promise<void> {
  await deleteDoc(doc(db, "nodes", nodeId))
}

export async function updateNodeField(nodeId: string, field: string, value: unknown): Promise<void> {
  await updateDoc(doc(db, "nodes", nodeId), { [field]: value })
}

export async function getAllLibraryEntries(): Promise<readonly LibraryEntry[]> {
  const q = query(collection(db, "libraryEntries"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    const urlVal = d["url"] as string | undefined
    const base = {
      id: docSnap.id,
      advancementId: d["advancementId"] as string,
      authorId: d["authorId"] as string,
      title: d["title"] as string,
      content: d["content"] as string,
      contentType: d["contentType"] as LibraryEntry["contentType"],
      difficulty: d["difficulty"] as LibraryEntry["difficulty"],
      createdAt: (d["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
      updatedAt: (d["updatedAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
    return urlVal ? { ...base, url: urlVal } : base
  })
}

export async function deleteLibraryEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, "libraryEntries", entryId))
}

export async function getAllNewsLinks(): Promise<readonly NewsLink[]> {
  const q = query(collection(db, "newsLinks"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: d["advancementId"] as string,
      submitterId: d["submitterId"] as string,
      title: d["title"] as string,
      url: d["url"] as string,
      score: (d["score"] as number) ?? 0,
      createdAt: (d["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}

export async function deleteNewsLink(linkId: string): Promise<void> {
  await deleteDoc(doc(db, "newsLinks", linkId))
}

export async function getAllThreads(): Promise<readonly DiscussionThread[]> {
  const q = query(collection(db, "discussionThreads"), orderBy("createdAt", "desc"), limit(200))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: d["advancementId"] as string,
      authorId: d["authorId"] as string,
      authorName: d["authorName"] as string,
      title: d["title"] as string,
      body: d["body"] as string,
      replyCount: (d["replyCount"] as number) ?? 0,
      lastActivityAt: (d["lastActivityAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
      createdAt: (d["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}

export async function deleteThread(threadId: string): Promise<void> {
  await deleteDoc(doc(db, "discussionThreads", threadId))
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
