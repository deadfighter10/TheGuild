import { useState } from "react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { doc, getDoc } from "firebase/firestore"
import { app } from "@/lib/firebase"
import { db } from "@/lib/firebase"
import { useAuth } from "@/features/auth/AuthContext"
import { useEffect } from "react"

type DigestPeriod = "daily" | "weekly"

type DigestState = {
  readonly enabled: boolean
  readonly period: DigestPeriod
}

export function DigestPreferences() {
  const { guildUser } = useAuth()
  const [state, setState] = useState<DigestState>({ enabled: false, period: "daily" })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!guildUser) return

    const loadPrefs = async () => {
      const userDoc = await getDoc(doc(db, "users", guildUser.uid))
      const data = userDoc.data()
      const prefs = data?.digestPreferences
      if (prefs) {
        setState({ enabled: prefs.enabled ?? false, period: prefs.period ?? "daily" })
      }
      setLoaded(true)
    }

    loadPrefs().catch(() => setLoaded(true))
  }, [guildUser])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const functions = getFunctions(app)
      const updatePrefs = httpsCallable(functions, "updateDigestPreferences")
      await updatePrefs({ enabled: state.enabled, period: state.period })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="rounded-xl border border-white/5 bg-void-900 p-6">
      <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
        Email Digest
      </h2>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-white/60">Receive email digests</p>
          <p className="text-[10px] text-white/25 mt-0.5">
            Get a summary of new content in your followed advancements
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.enabled}
          onClick={() => setState((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            state.enabled ? "bg-cyan-500" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              state.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {state.enabled && (
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-2">
            Frequency
          </p>
          <div className="flex gap-2">
            {(["daily", "weekly"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, period }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  state.period === period
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    : "bg-white/5 text-white/40 border-white/[0.06] hover:bg-white/10"
                }`}
              >
                {period === "daily" ? "Daily" : "Weekly"}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 text-xs font-medium rounded-lg bg-cyan-500/10 text-cyan-400/70 hover:bg-cyan-500/20 hover:text-cyan-400 border border-cyan-500/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saved ? "Saved" : saving ? "Saving..." : "Save preferences"}
      </button>
    </div>
  )
}
