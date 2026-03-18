import { doc, collection, query, where, orderBy, getDocs, serverTimestamp } from "firebase/firestore"
import type { WriteBatch } from "firebase/firestore"
import { db } from "./firebase"

export function addRateLimitToBatch(
  batch: WriteBatch,
  userId: string,
  collectionName: string,
): void {
  const limitRef = doc(db, "rateLimits", `${userId}_${collectionName}`)
  batch.set(limitRef, { lastWriteAt: serverTimestamp() })
}

type RateLimitConfig = {
  readonly perHour: number
  readonly perDay: number
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  nodes: { perHour: 10, perDay: 30 },
  discussionThreads: { perHour: 5, perDay: 20 },
  discussionReplies: { perHour: 30, perDay: 100 },
  newsLinks: { perHour: 5, perDay: 20 },
  libraryEntries: { perHour: 3, perDay: 10 },
  flags: { perHour: 10, perDay: 30 },
  peerReviews: { perHour: 5, perDay: 15 },
}

type RateLimitAllowed = { readonly allowed: true }
type RateLimitBlocked = { readonly allowed: false; readonly reason: string }
type RateLimitResult = RateLimitAllowed | RateLimitBlocked

const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * ONE_HOUR_MS

export function isWithinRateLimit(
  collectionName: string,
  recentTimestamps: readonly Date[],
): RateLimitResult {
  const config = RATE_LIMITS[collectionName]
  if (!config) return { allowed: true }

  const now = Date.now()
  const hourAgo = now - ONE_HOUR_MS
  const dayAgo = now - ONE_DAY_MS

  const inLastHour = recentTimestamps.filter((t) => t.getTime() > hourAgo).length
  const inLastDay = recentTimestamps.filter((t) => t.getTime() > dayAgo).length

  if (inLastDay >= config.perDay) {
    return { allowed: false, reason: `Daily limit reached (${config.perDay}/day). Try again tomorrow.` }
  }

  if (inLastHour >= config.perHour) {
    return { allowed: false, reason: `Hourly limit reached (${config.perHour}/hour). Try again later.` }
  }

  return { allowed: true }
}

export async function checkRateLimit(
  userId: string,
  collectionName: string,
): Promise<RateLimitResult> {
  const q = query(
    collection(db, collectionName),
    where("authorId", "==", userId),
    orderBy("createdAt", "desc"),
  )
  const snapshot = await getDocs(q)
  const timestamps = snapshot.docs.map((d) => {
    const ts = d.data()["createdAt"]
    if (ts && typeof ts === "object" && typeof (ts as Record<string, unknown>)["toDate"] === "function") {
      return (ts as { toDate: () => Date }).toDate()
    }
    return new Date()
  })
  return isWithinRateLimit(collectionName, timestamps)
}
