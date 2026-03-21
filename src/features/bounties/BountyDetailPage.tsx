import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { useToast } from "@/shared/components/Toast"
import {
  getBounty,
  getSubmissionsForBounty,
  claimBounty,
  publishBounty,
  cancelBounty,
  abandonBounty,
  submitWork,
  reviewSubmission,
} from "./bounty-service"
import { canContribute } from "@/domain/reputation"
import { ADVANCEMENTS } from "@/domain/advancement"
import type { Bounty, BountySubmission, BountyStatus } from "@/domain/bounty"

const STATUS_STYLES: Record<BountyStatus, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  open: "bg-green-500/20 text-green-400",
  claimed: "bg-blue-500/20 text-blue-400",
  submitted: "bg-amber-500/20 text-amber-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  abandoned: "bg-gray-500/20 text-gray-400",
  expired: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-gray-500/20 text-gray-400",
}

export function BountyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { guildUser } = useAuth()
  const { toast } = useToast()
  const [bounty, setBounty] = useState<Bounty | null>(null)
  const [submissions, setSubmissions] = useState<readonly BountySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [summary, setSummary] = useState("")
  const [rejectionFeedback, setRejectionFeedback] = useState("")

  const isCurrentUser = (userId: string) => guildUser?.uid === userId
  const isPoster = bounty ? isCurrentUser(bounty.posterId) : false
  const isHunter = bounty?.currentHunterId ? isCurrentUser(bounty.currentHunterId) : false
  const userIsContributor = guildUser ? canContribute(guildUser.repPoints, guildUser.role) : false

  async function loadBounty() {
    if (!id) return
    try {
      const [b, subs] = await Promise.all([
        getBounty(id),
        getSubmissionsForBounty(id),
      ])
      setBounty(b)
      setSubmissions(subs)
    } catch (err: unknown) {
      console.error("Failed to load bounty:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBounty()
  }, [id])

  async function handleClaim() {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const result = await claimBounty({
      hunterId: guildUser.uid,
      hunterName: guildUser.displayName,
      hunterRep: guildUser.repPoints,
      hunterRole: guildUser.role,
      bountyId: bounty.id,
    })
    setActionLoading(false)
    if (result.success) {
      toast("Bounty claimed!")
      await loadBounty()
    } else {
      toast(result.reason)
    }
  }

  async function handlePublish() {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const result = await publishBounty({ userId: guildUser.uid, bountyId: bounty.id })
    setActionLoading(false)
    if (result.success) {
      toast("Bounty published!")
      await loadBounty()
    } else {
      toast(result.reason)
    }
  }

  async function handleCancel() {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const result = await cancelBounty({ userId: guildUser.uid, bountyId: bounty.id })
    setActionLoading(false)
    if (result.success) {
      toast("Bounty cancelled")
      navigate("/bounties")
    } else {
      toast(result.reason)
    }
  }

  async function handleAbandon() {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const result = await abandonBounty({ hunterId: guildUser.uid, bountyId: bounty.id })
    setActionLoading(false)
    if (result.success) {
      toast("Bounty abandoned")
      await loadBounty()
    } else {
      toast(result.reason)
    }
  }

  async function handleSubmitWork() {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const latestRevision = submissions.length > 0 ? submissions[0]?.revisionNumber ?? 0 : -1
    const result = await submitWork({
      hunterId: guildUser.uid,
      hunterName: guildUser.displayName,
      bountyId: bounty.id,
      summary,
      contentLinks: [],
      externalLinks: [],
      revisionNumber: latestRevision + 1,
    })
    setActionLoading(false)
    if (result.success) {
      toast("Work submitted!")
      setSummary("")
      await loadBounty()
    } else {
      toast(result.reason)
    }
  }

  async function handleAccept(submissionId: string) {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const result = await reviewSubmission({
      reviewerId: guildUser.uid,
      bountyId: bounty.id,
      submissionId,
      action: "accept",
    })
    setActionLoading(false)
    if (result.success) {
      toast("Submission accepted!")
      await loadBounty()
    } else {
      toast(result.reason)
    }
  }

  async function handleReject(submissionId: string) {
    if (!bounty || !guildUser) return
    setActionLoading(true)
    const result = await reviewSubmission({
      reviewerId: guildUser.uid,
      bountyId: bounty.id,
      submissionId,
      action: "reject",
      rejectionFeedback,
    })
    setActionLoading(false)
    if (result.success) {
      toast("Submission rejected with feedback")
      setRejectionFeedback("")
      await loadBounty()
    } else {
      toast(result.reason)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-white/30">Loading...</p>
      </div>
    )
  }

  if (!bounty) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-center">
        <p className="text-white/50 text-lg">Bounty not found</p>
        <Link to="/bounties" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block">
          Back to Bounty Board
        </Link>
      </div>
    )
  }

  const advancementName = bounty.advancementId
    ? ADVANCEMENTS.find((a) => a.id === bounty.advancementId)?.name ?? bounty.advancementId
    : "Platform-wide"

  const pendingSubmission = submissions.find((s) => s.status === "pending")

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-4">
        <Link to="/bounties" className="text-white/40 hover:text-white/60 text-sm">
          Bounty Board
        </Link>
        <span className="text-white/20 mx-2">/</span>
        <span className="text-white/60 text-sm">{bounty.title}</span>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-2.5 py-1 rounded text-xs font-medium ${STATUS_STYLES[bounty.status]}`}>
            {bounty.status}
          </span>
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-white/60">
            {bounty.difficulty}
          </span>
          <span className="px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-white/60">
            {bounty.bountyType}
          </span>
          <span className="px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-sm font-semibold ml-auto">
            +{bounty.rewardAmount} rep
          </span>
        </div>

        <h1 className="text-white font-display text-2xl mb-4">{bounty.title}</h1>

        <div className="text-white/40 text-sm mb-4 flex items-center gap-3">
          <span>Posted by <span className="text-white/70">{bounty.posterName}</span></span>
          <span>{advancementName}</span>
          {bounty.claimCount > 0 && (
            <span>{bounty.claimCount} claim{bounty.claimCount > 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="text-white/70 whitespace-pre-wrap mb-6">{bounty.description}</div>

        <div className="flex flex-wrap gap-3">
          {bounty.status === "open" && !isPoster && userIsContributor && (
            <button
              onClick={handleClaim}
              disabled={actionLoading}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Claim Bounty
            </button>
          )}

          {bounty.status === "draft" && isPoster && (
            <>
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Publish
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel Bounty
              </button>
            </>
          )}

          {bounty.status === "open" && isPoster && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel Bounty
            </button>
          )}

          {bounty.status === "claimed" && isHunter && (
            <button
              onClick={handleAbandon}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Abandon Bounty
            </button>
          )}
        </div>
      </div>

      {(bounty.status === "claimed" || bounty.status === "rejected") && isHunter && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mt-6">
          <h2 className="text-white font-medium text-lg mb-4">Submit Work</h2>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe the work you completed (100-2000 characters)..."
            className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white placeholder-white/30 text-sm min-h-[120px]"
            aria-label="Work summary"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-white/30 text-xs">{summary.length}/2000</span>
            <button
              onClick={handleSubmitWork}
              disabled={actionLoading || summary.trim().length < 100}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Submit Work
            </button>
          </div>
        </div>
      )}

      {bounty.status === "submitted" && isPoster && pendingSubmission && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mt-6">
          <h2 className="text-white font-medium text-lg mb-4">Review Submission</h2>
          <div className="text-white/70 text-sm mb-4 whitespace-pre-wrap">
            {pendingSubmission.summary}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleAccept(pendingSubmission.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Accept
            </button>
            <textarea
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              placeholder="Rejection feedback (100+ characters required)..."
              className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white placeholder-white/30 text-sm min-h-[80px]"
              aria-label="Rejection feedback"
            />
            <button
              onClick={() => handleReject(pendingSubmission.id)}
              disabled={actionLoading || rejectionFeedback.trim().length < 100}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-white font-medium text-lg mb-4">Submissions</h2>
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white/70 text-sm font-medium">{sub.hunterName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    sub.status === "accepted" ? "bg-green-500/20 text-green-400" :
                    sub.status === "rejected" ? "bg-red-500/20 text-red-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>
                    {sub.status}
                  </span>
                  <span className="text-white/30 text-xs">Revision {sub.revisionNumber}</span>
                </div>
                <p className="text-white/60 text-sm">{sub.summary}</p>
                {sub.rejectionFeedback && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded text-red-300 text-xs">
                    Feedback: {sub.rejectionFeedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
