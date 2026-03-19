import { useState, useEffect, useCallback } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { getFunctions, httpsCallable } from "firebase/functions"
import { db, auth, app } from "@/lib/firebase"
import { useAuth } from "@/features/auth/AuthContext"
import { getRepTier, isAdmin } from "@/domain/user"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { USER_BACKGROUNDS, validateOnboardingProfile } from "@/domain/onboarding"
import type { UserBackground } from "@/domain/onboarding"
import { COUNTRIES } from "@/domain/countries"
import { VouchPanel } from "@/features/vouch/VouchPanel"
import { AdvancementIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { getNodesByAuthor } from "@/features/tree/node-service"
import { getLibraryEntriesByAuthor } from "@/features/library/library-service"
import { getNewsLinksBySubmitter } from "@/features/newsroom/news-service"
import { getUserBookmarks } from "@/features/bookmarks/bookmark-service"
import { useToast } from "@/shared/components/Toast"
import { Link } from "react-router-dom"
import { UserAvatar } from "@/shared/components/UserAvatar"
import type { TreeNode } from "@/domain/node"
import type { LibraryEntry } from "@/domain/library-entry"
import type { NewsLink } from "@/domain/news-link"
import type { Bookmark, BookmarkTargetType } from "@/domain/bookmark"

const TIER_LABELS = {
  observer: "Observer",
  contributor: "Contributor",
  moderator: "Moderator",
} as const

const TIER_STYLES = {
  observer: {
    text: "text-white/50",
    bg: "bg-white/5",
    border: "border-white/10",
    bar: "bg-white/20",
  },
  contributor: {
    text: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    bar: "bg-cyan-400/60",
  },
  moderator: {
    text: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    bar: "bg-yellow-400/60",
  },
} as const

type ContributionsData = {
  readonly nodes: readonly TreeNode[]
  readonly entries: readonly LibraryEntry[]
  readonly links: readonly NewsLink[]
}

function EditProfileForm({ onClose }: { readonly onClose: () => void }) {
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

function ContributionsSection({ userId }: { readonly userId: string }) {
  const [data, setData] = useState<ContributionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"nodes" | "library" | "news">("nodes")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nodes, entries, links] = await Promise.all([
        getNodesByAuthor(userId),
        getLibraryEntriesByAuthor(userId),
        getNewsLinksBySubmitter(userId),
      ])
      setData({ nodes, entries, links })
    } catch {
      // UI shows stale state as fallback
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-white/30 font-mono">Loading contributions...</p>
      </div>
    )
  }

  if (!data) return null

  const totalCount = data.nodes.length + data.entries.length + data.links.length

  if (totalCount === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
        <p className="text-sm text-white/30 mb-1">No contributions yet</p>
        <p className="text-xs text-white/25">Start contributing to see your work here</p>
      </div>
    )
  }

  const tabs = [
    { key: "nodes" as const, label: "Ideas", count: data.nodes.length },
    { key: "library" as const, label: "Library", count: data.entries.length },
    { key: "news" as const, label: "News", count: data.links.length },
  ]

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/50 hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 font-mono text-[10px] opacity-60">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "nodes" && (
        <div className="space-y-2">
          {data.nodes.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No ideas submitted</p>
          ) : (
            data.nodes.map((node) => {
              const theme = ADVANCEMENT_THEMES[node.advancementId]
              return (
                <Link
                  key={node.id}
                  to={`/advancements/${node.advancementId}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                >
                  {theme && (
                    <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                      <AdvancementIcon icon={theme.icon} size={14} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{node.title}</p>
                    <span className="text-[10px] text-white/30 font-mono">
                      {node.supportCount} support{node.supportCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ChevronRightIcon size={14} className="text-white/15" />
                </Link>
              )
            })
          )}
        </div>
      )}

      {activeTab === "library" && (
        <div className="space-y-2">
          {data.entries.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No library entries</p>
          ) : (
            data.entries.map((entry) => {
              const theme = ADVANCEMENT_THEMES[entry.advancementId]
              return (
                <Link
                  key={entry.id}
                  to={`/library/${entry.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
                >
                  {theme && (
                    <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                      <AdvancementIcon icon={theme.icon} size={14} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{entry.title}</p>
                  </div>
                  <ChevronRightIcon size={14} className="text-white/15" />
                </Link>
              )
            })
          )}
        </div>
      )}

      {activeTab === "news" && (
        <div className="space-y-2">
          {data.links.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">No news links submitted</p>
          ) : (
            data.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{link.title}</p>
                  <span className="text-[10px] text-white/30 font-mono">
                    score: {link.score}
                  </span>
                </div>
                <ChevronRightIcon size={14} className="text-white/15" />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const BOOKMARK_TYPE_LABELS: Record<BookmarkTargetType, string> = {
  node: "Ideas",
  libraryEntry: "Library",
  newsLink: "News",
  discussionThread: "Discussions",
}

function bookmarkLink(bookmark: Bookmark): string {
  switch (bookmark.targetType) {
    case "node":
      return `/advancements/${bookmark.advancementId}/tree/${bookmark.targetId}`
    case "libraryEntry":
      return `/library/${bookmark.targetId}`
    case "newsLink":
      return `/newsroom`
    case "discussionThread":
      return `/advancements/${bookmark.advancementId}`
  }
}

function BookmarksSection({ userId }: { readonly userId: string }) {
  const [bookmarks, setBookmarks] = useState<readonly Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<BookmarkTargetType | "all">("all")

  useEffect(() => {
    getUserBookmarks(userId)
      .then(setBookmarks)
      .catch((err) => console.error("Failed to load bookmarks:", err))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-white/30 font-mono">Loading bookmarks...</p>
      </div>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
        <p className="text-sm text-white/30 mb-1">No bookmarks yet</p>
        <p className="text-xs text-white/25">Bookmark ideas, library entries, and more to find them here</p>
      </div>
    )
  }

  const types = [...new Set(bookmarks.map((b) => b.targetType))]
  const filtered = filterType === "all" ? bookmarks : bookmarks.filter((b) => b.targetType === filterType)

  return (
    <div>
      {types.length > 1 && (
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === "all" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50 hover:bg-white/5"
            }`}
          >
            All <span className="ml-1 font-mono text-[10px] opacity-60">{bookmarks.length}</span>
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === type ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50 hover:bg-white/5"
              }`}
            >
              {BOOKMARK_TYPE_LABELS[type]}
              <span className="ml-1 font-mono text-[10px] opacity-60">
                {bookmarks.filter((b) => b.targetType === type).length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((bookmark) => {
          const theme = ADVANCEMENT_THEMES[bookmark.advancementId]
          return (
            <Link
              key={bookmark.id}
              to={bookmarkLink(bookmark)}
              className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-void-900 hover:bg-void-850 transition-colors"
            >
              {theme && (
                <div className={`w-8 h-8 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-50`}>
                  <AdvancementIcon icon={theme.icon} size={14} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 truncate">{bookmark.targetTitle}</p>
                <span className="text-[10px] text-white/30 font-mono">
                  {BOOKMARK_TYPE_LABELS[bookmark.targetType]}
                </span>
              </div>
              <ChevronRightIcon size={14} className="text-white/15" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { guildUser } = useAuth()
  const [editingProfile, setEditingProfile] = useState(false)

  if (!guildUser) return null

  const admin = isAdmin(guildUser.role)
  const tier = getRepTier(guildUser.repPoints)
  const style = TIER_STYLES[tier]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      <div className="flex items-start gap-4 sm:gap-6 mb-8 sm:mb-10">
        {admin ? (
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-display bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 text-red-400/80">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        ) : (
          <UserAvatar name={guildUser.displayName} photoURL={guildUser.photoURL} size="lg" />
        )}
        <div className="flex-1">
          <h1 className="font-display text-3xl text-white">{guildUser.displayName}</h1>
          <p className="text-white/30 text-sm mt-1 font-mono">{guildUser.email}</p>
          <div className="flex items-center gap-3 mt-3">
            {admin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-red-500/10 text-red-400 rounded-md border border-red-500/20">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Admin
              </span>
            )}
            {guildUser.isSchoolEmail && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-green-400/10 text-green-400/70 rounded-md border border-green-400/20">
                Verified Academic
              </span>
            )}
            {!admin && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${style.bg} ${style.text} rounded-md border ${style.border}`}>
                {TIER_LABELS[tier]}
              </span>
            )}
          </div>
        </div>
      </div>

      {editingProfile ? (
        <EditProfileForm onClose={() => setEditingProfile(false)} />
      ) : (
        <div className="rounded-xl border border-white/5 bg-void-900 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-white/40">About</h2>
            <button
              onClick={() => setEditingProfile(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/[0.06] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          </div>

          {guildUser.country || guildUser.background ? (
            <div className="flex items-center gap-6 flex-wrap mb-4">
              {guildUser.country && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-1">Country</p>
                  <p className="text-sm text-white/60">{guildUser.country}</p>
                </div>
              )}
              {guildUser.background && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-1">Background</p>
                  <p className="text-sm text-white/60">
                    {USER_BACKGROUNDS.find((b) => b.value === guildUser.background)?.label ?? guildUser.background}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {guildUser.bio ? (
            <p className="text-sm text-white/40 leading-relaxed mb-4">
              {guildUser.bio}
            </p>
          ) : null}

          {guildUser.interests.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-2">Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {guildUser.interests.map((interestId) => {
                  const advTheme = ADVANCEMENT_THEMES[interestId]
                  if (!advTheme) return <span key={interestId} className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/30">{interestId}</span>
                  return (
                    <Link
                      key={interestId}
                      to={`/advancements/${interestId}`}
                      className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded ${advTheme.bgClass} ${advTheme.colorClass} opacity-60 hover:opacity-100 transition-opacity`}
                    >
                      <AdvancementIcon icon={advTheme.icon} size={10} />
                      {advTheme.shortName}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {!guildUser.country && !guildUser.background && !guildUser.bio && guildUser.interests.length === 0 && (
            <p className="text-sm text-white/30 text-center py-4">
              No profile details yet. Click &quot;Edit Profile&quot; to add your info.
            </p>
          )}
        </div>
      )}

      {admin ? (
        <div className="rounded-xl border border-red-500/15 bg-gradient-to-br from-red-500/[0.04] to-transparent p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-red-400/60">Admin Access</p>
              <p className="text-sm text-white/40 mt-0.5">Full platform privileges. All gates bypassed.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Contribute", desc: "Ideas, threads, news, votes" },
              { label: "Moderate", desc: "Node status, content removal" },
              { label: "Library", desc: "Create and edit entries" },
            ].map((perm) => (
              <div key={perm.label} className="px-3 py-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/10">
                <p className="text-xs text-red-400/80 font-medium">{perm.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{perm.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-void-900 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/40 mb-1">
                Reputation
              </p>
              <p className="text-4xl font-bold font-mono text-white">{guildUser.repPoints}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs uppercase tracking-widest text-white/40 mb-1">
                Tier
              </p>
              <p className={`text-xl font-semibold ${style.text}`}>
                {TIER_LABELS[tier]}
              </p>
            </div>
          </div>

          <div className="w-full bg-void-800 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={guildUser.repPoints} aria-valuemin={0} aria-valuemax={3000} aria-label={`Reputation: ${guildUser.repPoints} of 3000`}>
            <div
              className={`h-full rounded-full ${style.bar} transition-all duration-500`}
              style={{
                width: `${Math.min((guildUser.repPoints / 3000) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-2 font-mono">
            <span>0</span>
            <span>100 Contributor</span>
            <span>3000 Moderator</span>
          </div>
        </div>
      )}

      <div className="mb-8">
        <VouchPanel />
      </div>

      <div className="mb-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
          Your Contributions
        </h2>
        <ContributionsSection userId={guildUser.uid} />
      </div>

      <div className="mb-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
          Bookmarks
        </h2>
        <BookmarksSection userId={guildUser.uid} />
      </div>

      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
          Advancements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADVANCEMENTS.map((advancement) => {
            const theme = ADVANCEMENT_THEMES[advancement.id]
            if (!theme) return null

            return (
              <Link
                key={advancement.id}
                to={`/advancements/${advancement.id}`}
                className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-void-900 hover:bg-void-850 transition-colors advancement-glow"
                style={{ "--glow-color": theme.glowColor } as React.CSSProperties}
              >
                <div className={`w-9 h-9 rounded-lg ${theme.bgClass} ${theme.colorClass} flex items-center justify-center opacity-60`}>
                  <AdvancementIcon icon={theme.icon} size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm text-white/70 group-hover:text-white/90 transition-colors truncate">
                    {advancement.name}
                  </h3>
                  <p className={`text-[10px] font-mono ${theme.colorClass} opacity-40`}>
                    {theme.shortName}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <SecuritySection />
    </div>
  )
}

function SecuritySection() {
  const { logout } = useAuth()
  const [revoking, setRevoking] = useState(false)
  const [revoked, setRevoked] = useState(false)

  const handleRevokeAll = async () => {
    setRevoking(true)
    try {
      const functions = getFunctions(app)
      const revokeAll = httpsCallable(functions, "revokeAllSessions")
      await revokeAll()
      setRevoked(true)
      setTimeout(() => logout(), 1500)
    } catch {
      setRevoking(false)
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-white/5">
      <h2 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
        Security
      </h2>
      <div className="rounded-xl border border-white/5 bg-void-900 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">Sign out everywhere</p>
          <p className="text-[10px] text-white/25 mt-0.5">
            Revokes all active sessions on all devices
          </p>
        </div>
        <button
          onClick={handleRevokeAll}
          disabled={revoking || revoked}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400 border border-red-500/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {revoked ? "Sessions revoked" : revoking ? "Revoking..." : "Revoke all sessions"}
        </button>
      </div>
    </div>
  )
}
