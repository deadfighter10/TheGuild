import { useState, useEffect, useMemo, useCallback } from "react"
import { useFocusTrap, useEscapeKey } from "@/shared/hooks/use-focus-trap"
import { usePageView } from "@/shared/hooks/use-page-view"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { isAdmin } from "@/domain/user"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon } from "@/shared/components/Icons"
import type { ReactNode } from "react"
import { NotificationBell } from "@/features/notifications/NotificationBell"
import { OfflineBanner } from "@/shared/components/OfflineBanner"
import { UserAvatar } from "@/shared/components/UserAvatar"
import Fuse from "fuse.js"

const NAV_LINKS = [
  { path: "/", label: "Home" },
  { path: "/advancements", label: "Advancements" },
  { path: "/library", label: "Library" },
  { path: "/newsroom", label: "Newsroom" },
  { path: "/bounties", label: "Bounties" },
  { path: "/pool", label: "The Pool" },
] as const

const ADVANCEMENT_SEARCH_ITEMS = ADVANCEMENTS.map((a) => {
  const theme = ADVANCEMENT_THEMES[a.id]
  return { ...a, shortName: theme?.shortName ?? "" }
})

const advancementFuse = new Fuse(ADVANCEMENT_SEARCH_ITEMS, {
  keys: ["name", "id", "shortName"],
  threshold: 0.4,
})

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "All Advancements", path: "/advancements" },
  { label: "Grand Library", path: "/library" },
  { label: "Newsroom", path: "/newsroom" },
  { label: "Bounties", path: "/bounties" },
  { label: "The Pool", path: "/pool" },
  { label: "Profile", path: "/profile" },
]

const navFuse = new Fuse(NAV_ITEMS, {
  keys: ["label"],
  threshold: 0.3,
})

function useCurrentAdvancement() {
  const location = useLocation()
  const match = location.pathname.match(/^\/advancements\/([^/]+)/)
  if (!match) return null
  const id = match[1]
  const advancement = ADVANCEMENTS.find((a) => a.id === id)
  const theme = id ? ADVANCEMENT_THEMES[id] : undefined
  if (!advancement || !theme) return null
  return { advancement, theme, id }
}

function MenuIcon({ size = 20 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function CloseIcon({ size = 20 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SearchIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CommandPalette({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()
  const focusTrapRef = useFocusTrap(open)
  useEscapeKey(open, onClose)

  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  if (!open) return null

  const advancementResults = useMemo(() =>
    query.length > 0
      ? advancementFuse.search(query).map((r) => r.item).slice(0, 4)
      : [],
    [query],
  )

  const navResults = useMemo(() =>
    query.length > 0
      ? navFuse.search(query).map((r) => r.item).slice(0, 3)
      : [],
    [query],
  )

  const handleSelect = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-void-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed top-[15%] sm:top-[20%] left-1/2 -translate-x-1/2 z-[61] w-full max-w-lg px-4 sm:px-0" role="dialog" aria-modal="true" aria-label="Search and navigation" ref={focusTrapRef}>
        <div className="rounded-2xl border border-white/[0.08] bg-void-900 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <SearchIcon size={16} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search advancements, pages..."
              aria-label="Search advancements and pages"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <kbd className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono text-white/30 border border-white/[0.08] bg-white/[0.03]">
              ESC
            </kbd>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {query.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-white/30">
                Type to search advancements or navigate
              </div>
            )}

            {advancementResults.length > 0 && (
              <div className="px-3 py-2">
                <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-white/30">Advancements</p>
                {advancementResults.map((adv) => {
                  const t = ADVANCEMENT_THEMES[adv.id]
                  if (!t) return null
                  return (
                    <button
                      key={adv.id}
                      onClick={() => handleSelect(`/advancements/${adv.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                      <div className={`w-6 h-6 rounded-md ${t.bgClass} ${t.colorClass} flex items-center justify-center`}>
                        <AdvancementIcon icon={t.icon} size={12} />
                      </div>
                      <span>{t.shortName}</span>
                      <span className="ml-auto text-[10px] text-white/15 truncate max-w-[180px]">{adv.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {navResults.length > 0 && (
              <div className="px-3 py-2 border-t border-white/[0.04]">
                <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-white/30">Pages</p>
                {navResults.map((nav) => (
                  <button
                    key={nav.path}
                    onClick={() => handleSelect(nav.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    <span>{nav.label}</span>
                  </button>
                ))}
              </div>
            )}

            {query.length > 0 && advancementResults.length === 0 && navResults.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-white/30">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function EmailVerificationBanner() {
  const { firebaseUser, guildUser, resendVerificationEmail } = useAuth()
  const [sent, setSent] = useState(false)

  if (!firebaseUser || !guildUser) return null
  if (guildUser.emailVerified) return null
  if (firebaseUser.emailVerified) return null

  const handleResend = async () => {
    await resendVerificationEmail()
    setSent(true)
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-center text-sm">
      <span className="text-amber-300/80">
        Verify your email to unlock full access
        {guildUser.isSchoolEmail && " and earn +100 Rep"}.
      </span>
      {sent ? (
        <span className="ml-2 text-amber-300/60">Verification email sent!</span>
      ) : (
        <button
          onClick={handleResend}
          className="ml-2 text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Resend email
        </button>
      )}
    </div>
  )
}

export function Layout({ children }: { readonly children: ReactNode }) {
  const { firebaseUser, guildUser, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const currentAdv = useCurrentAdvancement()
  usePageView()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
    return undefined
  }, [mobileMenuOpen])

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])
  useEscapeKey(mobileMenuOpen, closeMobileMenu)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-void-950 text-white noise-overlay">
      <OfflineBanner />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-void-900 focus:text-white focus:rounded-lg focus:border focus:border-white/20 focus:text-sm"
      >
        Skip to content
      </a>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-void-950/80 backdrop-blur-xl" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-void-950 font-bold text-xs">
                G
              </div>
              {!currentAdv && (
                <span className="font-display text-lg tracking-tight text-white">
                  The Guild
                </span>
              )}
            </Link>

            {currentAdv && (
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-white/15">/</span>
                <Link
                  to="/advancements"
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Advancements
                </Link>
                <span className="text-white/15">/</span>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md ${currentAdv.theme.bgClass} ${currentAdv.theme.colorClass} flex items-center justify-center`}>
                    <AdvancementIcon icon={currentAdv.theme.icon} size={10} />
                  </div>
                  <span className={`text-sm font-medium ${currentAdv.theme.colorClass}`}>
                    {currentAdv.theme.shortName}
                  </span>
                </div>
              </div>
            )}

            {!currentAdv && (
              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = link.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(link.path)

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "text-white bg-white/10"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-white/30 hover:text-white/50 transition-colors text-xs"
              aria-label="Search"
            >
              <SearchIcon size={13} />
              <span>Search</span>
              <kbd className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/15 border border-white/[0.06]">
                ⌘K
              </kbd>
            </button>

            {firebaseUser && guildUser ? (
              <>
                <div className="hidden md:block">
                  <NotificationBell />
                </div>
                {isAdmin(guildUser.role) && (
                  <Link
                    to="/admin"
                    className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md bg-red-500/10 text-red-400/70 hover:text-red-400 border border-red-500/15 hover:border-red-500/30 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Admin
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 group"
                >
                  <UserAvatar name={guildUser.displayName} photoURL={guildUser.photoURL} size="xs" />
                  <span className="hidden sm:block text-sm text-white/60 group-hover:text-white/90 transition-colors">
                    {isAdmin(guildUser.role) ? "Admin" : `${guildUser.repPoints} Rep`}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="hidden md:block text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="hidden md:inline-flex px-4 py-1.5 text-sm font-medium rounded-md bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors"
              >
                Join
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-void-950/90 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 mt-14 border-t border-white/5 bg-void-950/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
            <div className="px-6 py-6 space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = link.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.path)

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}

              {ADVANCEMENTS.length > 0 && (
                <div className="border-t border-white/5 mt-4 pt-4">
                  <p className="px-4 py-1 text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">
                    Advancements
                  </p>
                  {ADVANCEMENTS.map((adv) => {
                    const t = ADVANCEMENT_THEMES[adv.id]
                    if (!t) return null
                    return (
                      <Link
                        key={adv.id}
                        to={`/advancements/${adv.id}`}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <div className={`w-6 h-6 rounded-md ${t.bgClass} ${t.colorClass} flex items-center justify-center`}>
                          <AdvancementIcon icon={t.icon} size={12} />
                        </div>
                        {t.shortName}
                      </Link>
                    )
                  })}
                </div>
              )}

              <div className="border-t border-white/5 mt-4 pt-4 space-y-1">
                {firebaseUser && guildUser ? (
                  <>
                    {isAdmin(guildUser.role) && (
                      <Link
                        to="/admin"
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                          location.pathname === "/admin"
                            ? "text-red-400 bg-red-500/10"
                            : "text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
                        }`}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        location.pathname === "/profile"
                          ? "text-white bg-white/10"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      Profile ({isAdmin(guildUser.role) ? "Admin" : `${guildUser.repPoints} Rep`})
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    className="block px-4 py-3 rounded-lg text-base font-medium text-cyan-400 hover:bg-cyan-400/5 transition-colors"
                  >
                    Join The Guild
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-14">
        <EmailVerificationBanner />
      </div>

      <main id="main-content" className="relative z-10" role="main">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/5 mt-32">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-void-950 font-bold text-xs">
                  G
                </div>
                <span className="font-display text-lg text-white">The Guild</span>
              </div>
              <p className="text-white/30 text-sm max-w-sm leading-relaxed">
                An open hub for contributors working on humanity&apos;s most important scientific
                and technological advancements. Built by researchers, for researchers.
              </p>
            </div>

            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
                Explore
              </h4>
              <div className="flex flex-col gap-2">
                <Link to="/advancements" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  Advancements
                </Link>
                <Link to="/library" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  Grand Library
                </Link>
                <Link to="/newsroom" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  Newsroom
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
                Community
              </h4>
              <div className="flex flex-col gap-2">
                <Link to="/auth" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  Join
                </Link>
                <span className="text-sm text-white/30 cursor-default">
                  Discord (100+ Rep)
                </span>
                <Link to="/pool" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  The Pool
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-white/30 font-mono">
              open source / open science / open future
            </p>
            <p className="text-xs text-white/30 font-mono">
              v0.1.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
