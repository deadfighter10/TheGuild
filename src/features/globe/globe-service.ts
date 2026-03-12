import { collection, getDocs, getCountFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { aggregateUsersByCountry } from "@/domain/globe-data"

export async function fetchCountryUserCounts(): Promise<Map<string, number>> {
  try {
    const snapshot = await getDocs(collection(db, "users"))
    const users = snapshot.docs.map((docSnap) => ({
      country: (docSnap.data()["country"] as string | undefined) ?? null,
    }))
    return aggregateUsersByCountry(users)
  } catch {
    return new Map()
  }
}

export type LiveStats = {
  readonly members: number
  readonly nodes: number
  readonly libraryEntries: number
  readonly newsLinks: number
}

export async function fetchLiveStats(): Promise<LiveStats> {
  try {
    const [members, nodes, libraryEntries, newsLinks] = await Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(collection(db, "nodes")),
      getCountFromServer(collection(db, "libraryEntries")),
      getCountFromServer(collection(db, "newsLinks")),
    ])
    return {
      members: members.data().count,
      nodes: nodes.data().count,
      libraryEntries: libraryEntries.data().count,
      newsLinks: newsLinks.data().count,
    }
  } catch {
    return { members: 0, nodes: 0, libraryEntries: 0, newsLinks: 0 }
  }
}
