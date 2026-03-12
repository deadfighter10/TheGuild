import { useState, useEffect, useRef, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { AdvancementIcon, BookIcon, TreeIcon, NewspaperIcon, UsersIcon, ChevronRightIcon } from "@/shared/components/Icons"
import { fetchCountryUserCounts } from "@/features/globe/globe-service"
import { useAuth } from "@/features/auth/AuthContext"
import { Dashboard } from "./Dashboard"

function useScrollReveal() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function ScrollReveal({ children, className = "", delay = 0 }: {
  readonly children: ReactNode
  readonly className?: string
  readonly delay?: number
}) {
  const { ref, visible } = useScrollReveal()

  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </section>
  )
}

function TopCountries() {
  const [top5, setTop5] = useState<readonly { readonly country: string; readonly count: number }[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchCountryUserCounts().then((counts) => {
      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }))
      setTop5(sorted)
      setTotal([...counts.values()].reduce((sum, c) => sum + c, 0))
    })
  }, [])

  const maxCount = top5[0]?.count ?? 1

  return (
    <div className="animate-fade-up stagger-3">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-widest text-white/30">
          {total > 0 ? `${total} member${total !== 1 ? "s" : ""} worldwide` : "Members worldwide"}
        </span>
      </div>
      {top5.length > 0 ? (
        <div className="space-y-2.5">
          {top5.map((entry) => (
            <div key={entry.country} className="flex items-center gap-4">
              <span className="text-sm text-white/60 font-medium w-28 truncate">
                {entry.country}
              </span>
              <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400/30 rounded-full transition-all duration-700"
                  style={{ width: `${(entry.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs text-white/30 w-8 text-right">
                {entry.count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {[1, 0.7, 0.5, 0.35, 0.2].map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-28 h-3 bg-white/[0.03] rounded animate-pulse" />
              <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-white/[0.04] rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />
              </div>
              <span className="w-8 h-3 bg-white/[0.03] rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/[0.04] via-cyan-500/[0.03] to-transparent blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-24 sm:pt-36 sm:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div>
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-tight text-white/90 font-bold animate-fade-up">
              Welcome to<br />
              <span className="hero-warm-gradient-text">The Guild</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-white/40 max-w-md leading-relaxed animate-fade-up stagger-2">
              An open research hub where scientists, engineers, and curious
              minds collaborate on humanity&apos;s most important frontiers.
            </p>

            <div className="mt-10 animate-fade-up stagger-3">
              <Link
                to="/auth"
                className="inline-flex px-8 py-3.5 text-sm font-bold tracking-wide rounded-full bg-white text-void-950 hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg shadow-white/5"
              >
                Join The Guild
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 sm:p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white/30 mb-6">
              Top countries by active users
            </h2>
            <TopCountries />
          </div>
        </div>
      </div>
    </section>
  )
}

function FrontiersSection() {
  const firstRow = ADVANCEMENTS.slice(0, 3)
  const secondRow = ADVANCEMENTS.slice(3, 6)

  return (
    <ScrollReveal className="relative max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400/50 mb-4">
          Six Frontiers
        </p>
        <h2 className="font-display text-3xl sm:text-4xl text-white/90">
          The biggest problems worth solving
        </h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {firstRow.map((advancement) => {
            const theme = ADVANCEMENT_THEMES[advancement.id]
            if (!theme) return null
            return (
              <AdvancementCard
                key={advancement.id}
                advancement={advancement}
                theme={theme}
              />
            )
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {secondRow.map((advancement) => {
            const theme = ADVANCEMENT_THEMES[advancement.id]
            if (!theme) return null
            return (
              <AdvancementCard
                key={advancement.id}
                advancement={advancement}
                theme={theme}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/advancements"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Explore all advancements
          <ChevronRightIcon size={14} />
        </Link>
      </div>
    </ScrollReveal>
  )
}

function AdvancementCard({ advancement, theme }: {
  readonly advancement: { readonly id: string; readonly name: string }
  readonly theme: { readonly colorClass: string; readonly bgClass: string; readonly icon: string; readonly shortName: string; readonly tagline: string; readonly glowColor: string }
}) {
  return (
    <Link
      to={`/advancements/${advancement.id}`}
      className="group relative p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${theme.bgClass} ${theme.colorClass} flex items-center justify-center`}>
          <AdvancementIcon icon={theme.icon} size={18} />
        </div>
        <span className={`font-mono text-xs uppercase tracking-widest ${theme.colorClass} opacity-60`}>
          {theme.shortName}
        </span>
      </div>

      <p className="text-white/30 text-sm leading-relaxed">
        {theme.tagline}
      </p>

      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRightIcon size={14} className="text-white/30" />
      </div>
    </Link>
  )
}

const PILLARS = [
  {
    icon: BookIcon,
    title: "The Grand Library",
    description: "Plain-language translations of cutting-edge research papers. Free to read, open to everyone.",
    color: "text-cyan-400",
  },
  {
    icon: TreeIcon,
    title: "The Tree",
    description: "A living knowledge graph where ideas connect, branch, and grow into breakthroughs.",
    color: "text-green-400",
  },
  {
    icon: NewspaperIcon,
    title: "The Newsroom",
    description: "Real-time aggregation of news, papers, and discoveries across every frontier.",
    color: "text-violet-400",
  },
  {
    icon: UsersIcon,
    title: "The Pool",
    description: "Community-funded treasury that backs promising ideas and rewards contributors.",
    color: "text-amber-400",
  },
] as const

function HowItWorksSection() {
  return (
    <ScrollReveal className="relative max-w-6xl mx-auto px-6 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
        <div className="lg:col-span-2 lg:sticky lg:top-32">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400/50 mb-4">
            Built for collaboration
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-white/90 mb-5">
            Everything you need to contribute
          </h2>
          <p className="text-white/35 leading-relaxed text-sm">
            The Guild is built around four pillars that work together:
            learn, create, share, and fund the ideas that matter most.
          </p>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.title}
              className={`group flex items-start gap-5 p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all animate-fade-up stagger-${i + 1}`}
            >
              <div className={`mt-0.5 ${pillar.color} shrink-0`}>
                <pillar.icon size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-sm mb-1.5">
                  {pillar.title}
                </h3>
                <p className="text-white/30 text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  )
}

function RepSection() {
  const tiers = [
    { name: "Observer", range: "0 - 99", desc: "Read and learn", emoji: "eye", fill: "w-[8%]", color: "bg-white/20" },
    { name: "Contributor", range: "100 - 2,999", desc: "Create, vote, and collaborate", emoji: "pen", fill: "w-[45%]", color: "bg-cyan-400/40" },
    { name: "Moderator", range: "3,000+", desc: "Govern and shape the future", emoji: "crown", fill: "w-full", color: "bg-amber-400/40" },
  ] as const

  return (
    <ScrollReveal className="relative max-w-6xl mx-auto px-6 py-24">
      <div className="relative rounded-3xl border border-white/[0.04] bg-white/[0.02] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-amber-500/[0.03] to-transparent rounded-full blur-3xl" />

        <div className="relative p-8 sm:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400/50 mb-4">
                Reputation
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-white/90 mb-5">
                Grow with every contribution
              </h2>
              <p className="text-white/35 leading-relaxed mb-8">
                Start at zero. Verify your school email, get vouched by peers,
                contribute great ideas. Your Rep unlocks deeper access to
                tools, governance, and funding.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-white/10 text-white/80 hover:bg-white/15 border border-white/10 transition-colors"
              >
                Start at zero
                <ChevronRightIcon size={14} />
              </Link>
            </div>

            <div className="space-y-4">
              {tiers.map((tier) => (
                <div key={tier.name} className="p-5 rounded-xl bg-void-950/40 border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-white/80">
                      {tier.name}
                    </span>
                    <span className="font-mono text-[11px] text-white/25">
                      {tier.range} Rep
                    </span>
                  </div>
                  <p className="text-white/25 text-xs mb-3">{tier.desc}</p>
                  <div className="h-1.5 bg-void-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${tier.fill} ${tier.color} transition-all duration-1000`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}

function CTASection() {
  return (
    <ScrollReveal className="relative max-w-4xl mx-auto px-6 py-32 text-center">
      <div className="relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/[0.04] via-cyan-500/[0.03] to-violet-500/[0.03] rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="font-display text-4xl sm:text-5xl text-white/90 mb-5 leading-tight">
            The future is built by<br />
            <span className="hero-warm-gradient-text">those who show up</span>
          </h2>
          <p className="text-white/30 max-w-md mx-auto mb-10 leading-relaxed">
            Researcher, student, engineer, or just deeply curious —
            there is room for you here.
          </p>
          <Link
            to="/auth"
            className="inline-flex px-8 py-3.5 text-sm font-bold tracking-wide rounded-full bg-white text-void-950 hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg shadow-white/5"
          >
            Join The Guild
          </Link>
        </div>
      </div>
    </ScrollReveal>
  )
}

function LandingPage() {
  return (
    <>
      <HeroSection />
      <FrontiersSection />
      <HowItWorksSection />
      <RepSection />
      <CTASection />
    </>
  )
}

export function HomePage() {
  const { firebaseUser, loading } = useAuth()

  if (loading) return null

  if (firebaseUser) {
    return <Dashboard />
  }

  return <LandingPage />
}
