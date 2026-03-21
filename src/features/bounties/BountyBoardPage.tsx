import { useState, useEffect } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { getBounties } from "./bounty-service"
import { canContribute } from "@/domain/reputation"
import { BOUNTY_DIFFICULTIES, BOUNTY_TYPES, type Bounty, type BountyDifficulty, type BountyType } from "@/domain/bounty"
import { ADVANCEMENTS } from "@/domain/advancement"

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const DIFFICULTY_COLORS: Record<BountyDifficulty, string> = {
  newcomer: "bg-green-500/20 text-green-400",
  standard: "bg-blue-500/20 text-blue-400",
  advanced: "bg-amber-500/20 text-amber-400",
  expert: "bg-red-500/20 text-red-400",
}

const TYPE_COLORS: Record<BountyType, string> = {
  research: "bg-purple-500/20 text-purple-400",
  writing: "bg-cyan-500/20 text-cyan-400",
  review: "bg-teal-500/20 text-teal-400",
  data: "bg-orange-500/20 text-orange-400",
  discussion: "bg-pink-500/20 text-pink-400",
  translation: "bg-indigo-500/20 text-indigo-400",
  curation: "bg-lime-500/20 text-lime-400",
}

function BountyCard({ bounty }: { readonly bounty: Bounty }) {
  return (
    <Link
      to={`/bounties/${bounty.id}`}
      className="block bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors"
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[bounty.difficulty]}`}>
          {bounty.difficulty}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[bounty.bountyType]}`}>
          {bounty.bountyType}
        </span>
        {bounty.advancementId && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60">
            {ADVANCEMENTS.find((a) => a.id === bounty.advancementId)?.name ?? bounty.advancementId}
          </span>
        )}
      </div>

      <h3 className="text-white font-medium text-lg mb-2">{bounty.title}</h3>
      <p className="text-white/50 text-sm line-clamp-2 mb-4">{bounty.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-white/40">
          <span className="text-white/70">{bounty.posterName}</span>
          <span>{timeAgo(bounty.createdAt)}</span>
          {bounty.claimCount > 0 && <span>{bounty.claimCount} claim{bounty.claimCount > 1 ? "s" : ""}</span>}
        </div>
        <span className="px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-sm font-semibold">
          +{bounty.rewardAmount} rep
        </span>
      </div>
    </Link>
  )
}

function SkeletonList() {
  return (
    <div data-testid="bounty-skeleton" className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-5 animate-pulse">
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 bg-white/10 rounded" />
            <div className="h-5 w-16 bg-white/10 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-white/10 rounded mb-2" />
          <div className="h-4 w-full bg-white/10 rounded mb-4" />
          <div className="flex justify-between">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-6 w-20 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function BountyBoardPage() {
  const { guildUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [bounties, setBounties] = useState<readonly Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [difficultyFilter, setDifficultyFilter] = useState<BountyDifficulty | "">("")
  const [typeFilter, setTypeFilter] = useState<BountyType | "">("")

  const advancementFilter = searchParams.get("advancement") ?? undefined
  const isContributor = guildUser ? canContribute(guildUser.repPoints, guildUser.role) : false

  useEffect(() => {
    setLoading(true)
    getBounties({
      ...(advancementFilter !== undefined ? { advancementId: advancementFilter } : {}),
      ...(difficultyFilter ? { difficulty: difficultyFilter } : {}),
      ...(typeFilter ? { bountyType: typeFilter } : {}),
      status: "open",
    })
      .then(setBounties)
      .catch((err: unknown) => console.error("Failed to load bounties:", err))
      .finally(() => setLoading(false))
  }, [advancementFilter, difficultyFilter, typeFilter])

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">The Bounty Board</h1>
          <p className="text-white/40 mt-1">Find work that matters. Earn rep for completing it.</p>
        </div>
        {isContributor && (
          <button
            onClick={() => navigate("/bounties/new")}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors"
          >
            Post Bounty
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as BountyDifficulty | "")}
          className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
          aria-label="Filter by difficulty"
        >
          <option value="">All Difficulties</option>
          {BOUNTY_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as BountyType | "")}
          className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          {BOUNTY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonList />
      ) : bounties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/50 text-lg">No bounties yet</p>
          <p className="text-white/30 text-sm mt-2">Be the first to post a bounty for the community.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  )
}
