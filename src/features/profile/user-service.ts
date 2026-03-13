import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { GuildUser } from "@/domain/user"
import type { UserBackground } from "@/domain/onboarding"

export async function getUserById(uid: string): Promise<GuildUser | null> {
  const userDoc = await getDoc(doc(db, "users", uid))
  if (!userDoc.exists()) return null

  const data = userDoc.data()
  return {
    uid: userDoc.id,
    email: data["email"] as string,
    displayName: data["displayName"] as string,
    repPoints: data["repPoints"] as number,
    isSchoolEmail: (data["isSchoolEmail"] as boolean) ?? false,
    createdAt: (data["createdAt"] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
    onboardingComplete: (data["onboardingComplete"] as boolean) ?? false,
    country: (data["country"] as string) ?? null,
    background: (data["background"] as UserBackground) ?? null,
    interests: (data["interests"] as readonly string[]) ?? [],
    bio: (data["bio"] as string) ?? "",
  }
}
