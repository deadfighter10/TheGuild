import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { USER_BACKGROUNDS, validateOnboardingProfile } from "@/domain/onboarding"
import type { UserBackground } from "@/domain/onboarding"
import { COUNTRIES } from "@/domain/countries"
import { AdvancementIcon } from "@/shared/components/Icons"
import { useToast } from "@/shared/components/Toast"
import { UserAvatar } from "@/shared/components/UserAvatar"

export function EditProfileForm({ onClose }: { readonly onClose: () => void }) {
  const { guildUser, refreshUser } = useAuth()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState(guildUser?.displayName ?? "")
  const [country, setCountry] = useState(guildUser?.country ?? "")
  const [background, setBackground] = useState<UserBackground | "">(guildUser?.background ?? "")
  const [interests, setInterests] = useState<readonly string[]>(guildUser?.interests ?? [])
  const [bio, setBio] = useState(guildUser?.bio ?? "")
  const [photoURL, setPhotoURL] = useState(guildUser?.photoURL ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!guildUser) return null

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const handleSave = async () => {
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError("Display name is required")
      return
    }
    if (trimmedName.length < 2) {
      setError("Display name must be at least 2 characters")
      return
    }
    if (!background) {
      setError("Please select a background")
      return
    }
    const validation = validateOnboardingProfile({ country, background, interests, bio })
    if (!validation.valid) {
      setError(validation.reason)
      return
    }

    setSaving(true)
    setError("")
    try {
      const trimmedPhoto = photoURL.trim()
      const safePhotoURL = trimmedPhoto && /^https?:\/\//i.test(trimmedPhoto) ? trimmedPhoto : null
      const updates: Record<string, unknown> = { country, background, interests, bio, photoURL: safePhotoURL }
      if (trimmedName !== guildUser.displayName) {
        updates["displayName"] = trimmedName
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: trimmedName })
        }
      }
      await updateDoc(doc(db, "users", guildUser.uid), updates)
      await refreshUser()
      toast("Profile updated", "success")
      onClose()
    } catch {
      setError("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-void-900 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">Edit Profile</h3>
        <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60 transition-colors">Cancel</button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-white/40 mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full px-3 py-2 text-sm rounded-lg border border-white/15 bg-void-950 text-white/70 placeholder-white/25 focus:outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-void-950 text-white/70 focus:outline-none focus:border-white/20"
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Background</label>
          <div className="grid grid-cols-2 gap-2">
            {USER_BACKGROUNDS.map((bg) => (
              <button
                key={bg.value}
                onClick={() => setBackground(bg.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  background === bg.value
                    ? "border-cyan-400/30 bg-cyan-400/5 text-white"
                    : "border-white/5 bg-void-950 text-white/50 hover:border-white/10"
                }`}
              >
                <span className="text-sm font-medium block">{bg.label}</span>
                <span className="text-[10px] text-white/30">{bg.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Interests</label>
          <div className="flex flex-wrap gap-2">
            {ADVANCEMENTS.map((adv) => {
              const theme = ADVANCEMENT_THEMES[adv.id]
              if (!theme) return null
              const selected = interests.includes(adv.id)
              return (
                <button
                  key={adv.id}
                  onClick={() => toggleInterest(adv.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    selected
                      ? `${theme.borderClass} ${theme.bgClass} ${theme.colorClass}`
                      : "border-white/5 text-white/40 hover:border-white/10"
                  }`}
                >
                  <AdvancementIcon icon={theme.icon} size={12} />
                  {theme.shortName}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-white/15 bg-void-950 text-white/70 placeholder-white/25 focus:outline-none focus:border-white/30 resize-none"
          />
          <span className="text-[10px] text-white/30 font-mono">{bio.length}/300</span>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Profile Photo URL</label>
          <div className="flex items-center gap-3">
            {photoURL && <UserAvatar name={displayName} photoURL={photoURL} size="md" />}
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              maxLength={500}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-white/15 bg-void-950 text-white/70 placeholder-white/25 focus:outline-none focus:border-white/30"
            />
          </div>
          <span className="text-[10px] text-white/30 font-mono mt-1 block">Paste a link to your profile picture</span>
        </div>

        {error && <p className="text-xs text-red-400/70">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-lg text-white/30 hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
