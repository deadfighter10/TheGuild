import { z } from "zod"
import type { TreeNode } from "@/domain/node"
import type { NewsLink } from "@/domain/news-link"
import type { DiscussionThread, DiscussionReply } from "@/domain/discussion"
import type { ContentFlag } from "@/domain/flag"
import type { Notification } from "@/domain/notification"
import type { GuildUser } from "@/domain/user"
import type { LibraryEntry } from "@/domain/library-entry"
import type { EntryVersion } from "@/domain/library-entry"
import type { PeerReview } from "@/domain/peer-review"
import { REP_REASONS, type RepEvent, type RepReason } from "@/domain/reputation"

const firestoreTimestamp = z
  .any()
  .optional()
  .transform((val): Date => {
    if (val && typeof val === "object" && typeof val.toDate === "function") {
      return val.toDate() as Date
    }
    return new Date()
  })

const optionalFirestoreTimestamp = z
  .any()
  .optional()
  .transform((val): Date | null => {
    if (val && typeof val === "object" && typeof val.toDate === "function") {
      return val.toDate() as Date
    }
    return null
  })

const nodeStatusSchema = z.enum(["theoretical", "proven", "disproved"])

const treeNodeDocSchema = z.object({
  advancementId: z.string(),
  parentNodeId: z.nullable(z.string()).optional().default(null),
  authorId: z.string(),
  title: z.string(),
  description: z.string(),
  status: nodeStatusSchema,
  supportCount: z.number(),
  createdAt: firestoreTimestamp,
})

export function parseTreeNodeDoc(id: string, data: Record<string, unknown>): TreeNode | null {
  const result = treeNodeDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid TreeNode doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies TreeNode
}

const newsLinkDocSchema = z.object({
  advancementId: z.string(),
  submitterId: z.string(),
  title: z.string(),
  url: z.string(),
  score: z.number(),
  createdAt: firestoreTimestamp,
})

export function parseNewsLinkDoc(id: string, data: Record<string, unknown>): NewsLink | null {
  const result = newsLinkDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid NewsLink doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies NewsLink
}

const discussionThreadDocSchema = z.object({
  advancementId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  title: z.string(),
  body: z.string(),
  replyCount: z.number().optional().default(0),
  lastActivityAt: firestoreTimestamp,
  createdAt: firestoreTimestamp,
})

export function parseDiscussionThreadDoc(id: string, data: Record<string, unknown>): DiscussionThread | null {
  const result = discussionThreadDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid DiscussionThread doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies DiscussionThread
}

const discussionReplyDocSchema = z.object({
  threadId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: firestoreTimestamp,
})

export function parseDiscussionReplyDoc(id: string, data: Record<string, unknown>): DiscussionReply | null {
  const result = discussionReplyDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid DiscussionReply doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies DiscussionReply
}

const flagReasonSchema = z.enum(["spam", "harassment", "misinformation", "off-topic", "plagiarism", "other"])
const flagTargetSchema = z.enum(["nodes", "libraryEntries", "newsLinks", "discussionThreads", "discussionReplies"])
const flagStatusSchema = z.enum(["pending", "dismissed", "actioned"])

const contentFlagDocSchema = z.object({
  targetCollection: flagTargetSchema,
  targetId: z.string(),
  targetTitle: z.string(),
  reporterId: z.string(),
  reporterName: z.string(),
  reason: flagReasonSchema,
  details: z.string().optional().default(""),
  status: flagStatusSchema,
  resolvedBy: z.nullable(z.string()).optional().default(null),
  resolvedAt: optionalFirestoreTimestamp,
  createdAt: firestoreTimestamp,
})

export function parseContentFlagDoc(id: string, data: Record<string, unknown>): ContentFlag | null {
  const result = contentFlagDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid ContentFlag doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies ContentFlag
}

const notificationTypeSchema = z.enum(["reply", "support", "vouch", "flag", "rep_change", "status_change", "review"])

const notificationDocSchema = z.object({
  userId: z.string(),
  type: notificationTypeSchema,
  message: z.string(),
  link: z.string(),
  read: z.boolean(),
  createdAt: firestoreTimestamp,
})

export function parseNotificationDoc(id: string, data: Record<string, unknown>): Notification | null {
  const result = notificationDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid Notification doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies Notification
}

const userBackgroundSchema = z.enum(["researcher", "student", "engineer", "professor", "hobbyist", "other"])
const userRoleSchema = z.enum(["user", "admin"])

const digestPeriodSchema = z.enum(["daily", "weekly"])

const digestPreferencesSchema = z.object({
  enabled: z.boolean(),
  period: digestPeriodSchema,
  lastSentAt: optionalFirestoreTimestamp,
})

const guildUserDocSchema = z.object({
  email: z.string(),
  displayName: z.string(),
  repPoints: z.number(),
  isSchoolEmail: z.boolean(),
  emailVerified: z.boolean().optional().default(false),
  createdAt: firestoreTimestamp,
  onboardingComplete: z.boolean().optional().default(false),
  country: z.nullable(z.string()).optional().default(null),
  background: z.nullable(userBackgroundSchema).optional().default(null),
  interests: z.array(z.string()).optional().default([]),
  bio: z.string().optional().default(""),
  photoURL: z.nullable(z.string()).optional().default(null),
  role: userRoleSchema.optional().default("user"),
  bannedUntil: optionalFirestoreTimestamp,
  digestPreferences: digestPreferencesSchema.optional().default({ enabled: false, period: "daily", lastSentAt: null }),
})

export function parseGuildUserDoc(uid: string, data: Record<string, unknown>): GuildUser | null {
  const result = guildUserDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid GuildUser doc ${uid}:`, result.error.message)
    return null
  }
  return { uid, ...result.data } satisfies GuildUser
}

const difficultySchema = z.enum(["introductory", "intermediate", "advanced"])
const contentTypeSchema = z.enum(["article", "youtube", "link", "document"])

const libraryEntryDocSchema = z.object({
  advancementId: z.string(),
  authorId: z.string(),
  title: z.string(),
  content: z.string().optional().default(""),
  contentType: contentTypeSchema,
  url: z.string().optional(),
  difficulty: difficultySchema,
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
})

export function parseLibraryEntryDoc(id: string, data: Record<string, unknown>): LibraryEntry | null {
  const result = libraryEntryDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid LibraryEntry doc ${id}:`, result.error.message)
    return null
  }
  const { url, ...rest } = result.data
  const base: LibraryEntry = { id, ...rest }
  return url ? { ...base, url } : base
}

const entryVersionDocSchema = z.object({
  entryId: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: contentTypeSchema.optional().default("article"),
  difficulty: difficultySchema.optional().default("introductory"),
  editedBy: z.string(),
  createdAt: firestoreTimestamp,
})

export function parseEntryVersionDoc(id: string, data: Record<string, unknown>): EntryVersion | null {
  const result = entryVersionDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid EntryVersion doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies EntryVersion
}

const peerReviewContentTypeSchema = z.enum(["node", "libraryEntry"])
const peerReviewStatusSchema = z.enum(["pending", "in_review", "approved", "needs_revision", "rejected"])
const peerReviewDecisionSchema = z.enum(["approved", "needs_revision", "rejected"])

const feedbackScoreSchema = z.object({
  score: z.number(),
  comment: z.string(),
})

const reviewFeedbackSchema = z.object({
  accuracy: feedbackScoreSchema,
  clarity: feedbackScoreSchema,
  novelty: feedbackScoreSchema,
  evidenceQuality: feedbackScoreSchema,
  summary: z.string(),
})

const peerReviewDocSchema = z.object({
  contentType: peerReviewContentTypeSchema,
  contentId: z.string(),
  contentTitle: z.string(),
  advancementId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  status: peerReviewStatusSchema,
  reviewerId: z.nullable(z.string()).optional().default(null),
  reviewerName: z.nullable(z.string()).optional().default(null),
  feedback: z.nullable(reviewFeedbackSchema).optional().default(null),
  decision: z.nullable(peerReviewDecisionSchema).optional().default(null),
  submittedAt: firestoreTimestamp,
  reviewedAt: optionalFirestoreTimestamp,
})

export function parsePeerReviewDoc(id: string, data: Record<string, unknown>): PeerReview | null {
  const result = peerReviewDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid PeerReview doc ${id}:`, result.error.message)
    return null
  }
  return { id, ...result.data } satisfies PeerReview
}

const repReasonSchema = z.enum(REP_REASONS as unknown as [string, ...string[]])

const repEventDocSchema = z.object({
  userId: z.string(),
  delta: z.number(),
  reason: repReasonSchema,
  sourceId: z.nullable(z.string()),
  sourceDescription: z.string(),
  timestamp: firestoreTimestamp,
  balanceAfter: z.number(),
})

export function parseRepEventDoc(id: string, data: Record<string, unknown>): RepEvent | null {
  const result = repEventDocSchema.safeParse(data)
  if (!result.success) {
    console.error(`Invalid RepEvent doc ${id}:`, result.error.message)
    return null
  }
  const { reason, ...rest } = result.data
  return { id, ...rest, reason: reason as RepReason } satisfies RepEvent
}
