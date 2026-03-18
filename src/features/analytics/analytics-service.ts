import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  getDateRangeStart,
  groupByDate,
  type TimeRange,
  type TimeSeriesPoint,
  type ContentTrend,
  type ModerationSummary,
  type AnalyticsMetric,
} from "@/domain/analytics"
import { ADVANCEMENTS } from "@/domain/advancement"

function extractTimestamp(data: Record<string, unknown>, field: string): Date | null {
  const ts = data[field]
  if (ts && typeof ts === "object" && typeof (ts as Record<string, unknown>)["toDate"] === "function") {
    return (ts as { toDate: () => Date }).toDate()
  }
  return null
}

function toTimeSeries(dateCounts: Map<string, number>): readonly TimeSeriesPoint[] {
  return [...dateCounts.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getPageViewStats(range: TimeRange): Promise<readonly TimeSeriesPoint[]> {
  const start = getDateRangeStart(range)
  const q = query(
    collection(db, "pageViews"),
    where("timestamp", ">=", Timestamp.fromDate(start)),
    orderBy("timestamp", "desc"),
    limit(10000),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return []

  const dates = snapshot.docs
    .map((d) => extractTimestamp(d.data(), "timestamp"))
    .filter((d): d is Date => d !== null)

  return toTimeSeries(groupByDate(dates))
}

export async function getUserGrowthStats(range: TimeRange): Promise<readonly TimeSeriesPoint[]> {
  const start = getDateRangeStart(range)
  const q = query(
    collection(db, "users"),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    orderBy("createdAt", "desc"),
    limit(10000),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return []

  const dates = snapshot.docs
    .map((d) => extractTimestamp(d.data(), "createdAt"))
    .filter((d): d is Date => d !== null)

  return toTimeSeries(groupByDate(dates))
}

export async function getContentTrends(range: TimeRange): Promise<readonly ContentTrend[]> {
  const start = getDateRangeStart(range)
  const q = query(
    collection(db, "nodes"),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    orderBy("createdAt", "desc"),
    limit(10000),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return []

  const advancementCounts = new Map<string, number>()
  for (const doc of snapshot.docs) {
    const advId = doc.data()["advancementId"] as string
    if (advId) {
      advancementCounts.set(advId, (advancementCounts.get(advId) ?? 0) + 1)
    }
  }

  return ADVANCEMENTS
    .filter((a) => advancementCounts.has(a.id))
    .map((a) => ({
      advancementId: a.id,
      advancementName: a.name,
      count: advancementCounts.get(a.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getModerationStats(): Promise<ModerationSummary> {
  const q = query(
    collection(db, "flags"),
    orderBy("createdAt", "desc"),
    limit(1000),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) {
    return { pending: 0, dismissed: 0, actioned: 0, avgResolutionMs: null }
  }

  let pending = 0
  let dismissed = 0
  let actioned = 0
  const resolutionTimes: number[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const status = data["status"] as string

    if (status === "pending") pending++
    else if (status === "dismissed") dismissed++
    else if (status === "actioned") actioned++

    if (status !== "pending") {
      const created = extractTimestamp(data, "createdAt")
      const resolved = extractTimestamp(data, "resolvedAt")
      if (created && resolved) {
        resolutionTimes.push(resolved.getTime() - created.getTime())
      }
    }
  }

  const avgResolutionMs = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : null

  return { pending, dismissed, actioned, avgResolutionMs }
}

export async function getOverviewMetrics(): Promise<readonly AnalyticsMetric[]> {
  const [users, nodes, entries, links, threads] = await Promise.all([
    getCountFromServer(query(collection(db, "users"))),
    getCountFromServer(query(collection(db, "nodes"))),
    getCountFromServer(query(collection(db, "libraryEntries"))),
    getCountFromServer(query(collection(db, "newsLinks"))),
    getCountFromServer(query(collection(db, "discussionThreads"))),
  ])

  return [
    { label: "Total Users", value: users.data().count, previousValue: null },
    { label: "Ideas", value: nodes.data().count, previousValue: null },
    { label: "Library Entries", value: entries.data().count, previousValue: null },
    { label: "News Links", value: links.data().count, previousValue: null },
    { label: "Discussions", value: threads.data().count, previousValue: null },
  ]
}
