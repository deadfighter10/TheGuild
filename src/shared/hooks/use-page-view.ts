import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/features/auth/AuthContext"

export function usePageView(): void {
  const location = useLocation()
  const { firebaseUser } = useAuth()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (!firebaseUser) return
    if (location.pathname === lastPath.current) return

    lastPath.current = location.pathname

    addDoc(collection(db, "pageViews"), {
      path: location.pathname,
      timestamp: serverTimestamp(),
    }).catch((err) => console.error("Failed to record page view:", err))
  }, [location.pathname, firebaseUser])
}
