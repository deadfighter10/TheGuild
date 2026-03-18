import { useState, useEffect, useCallback } from "react"
import { TIME_RANGES, type TimeRange, type TimeSeriesPoint, type ContentTrend, type ModerationSummary, type AnalyticsMetric } from "@/domain/analytics"
import {
  getOverviewMetrics,
  getPageViewStats,
  getUserGrowthStats,
  getContentTrends,
  getModerationStats,
} from "./analytics-service"

const METRIC_COLORS = [
  "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-300",
  "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-300",
  "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-300",
  "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-300",
  "from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-300",
]

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) return `${Math.round(ms / (1000 * 60))}m`
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function BarChart({ data, color }: { readonly data: readonly TimeSeriesPoint[]; readonly color: string }) {
  if (data.length === 0) {
    return <p className="text-xs text-white/20 py-4">No data for this period</p>
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex items-end gap-px h-32">
      {data.map((point) => (
        <div
          key={point.date}
          className="flex-1 min-w-[2px] rounded-t-sm transition-all"
          style={{
            height: `${(point.value / maxValue) * 100}%`,
            backgroundColor: color,
            minHeight: point.value > 0 ? "2px" : "0px",
          }}
          title={`${point.date}: ${point.value}`}
        />
      ))}
    </div>
  )
}

function TrendBars({ data }: { readonly data: readonly ContentTrend[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-white/20 py-4">No content created in this period</p>
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-2">
      {data.map((trend) => (
        <div key={trend.advancementId} className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 font-mono w-24 truncate">{trend.advancementName.split(" ")[0]}</span>
          <div className="flex-1 h-5 bg-white/[0.03] rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500/40 to-violet-500/20 rounded transition-all"
              style={{ width: `${(trend.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/50 font-mono w-8 text-right">{trend.count}</span>
        </div>
      ))}
    </div>
  )
}

function ModerationCard({ stats }: { readonly stats: ModerationSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/5">
        <p className="text-[10px] font-mono text-amber-400/50 uppercase tracking-widest">Pending</p>
        <p className="text-lg font-display text-amber-300 mt-1">{stats.pending}</p>
      </div>
      <div className="p-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5">
        <p className="text-[10px] font-mono text-emerald-400/50 uppercase tracking-widest">Actioned</p>
        <p className="text-lg font-display text-emerald-300 mt-1">{stats.actioned}</p>
      </div>
      <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Dismissed</p>
        <p className="text-lg font-display text-white/50 mt-1">{stats.dismissed}</p>
      </div>
      <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Avg Resolution</p>
        <p className="text-lg font-display text-white/50 mt-1">
          {stats.avgResolutionMs !== null ? formatDuration(stats.avgResolutionMs) : "–"}
        </p>
      </div>
    </div>
  )
}

export function AnalyticsPanel() {
  const [range, setRange] = useState<TimeRange>("30d")
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<readonly AnalyticsMetric[]>([])
  const [pageViews, setPageViews] = useState<readonly TimeSeriesPoint[]>([])
  const [userGrowth, setUserGrowth] = useState<readonly TimeSeriesPoint[]>([])
  const [contentTrends, setContentTrends] = useState<readonly ContentTrend[]>([])
  const [moderation, setModeration] = useState<ModerationSummary>({ pending: 0, dismissed: 0, actioned: 0, avgResolutionMs: null })

  const loadData = useCallback(async (selectedRange: TimeRange) => {
    setLoading(true)
    try {
      const [m, pv, ug, ct, ms] = await Promise.all([
        getOverviewMetrics(),
        getPageViewStats(selectedRange),
        getUserGrowthStats(selectedRange),
        getContentTrends(selectedRange),
        getModerationStats(),
      ])
      setMetrics(m)
      setPageViews(pv)
      setUserGrowth(ug)
      setContentTrends(ct)
      setModeration(ms)
    } catch (err) {
      console.error("Failed to load analytics:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(range)
  }, [range, loadData])

  if (loading && metrics.length === 0) {
    return <p className="text-sm text-white/30 py-8">Loading analytics...</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06] w-fit">
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            onClick={() => setRange(tr.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              range === tr.value
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      <section>
        <h3 className="text-sm font-display text-white/60 mb-4">Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map((metric, i) => (
            <div
              key={metric.label}
              className={`p-4 rounded-xl border bg-gradient-to-br ${METRIC_COLORS[i % METRIC_COLORS.length]}`}
            >
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-60">{metric.label}</p>
              <p className="text-2xl font-display mt-1">{metric.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-display text-white/60 mb-4">Page Views</h3>
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <BarChart data={pageViews} color="rgba(34, 211, 238, 0.4)" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-display text-white/60 mb-4">User Growth</h3>
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <BarChart data={userGrowth} color="rgba(52, 211, 153, 0.4)" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-display text-white/60 mb-4">Content by Advancement</h3>
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <TrendBars data={contentTrends} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-display text-white/60 mb-4">Moderation</h3>
        <ModerationCard stats={moderation} />
      </section>
    </div>
  )
}
