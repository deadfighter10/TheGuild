import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/features/auth/AuthContext"

const PAGE_VIEW_STORAGE_KEY = "pageViewTimestamps"
const HOURLY_LIMIT = 120
const ONE_HOUR_MS = 60 * 60 * 1000

export function isWithinPageViewLimit(timestamps: readonly number[], now: number): boolean {
  const recentCount = timestamps.filter((ts) => now - ts < ONE_HOUR_MS).length
  return recentCount < HOURLY_LIMIT
}

function getStoredTimestamps(): readonly number[] {
  const raw = localStorage.getItem(PAGE_VIEW_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is number => typeof v === "number")
  } catch {
    return []
  }
}

function recordTimestamp(now: number): void {
  const timestamps = getStoredTimestamps().filter((ts) => now - ts < ONE_HOUR_MS)
  localStorage.setItem(PAGE_VIEW_STORAGE_KEY, JSON.stringify([...timestamps, now]))
}

export function usePageView(): void {
  const location = useLocation()
  const { firebaseUser } = useAuth()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (location.pathname === lastPath.current) return

    const now = Date.now()
    const timestamps = getStoredTimestamps()

    if (!firebaseUser && !isWithinPageViewLimit(timestamps, now)) return

    lastPath.current = location.pathname
    recordTimestamp(now)

    addDoc(collection(db, "pageViews"), {
      path: location.pathname,
      timestamp: serverTimestamp(),
    }).catch((err) => console.error("Failed to record page view:", err))
  }, [location.pathname, firebaseUser])
}
