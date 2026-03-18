export type TimeRange = "7d" | "30d" | "90d" | "all"

export type AnalyticsMetric = {
  readonly label: string
  readonly value: number
  readonly previousValue: number | null
}

export type TimeSeriesPoint = {
  readonly date: string
  readonly value: number
}

export type ContentTrend = {
  readonly advancementId: string
  readonly advancementName: string
  readonly count: number
}

export type ModerationSummary = {
  readonly pending: number
  readonly dismissed: number
  readonly actioned: number
  readonly avgResolutionMs: number | null
}

export const TIME_RANGES: readonly { readonly value: TimeRange; readonly label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
] as const

const DAY_MS = 24 * 60 * 60 * 1000

const RANGE_DAYS: Record<TimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "all": 0,
}

export function getDateRangeStart(range: TimeRange): Date {
  if (range === "all") {
    return new Date(2020, 0, 1)
  }
  const now = new Date()
  return new Date(now.getTime() - RANGE_DAYS[range] * DAY_MS)
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function groupByDate(dates: readonly Date[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const date of dates) {
    const key = dateToKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}
