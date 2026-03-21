import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  writeBatch,
  serverTimestamp,
  increment,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { parseBountyDoc, parseBountySubmissionDoc } from "@/lib/firestore-schemas"
import {
  validateCreateBounty,
  validateClaimBounty,
  validateSubmitWork,
  validateReviewSubmission,
  validateCancelBounty,
  validateUpdateBounty,
  CLAIM_WINDOW_DAYS,
  POSTER_BONUSES,
  type Bounty,
  type BountySubmission,
  type BountyType,
  type BountyDifficulty,
} from "@/domain/bounty"
import type { UserRole } from "@/domain/user"
import { createNotification } from "@/features/notifications/notification-service"

type ServiceResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

type CreateBountyParams = {
  readonly posterId: string
  readonly posterName: string
  readonly posterRep: number
  readonly posterRole: UserRole
  readonly title: string
  readonly description: string
  readonly advancementId: string | null
  readonly bountyType: BountyType
  readonly difficulty: BountyDifficulty
  readonly rewardAmount: number
  readonly deadline: Date | null
}

type CreateBountyResult =
  | { readonly success: true; readonly bountyId: string }
  | { readonly success: false; readonly reason: string }

export async function createBounty(
  params: CreateBountyParams,
): Promise<CreateBountyResult> {
  const validation = validateCreateBounty({
    authorRep: params.posterRep,
    authorRole: params.posterRole,
    title: params.title,
    description: params.description,
    difficulty: params.difficulty,
    rewardAmount: params.rewardAmount,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const rateCheck = await checkRateLimit(params.posterId, "bounties")
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason }
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "bounties"))
  batch.set(newDocRef, {
    posterId: params.posterId,
    posterName: params.posterName,
    title: params.title.trim(),
    description: params.description.trim(),
    advancementId: params.advancementId,
    bountyType: params.bountyType,
    difficulty: params.difficulty,
    rewardAmount: params.rewardAmount,
    status: "draft",
    deadline: params.deadline,
    claimWindowDays: CLAIM_WINDOW_DAYS[params.difficulty],
    currentHunterId: null,
    currentHunterName: null,
    claimedAt: null,
    claimCount: 0,
    relatedContentIds: [],
    isSystemBounty: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  addRateLimitToBatch(batch, params.posterId, "bounties")
  await batch.commit()

  return { success: true, bountyId: newDocRef.id }
}

async function fetchBounty(bountyId: string): Promise<Bounty | null> {
  const bountyDoc = await getDoc(doc(db, "bounties", bountyId))
  if (!bountyDoc.exists()) return null
  return parseBountyDoc(bountyDoc.id, bountyDoc.data())
}

type PublishBountyParams = {
  readonly userId: string
  readonly bountyId: string
}

export async function publishBounty(
  params: PublishBountyParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  if (bounty.posterId !== params.userId) {
    return { success: false, reason: "Only the poster can publish this bounty" }
  }

  if (bounty.status !== "draft") {
    return { success: false, reason: "Only draft bounties can be published" }
  }

  await updateDoc(doc(db, "bounties", params.bountyId), {
    status: "open",
    updatedAt: serverTimestamp(),
  })

  return { success: true }
}

type UpdateBountyParams = {
  readonly userId: string
  readonly bountyId: string
  readonly title: string
  readonly description: string
  readonly difficulty: BountyDifficulty
  readonly rewardAmount: number
}

export async function updateBounty(
  params: UpdateBountyParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  const validation = validateUpdateBounty({
    userId: params.userId,
    bounty,
    title: params.title,
    description: params.description,
    difficulty: params.difficulty,
    rewardAmount: params.rewardAmount,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  await updateDoc(doc(db, "bounties", params.bountyId), {
    title: params.title.trim(),
    description: params.description.trim(),
    difficulty: params.difficulty,
    rewardAmount: params.rewardAmount,
    claimWindowDays: CLAIM_WINDOW_DAYS[params.difficulty],
    updatedAt: serverTimestamp(),
  })

  return { success: true }
}

type CancelBountyParams = {
  readonly userId: string
  readonly bountyId: string
}

export async function cancelBounty(
  params: CancelBountyParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  const validation = validateCancelBounty({
    userId: params.userId,
    bounty,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  await updateDoc(doc(db, "bounties", params.bountyId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  })

  return { success: true }
}

type ClaimBountyParams = {
  readonly hunterId: string
  readonly hunterName: string
  readonly hunterRep: number
  readonly hunterRole: UserRole
  readonly bountyId: string
}

export async function claimBounty(
  params: ClaimBountyParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  const validation = validateClaimBounty({
    hunterRep: params.hunterRep,
    hunterRole: params.hunterRole,
    hunterId: params.hunterId,
    bounty,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  await updateDoc(doc(db, "bounties", params.bountyId), {
    status: "claimed",
    currentHunterId: params.hunterId,
    currentHunterName: params.hunterName,
    claimedAt: serverTimestamp(),
    claimCount: increment(1),
    updatedAt: serverTimestamp(),
  })

  createNotification({
    userId: bounty.posterId,
    type: "bounty_claimed",
    message: `${params.hunterName} claimed your bounty "${bounty.title}"`,
    link: `/bounties/${params.bountyId}`,
  }).catch((err: unknown) =>
    console.error("Failed to send bounty_claimed notification:", err),
  )

  return { success: true }
}

type AbandonBountyParams = {
  readonly hunterId: string
  readonly bountyId: string
}

export async function abandonBounty(
  params: AbandonBountyParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  if (bounty.status !== "claimed") {
    return { success: false, reason: "This bounty is not currently claimed" }
  }

  if (bounty.currentHunterId !== params.hunterId) {
    return {
      success: false,
      reason: "Only the current hunter can abandon this bounty",
    }
  }

  await updateDoc(doc(db, "bounties", params.bountyId), {
    status: "open",
    currentHunterId: null,
    currentHunterName: null,
    claimedAt: null,
    updatedAt: serverTimestamp(),
  })

  return { success: true }
}

type SubmitWorkParams = {
  readonly hunterId: string
  readonly hunterName: string
  readonly bountyId: string
  readonly summary: string
  readonly contentLinks: readonly string[]
  readonly externalLinks: readonly string[]
  readonly revisionNumber: number
}

export async function submitWork(
  params: SubmitWorkParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  const validation = validateSubmitWork({
    hunterId: params.hunterId,
    bounty,
    summary: params.summary,
    revisionNumber: params.revisionNumber,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const batch = writeBatch(db)
  const submissionRef = doc(collection(db, "bountySubmissions"))
  batch.set(submissionRef, {
    bountyId: params.bountyId,
    hunterId: params.hunterId,
    hunterName: params.hunterName,
    summary: params.summary.trim(),
    contentLinks: [...params.contentLinks],
    externalLinks: [...params.externalLinks],
    revisionNumber: params.revisionNumber,
    status: "pending",
    rejectionFeedback: null,
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  })
  batch.update(doc(db, "bounties", params.bountyId), {
    status: "submitted",
    updatedAt: serverTimestamp(),
  })
  await batch.commit()

  createNotification({
    userId: bounty.posterId,
    type: "bounty_submitted",
    message: `${params.hunterName} submitted work on "${bounty.title}"`,
    link: `/bounties/${params.bountyId}`,
  }).catch((err: unknown) =>
    console.error("Failed to send bounty_submitted notification:", err),
  )

  return { success: true }
}

type ReviewSubmissionParams = {
  readonly reviewerId: string
  readonly bountyId: string
  readonly submissionId: string
  readonly action: "accept" | "reject"
  readonly rejectionFeedback?: string
}

export async function reviewSubmission(
  params: ReviewSubmissionParams,
): Promise<ServiceResult> {
  const bounty = await fetchBounty(params.bountyId)
  if (!bounty) return { success: false, reason: "Bounty not found" }

  const subDoc = await getDoc(
    doc(db, "bountySubmissions", params.submissionId),
  )
  if (!subDoc.exists()) {
    return { success: false, reason: "Submission not found" }
  }

  const submission = parseBountySubmissionDoc(subDoc.id, subDoc.data())
  if (!submission) {
    return { success: false, reason: "Invalid submission data" }
  }

  const reviewRequest = {
    reviewerId: params.reviewerId,
    posterId: bounty.posterId,
    submission,
    action: params.action,
    ...(params.rejectionFeedback !== undefined
      ? { rejectionFeedback: params.rejectionFeedback }
      : {}),
  }
  const validation = validateReviewSubmission(reviewRequest)

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const batch = writeBatch(db)

  if (params.action === "accept") {
    batch.update(doc(db, "bountySubmissions", params.submissionId), {
      status: "accepted",
      reviewedAt: serverTimestamp(),
    })
    batch.update(doc(db, "bounties", params.bountyId), {
      status: "accepted",
      updatedAt: serverTimestamp(),
    })

    const posterBonus = POSTER_BONUSES[bounty.difficulty]
    batch.update(doc(db, "users", submission.hunterId), {
      repPoints: increment(bounty.rewardAmount),
    })
    batch.update(doc(db, "users", bounty.posterId), {
      repPoints: increment(posterBonus),
    })

    await batch.commit()

    createNotification({
      userId: submission.hunterId,
      type: "bounty_accepted",
      message: `Your work on "${bounty.title}" was accepted! +${bounty.rewardAmount} rep`,
      link: `/bounties/${params.bountyId}`,
    }).catch((err: unknown) =>
      console.error("Failed to send bounty_accepted notification:", err),
    )
  } else {
    const maxRevisionsReached = submission.revisionNumber >= 2

    batch.update(doc(db, "bountySubmissions", params.submissionId), {
      status: "rejected",
      rejectionFeedback: params.rejectionFeedback,
      reviewedAt: serverTimestamp(),
    })

    if (maxRevisionsReached) {
      batch.update(doc(db, "bounties", params.bountyId), {
        status: "open",
        currentHunterId: null,
        currentHunterName: null,
        claimedAt: null,
        updatedAt: serverTimestamp(),
      })
    } else {
      batch.update(doc(db, "bounties", params.bountyId), {
        status: "rejected",
        updatedAt: serverTimestamp(),
      })
    }

    await batch.commit()

    createNotification({
      userId: submission.hunterId,
      type: "bounty_rejected",
      message: `Your submission on "${bounty.title}" needs revision`,
      link: `/bounties/${params.bountyId}`,
    }).catch((err: unknown) =>
      console.error("Failed to send bounty_rejected notification:", err),
    )
  }

  return { success: true }
}

function filterNulls<T>(items: readonly (T | null)[]): readonly T[] {
  return items.filter((item): item is T => item !== null)
}

type GetBountiesParams = {
  readonly advancementId?: string
  readonly bountyType?: BountyType
  readonly difficulty?: BountyDifficulty
  readonly status?: string
  readonly pageSize?: number
  readonly cursor?: unknown
}

export async function getBounties(
  params: GetBountiesParams,
): Promise<readonly Bounty[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")]

  if (params.advancementId) {
    constraints.unshift(where("advancementId", "==", params.advancementId))
  }
  if (params.bountyType) {
    constraints.unshift(where("bountyType", "==", params.bountyType))
  }
  if (params.difficulty) {
    constraints.unshift(where("difficulty", "==", params.difficulty))
  }
  if (params.status) {
    constraints.unshift(where("status", "==", params.status))
  }
  if (params.pageSize) {
    constraints.push(limit(params.pageSize))
  }
  if (params.cursor) {
    constraints.push(startAfter(params.cursor))
  }

  const q = query(collection(db, "bounties"), ...constraints)
  const snapshot = await getDocs(q)

  return filterNulls(
    snapshot.docs.map((docSnap) => parseBountyDoc(docSnap.id, docSnap.data())),
  )
}

export async function getBounty(bountyId: string): Promise<Bounty | null> {
  return fetchBounty(bountyId)
}

export async function getSubmissionsForBounty(
  bountyId: string,
): Promise<readonly BountySubmission[]> {
  const q = query(
    collection(db, "bountySubmissions"),
    where("bountyId", "==", bountyId),
    orderBy("submittedAt", "desc"),
  )
  const snapshot = await getDocs(q)

  return filterNulls(
    snapshot.docs.map((docSnap) =>
      parseBountySubmissionDoc(docSnap.id, docSnap.data()),
    ),
  )
}
