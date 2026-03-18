import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { parsePeerReviewDoc } from "@/lib/firestore-schemas"
import type { PeerReview, PeerReviewContentType, PeerReviewDecision, PeerReviewStatus, ReviewFeedback } from "@/domain/peer-review"
import { createNotification } from "@/features/notifications/notification-service"
import { formatNotificationMessage, notificationLink } from "@/domain/notification"

export async function submitForReview(params: {
  readonly contentType: PeerReviewContentType
  readonly contentId: string
  readonly contentTitle: string
  readonly advancementId: string
  readonly authorId: string
  readonly authorName: string
}): Promise<string> {
  const existing = await getDocs(
    query(
      collection(db, "peerReviews"),
      where("contentId", "==", params.contentId),
      where("status", "in", ["pending", "in_review"]),
    ),
  )
  if (!existing.empty) {
    throw new Error("This content already has an active review")
  }

  const rateCheck = await checkRateLimit(params.authorId, "peerReviews")
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason)
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "peerReviews"))
  batch.set(newDocRef, {
    contentType: params.contentType,
    contentId: params.contentId,
    contentTitle: params.contentTitle,
    advancementId: params.advancementId,
    authorId: params.authorId,
    authorName: params.authorName,
    status: "pending",
    reviewerId: null,
    reviewerName: null,
    feedback: null,
    decision: null,
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  })
  addRateLimitToBatch(batch, params.authorId, "peerReviews")
  await batch.commit()

  return newDocRef.id
}

export async function claimReview(params: {
  readonly reviewId: string
  readonly reviewerId: string
  readonly reviewerName: string
}): Promise<void> {
  const reviewRef = doc(db, "peerReviews", params.reviewId)
  const reviewSnap = await getDoc(reviewRef)
  if (!reviewSnap.exists()) {
    throw new Error("Review not found")
  }

  const data = reviewSnap.data()
  const authorId = data["authorId"] as string
  if (params.reviewerId === authorId) {
    throw new Error("You cannot review your own content")
  }

  const status = data["status"] as string
  if (status !== "pending") {
    throw new Error("This review has already been claimed")
  }

  const batch = writeBatch(db)
  batch.update(reviewRef, {
    reviewerId: params.reviewerId,
    reviewerName: params.reviewerName,
    status: "in_review",
  })
  await batch.commit()

  const contentTitle = data["contentTitle"] as string
  const advancementId = data["advancementId"] as string
  createNotification({
    userId: authorId,
    type: "review",
    message: formatNotificationMessage({
      type: "review",
      actorName: params.reviewerName,
      targetTitle: contentTitle,
    }),
    link: notificationLink({ type: "review", advancementId }),
  }).catch((err) => console.error("Failed to send review claim notification:", err))
}

export async function submitFeedback(params: {
  readonly reviewId: string
  readonly reviewerId: string
  readonly feedback: ReviewFeedback
  readonly decision: PeerReviewDecision
}): Promise<void> {
  const reviewRef = doc(db, "peerReviews", params.reviewId)
  const reviewSnap = await getDoc(reviewRef)
  if (!reviewSnap.exists()) {
    throw new Error("Review not found")
  }

  const data = reviewSnap.data()
  const assignedReviewerId = data["reviewerId"] as string
  if (params.reviewerId !== assignedReviewerId) {
    throw new Error("Only the assigned reviewer can submit feedback")
  }

  const status = data["status"] as string
  if (status !== "in_review") {
    throw new Error("This review is not currently in review")
  }

  const batch = writeBatch(db)
  batch.update(reviewRef, {
    feedback: params.feedback,
    decision: params.decision,
    status: params.decision,
    reviewedAt: serverTimestamp(),
  })
  await batch.commit()

  const authorId = data["authorId"] as string
  const contentTitle = data["contentTitle"] as string
  const advancementId = data["advancementId"] as string
  createNotification({
    userId: authorId,
    type: "review",
    message: formatNotificationMessage({
      type: "review",
      actorName: "Peer Review",
      targetTitle: contentTitle,
    }),
    link: notificationLink({ type: "review", advancementId }),
  }).catch((err) => console.error("Failed to send review feedback notification:", err))
}

export async function getReviewQueue(params?: {
  readonly advancementId?: string
  readonly status?: PeerReviewStatus
}): Promise<readonly PeerReview[]> {
  const constraints = []
  if (params?.advancementId) {
    constraints.push(where("advancementId", "==", params.advancementId))
  }
  if (params?.status) {
    constraints.push(where("status", "==", params.status))
  }
  constraints.push(orderBy("submittedAt", "desc"))
  constraints.push(limit(100))

  const q = query(collection(db, "peerReviews"), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parsePeerReviewDoc(d.id, d.data()))
    .filter((item): item is PeerReview => item !== null)
}

export async function getReviewsForContent(contentId: string): Promise<readonly PeerReview[]> {
  const q = query(
    collection(db, "peerReviews"),
    where("contentId", "==", contentId),
    orderBy("submittedAt", "desc"),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parsePeerReviewDoc(d.id, d.data()))
    .filter((item): item is PeerReview => item !== null)
}

export async function getUserReviews(reviewerId: string): Promise<readonly PeerReview[]> {
  const q = query(
    collection(db, "peerReviews"),
    where("reviewerId", "==", reviewerId),
    orderBy("submittedAt", "desc"),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((d) => parsePeerReviewDoc(d.id, d.data()))
    .filter((item): item is PeerReview => item !== null)
}
