import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { GuildUser } from "@/domain/user"
import { parseGuildUserDoc } from "@/lib/firestore-schemas"

export async function getUserById(uid: string): Promise<GuildUser | null> {
  const userDoc = await getDoc(doc(db, "users", uid))
  if (!userDoc.exists()) return null
  return parseGuildUserDoc(userDoc.id, userDoc.data() as Record<string, unknown>)
}
