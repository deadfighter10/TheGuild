import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  setDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addRateLimitToBatch, checkRateLimit } from "@/lib/rate-limit"
import { parseTreeNodeDoc } from "@/lib/firestore-schemas"
import { validateCreateNode, validateSupportNode, validateSetNodeStatus, validateEditNode } from "@/domain/node"
import type { TreeNode, NodeStatus } from "@/domain/node"
import type { UserRole } from "@/domain/user"
import { REP_THRESHOLDS } from "@/domain/reputation"
import { createNotification } from "@/features/notifications/notification-service"
import { formatNotificationMessage, notificationLink } from "@/domain/notification"

type CreateNodeParams = {
  readonly authorId: string
  readonly authorRep: number
  readonly authorRole: UserRole
  readonly advancementId: string
  readonly parentNodeId: string | null
  readonly title: string
  readonly description: string
}

type CreateNodeResult =
  | { readonly success: true; readonly nodeId: string }
  | { readonly success: false; readonly reason: string }

export async function createNode(params: CreateNodeParams): Promise<CreateNodeResult> {
  const validation = validateCreateNode({
    authorRep: params.authorRep,
    authorRole: params.authorRole,
    title: params.title,
    description: params.description,
    advancementId: params.advancementId,
    parentNodeId: params.parentNodeId,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const rateCheck = await checkRateLimit(params.authorId, "nodes")
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason }
  }

  const batch = writeBatch(db)
  const newDocRef = doc(collection(db, "nodes"))
  batch.set(newDocRef, {
    advancementId: params.advancementId,
    parentNodeId: params.parentNodeId,
    authorId: params.authorId,
    title: params.title.trim(),
    description: params.description.trim(),
    status: "theoretical",
    supportCount: 0,
    createdAt: serverTimestamp(),
  })
  addRateLimitToBatch(batch, params.authorId, "nodes")
  await batch.commit()

  return { success: true, nodeId: newDocRef.id }
}

function filterNulls<T>(items: readonly (T | null)[]): readonly T[] {
  return items.filter((item): item is T => item !== null)
}

export async function getNodesByAdvancement(advancementId: string): Promise<readonly TreeNode[]> {
  const q = query(
    collection(db, "nodes"),
    where("advancementId", "==", advancementId),
  )
  const snapshot = await getDocs(q)

  return filterNulls(snapshot.docs.map((docSnap) => parseTreeNodeDoc(docSnap.id, docSnap.data())))
}

export function subscribeToNodesByAdvancement(
  advancementId: string,
  onData: (nodes: readonly TreeNode[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, "nodes"),
    where("advancementId", "==", advancementId),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const nodes = filterNulls(snapshot.docs.map((docSnap) => parseTreeNodeDoc(docSnap.id, docSnap.data())))
      onData(nodes)
    },
    onError,
  )
}

type SupportNodeResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function supportNode(
  userId: string,
  userRep: number,
  userRole: UserRole,
  nodeId: string,
): Promise<SupportNodeResult> {
  const nodeDoc = await getDoc(doc(db, "nodes", nodeId))
  if (!nodeDoc.exists()) {
    return { success: false, reason: "Node not found" }
  }

  const node = parseTreeNodeDoc(nodeDoc.id, nodeDoc.data())
  if (!node) {
    return { success: false, reason: "Invalid node data" }
  }

  const supportId = `${userId}_${nodeId}`
  const supportRef = doc(db, "nodeSupports", supportId)
  const existingSupport = await getDoc(supportRef)

  const validation = validateSupportNode({
    userId,
    userRep,
    userRole,
    node,
    alreadySupported: existingSupport.exists(),
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  await setDoc(supportRef, {
    nodeId,
    userId,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, "nodes", nodeId), {
    supportCount: increment(1),
  })

  await updateDoc(doc(db, "users", node.authorId), {
    repPoints: increment(REP_THRESHOLDS.supportBonus),
  })

  // Notify node author
  if (node.authorId !== userId) {
    const supporterDoc = await getDoc(doc(db, "users", userId))
    const supporterName = (supporterDoc.data()?.["displayName"] as string) ?? "Someone"
    createNotification({
      userId: node.authorId,
      type: "support",
      message: formatNotificationMessage({
        type: "support",
        actorName: supporterName,
        targetTitle: node.title,
      }),
      link: notificationLink({ type: "support", advancementId: node.advancementId }),
    }).catch((err) => console.error("Failed to send support notification:", err))
  }

  return { success: true }
}

type SetStatusResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function setNodeStatus(
  moderatorRep: number,
  moderatorRole: UserRole,
  nodeId: string,
  newStatus: NodeStatus,
): Promise<SetStatusResult> {
  const validation = validateSetNodeStatus({ moderatorRep, moderatorRole, newStatus })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  await updateDoc(doc(db, "nodes", nodeId), { status: newStatus })

  return { success: true }
}

export async function hasUserSupported(userId: string, nodeId: string): Promise<boolean> {
  const supportRef = doc(db, "nodeSupports", `${userId}_${nodeId}`)
  const supportDoc = await getDoc(supportRef)
  return supportDoc.exists()
}

type EditNodeParams = {
  readonly userId: string
  readonly userRep: number
  readonly userRole: UserRole
  readonly nodeId: string
  readonly title: string
  readonly description: string
}

type EditNodeResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function editNode(params: EditNodeParams): Promise<EditNodeResult> {
  const nodeDoc = await getDoc(doc(db, "nodes", params.nodeId))
  if (!nodeDoc.exists()) return { success: false, reason: "Node not found" }

  const node = parseTreeNodeDoc(nodeDoc.id, nodeDoc.data())
  if (!node) return { success: false, reason: "Invalid node data" }

  const validation = validateEditNode({
    userId: params.userId,
    userRep: params.userRep,
    userRole: params.userRole,
    node,
    title: params.title,
    description: params.description,
  })

  if (!validation.valid) return { success: false, reason: validation.reason }

  await updateDoc(doc(db, "nodes", params.nodeId), {
    title: params.title.trim(),
    description: params.description.trim(),
  })

  return { success: true }
}

export async function getNode(nodeId: string): Promise<TreeNode | null> {
  const nodeDoc = await getDoc(doc(db, "nodes", nodeId))
  if (!nodeDoc.exists()) return null
  return parseTreeNodeDoc(nodeDoc.id, nodeDoc.data())
}

export async function getNodeLineage(nodeId: string): Promise<readonly TreeNode[]> {
  const lineage: TreeNode[] = []
  let currentId: string | null = nodeId

  while (currentId) {
    const node = await getNode(currentId)
    if (!node) return currentId === nodeId ? [] : lineage
    lineage.unshift(node)
    currentId = node.parentNodeId
  }

  return lineage
}

export async function getNodesByAuthor(authorId: string): Promise<readonly TreeNode[]> {
  const q = query(
    collection(db, "nodes"),
    where("authorId", "==", authorId),
  )
  const snapshot = await getDocs(q)

  return filterNulls(snapshot.docs.map((docSnap) => parseTreeNodeDoc(docSnap.id, docSnap.data())))
}
