import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { useToast } from "@/shared/components/Toast"
import { createBounty } from "./bounty-service"
import { BOUNTY_TYPES, BOUNTY_DIFFICULTIES, REWARD_RANGES, type BountyType, type BountyDifficulty } from "@/domain/bounty"
import { ADVANCEMENTS } from "@/domain/advancement"

export function CreateBountyPage() {
  const navigate = useNavigate()
  const { guildUser } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [advancementId, setAdvancementId] = useState("")
  const [bountyType, setBountyType] = useState<BountyType>("research")
  const [difficulty, setDifficulty] = useState<BountyDifficulty>("newcomer")
  const [rewardAmount, setRewardAmount] = useState(15)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const range = REWARD_RANGES[difficulty]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!guildUser) return
    setError("")
    setLoading(true)

    const result = await createBounty({
      posterId: guildUser.uid,
      posterName: guildUser.displayName,
      posterRep: guildUser.repPoints,
      posterRole: guildUser.role,
      title,
      description,
      advancementId: advancementId || null,
      bountyType,
      difficulty,
      rewardAmount,
      deadline: null,
    })

    setLoading(false)
    if (result.success) {
      toast("Bounty created!")
      navigate(`/bounties/${result.bountyId}`)
    } else {
      setError(result.reason)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-4">
        <Link to="/bounties" className="text-white/40 hover:text-white/60 text-sm">
          Bounty Board
        </Link>
        <span className="text-white/20 mx-2">/</span>
        <span className="text-white/60 text-sm">New Bounty</span>
      </div>

      <h1 className="font-display text-2xl text-white mb-6">Post a Bounty</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="bounty-title" className="block text-white/70 text-sm mb-1">Title</label>
          <input
            id="bounty-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What work needs to be done? (15-200 characters)"
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-white/30 text-sm"
          />
        </div>

        <div>
          <label htmlFor="bounty-description" className="block text-white/70 text-sm mb-1">Description</label>
          <textarea
            id="bounty-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work in detail (100-5000 characters)"
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-white/30 text-sm min-h-[150px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bounty-advancement" className="block text-white/70 text-sm mb-1">Advancement</label>
            <select
              id="bounty-advancement"
              value={advancementId}
              onChange={(e) => setAdvancementId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
            >
              <option value="">Platform-wide</option>
              {ADVANCEMENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bounty-type" className="block text-white/70 text-sm mb-1">Type</label>
            <select
              id="bounty-type"
              value={bountyType}
              onChange={(e) => setBountyType(e.target.value as BountyType)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
            >
              {BOUNTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bounty-difficulty" className="block text-white/70 text-sm mb-1">Difficulty</label>
            <select
              id="bounty-difficulty"
              value={difficulty}
              onChange={(e) => {
                const d = e.target.value as BountyDifficulty
                setDifficulty(d)
                const newRange = REWARD_RANGES[d]
                if (rewardAmount < newRange.min || rewardAmount > newRange.max) {
                  setRewardAmount(newRange.min)
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
            >
              {BOUNTY_DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bounty-reward" className="block text-white/70 text-sm mb-1">Reward</label>
            <input
              id="bounty-reward"
              type="number"
              min={range.min}
              max={range.max}
              value={rewardAmount}
              onChange={(e) => setRewardAmount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
            />
            <span className="text-white/30 text-xs mt-1 block">{range.min} - {range.max} rep</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
        </div>
      </form>
    </div>
  )
}
