import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { validateCreateNode, validateSupportNode, validateSetNodeStatus, validateEditNode } from "@/domain/node"
import type { TreeNode, NodeStatus } from "@/domain/node"
import { REP_THRESHOLDS } from "@/domain/reputation"

type CreateNodeParams = {
  readonly authorId: string
  readonly authorRep: number
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
    title: params.title,
    description: params.description,
    advancementId: params.advancementId,
    parentNodeId: params.parentNodeId,
  })

  if (!validation.valid) {
    return { success: false, reason: validation.reason }
  }

  const docRef = await addDoc(collection(db, "nodes"), {
    advancementId: params.advancementId,
    parentNodeId: params.parentNodeId,
    authorId: params.authorId,
    title: params.title.trim(),
    description: params.description.trim(),
    status: "theoretical",
    supportCount: 0,
    createdAt: serverTimestamp(),
  })

  return { success: true, nodeId: docRef.id }
}

export async function getNodesByAdvancement(advancementId: string): Promise<readonly TreeNode[]> {
  const q = query(
    collection(db, "nodes"),
    where("advancementId", "==", advancementId),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: data["advancementId"] as string,
      parentNodeId: (data["parentNodeId"] as string | null) ?? null,
      authorId: data["authorId"] as string,
      title: data["title"] as string,
      description: data["description"] as string,
      status: data["status"] as NodeStatus,
      supportCount: data["supportCount"] as number,
      createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}

type SupportNodeResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function supportNode(
  userId: string,
  userRep: number,
  nodeId: string,
): Promise<SupportNodeResult> {
  const nodeDoc = await getDoc(doc(db, "nodes", nodeId))
  if (!nodeDoc.exists()) {
    return { success: false, reason: "Node not found" }
  }

  const nodeData = nodeDoc.data()
  const node: TreeNode = {
    id: nodeDoc.id,
    advancementId: nodeData["advancementId"] as string,
    parentNodeId: (nodeData["parentNodeId"] as string | null) ?? null,
    authorId: nodeData["authorId"] as string,
    title: nodeData["title"] as string,
    description: nodeData["description"] as string,
    status: nodeData["status"] as NodeStatus,
    supportCount: nodeData["supportCount"] as number,
    createdAt: (nodeData["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
  }

  const supportId = `${userId}_${nodeId}`
  const supportRef = doc(db, "nodeSupports", supportId)
  const existingSupport = await getDoc(supportRef)

  const validation = validateSupportNode({
    userId,
    userRep,
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

  return { success: true }
}

type SetStatusResult =
  | { readonly success: true }
  | { readonly success: false; readonly reason: string }

export async function setNodeStatus(
  moderatorRep: number,
  nodeId: string,
  newStatus: NodeStatus,
): Promise<SetStatusResult> {
  const validation = validateSetNodeStatus({ moderatorRep, newStatus })

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

  const data = nodeDoc.data()
  const node: TreeNode = {
    id: nodeDoc.id,
    advancementId: data["advancementId"] as string,
    parentNodeId: (data["parentNodeId"] as string | null) ?? null,
    authorId: data["authorId"] as string,
    title: data["title"] as string,
    description: data["description"] as string,
    status: data["status"] as NodeStatus,
    supportCount: data["supportCount"] as number,
    createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
  }

  const validation = validateEditNode({
    userId: params.userId,
    userRep: params.userRep,
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

export async function getNodesByAuthor(authorId: string): Promise<readonly TreeNode[]> {
  const q = query(
    collection(db, "nodes"),
    where("authorId", "==", authorId),
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      advancementId: data["advancementId"] as string,
      parentNodeId: (data["parentNodeId"] as string | null) ?? null,
      authorId: data["authorId"] as string,
      title: data["title"] as string,
      description: data["description"] as string,
      status: data["status"] as NodeStatus,
      supportCount: data["supportCount"] as number,
      createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    }
  })
}
