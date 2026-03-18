export type ContributionDay = {
  readonly date: string
  readonly count: number
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function calculateStreak(activityDates: readonly Date[]): number {
  if (activityDates.length === 0) return 0

  const uniqueDays = new Set(activityDates.map((d) => toDateKey(d)))
  const today = startOfDay(new Date())
  const todayKey = toDateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)

  const hasToday = uniqueDays.has(todayKey)
  const hasYesterday = uniqueDays.has(yesterdayKey)

  if (!hasToday && !hasYesterday) return 0

  let streak = 0
  const start = hasToday ? today : yesterday
  const current = new Date(start)

  while (uniqueDays.has(toDateKey(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }

  return streak
}

export function generateHeatmapData(activityDates: readonly Date[]): readonly ContributionDay[] {
  const counts = new Map<string, number>()
  for (const date of activityDates) {
    const key = toDateKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const days: ContributionDay[] = []
  const today = startOfDay(new Date())

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const key = toDateKey(date)
    days.push({ date: key, count: counts.get(key) ?? 0 })
  }

  return days
}
