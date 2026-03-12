import { doc, setDoc, getDocs, collection } from "firebase/firestore"
import { db } from "./firebase"
import { ADVANCEMENTS } from "@/domain/advancement"

export async function seedAdvancements(): Promise<void> {
  const snapshot = await getDocs(collection(db, "advancements"))
  if (!snapshot.empty) return

  const writes = ADVANCEMENTS.map((advancement) =>
    setDoc(doc(db, "advancements", advancement.id), {
      name: advancement.name,
      description: advancement.description,
    }),
  )

  await Promise.all(writes)
}
