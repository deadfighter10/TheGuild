import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

function extractDates(docs: readonly { data: () => Record<string, unknown> }[]): readonly Date[] {
  return docs.map((d) => {
    const ts = d.data()["createdAt"]
    if (ts && typeof ts === "object" && typeof (ts as Record<string, unknown>)["toDate"] === "function") {
      return (ts as { toDate: () => Date }).toDate()
    }
    return new Date()
  })
}

type CollectionConfig = {
  readonly name: string
  readonly authorField: string
}

const CONTRIBUTION_COLLECTIONS: readonly CollectionConfig[] = [
  { name: "nodes", authorField: "authorId" },
  { name: "discussionThreads", authorField: "authorId" },
  { name: "discussionReplies", authorField: "authorId" },
  { name: "newsLinks", authorField: "submitterId" },
  { name: "libraryEntries", authorField: "authorId" },
]

export async function getUserContributionDates(userId: string): Promise<readonly Date[]> {
  const queries = CONTRIBUTION_COLLECTIONS.map(async (config) => {
    const q = query(
      collection(db, config.name),
      where(config.authorField, "==", userId),
      orderBy("createdAt", "desc"),
    )
    const snapshot = await getDocs(q)
    return extractDates(snapshot.docs)
  })

  const results = await Promise.all(queries)
  return results.flat()
}
