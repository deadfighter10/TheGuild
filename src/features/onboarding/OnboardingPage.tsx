import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/features/auth/AuthContext"
import { ADVANCEMENTS } from "@/domain/advancement"
import { ADVANCEMENT_THEMES } from "@/domain/advancement-theme"
import { COUNTRIES } from "@/domain/countries"
import { USER_BACKGROUNDS, validateOnboardingProfile } from "@/domain/onboarding"
import type { UserBackground } from "@/domain/onboarding"
import { AdvancementIcon, ChevronRightIcon } from "@/shared/components/Icons"

type Step = 0 | 1 | 2 | 3

export function OnboardingPage() {
  const { guildUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [country, setCountry] = useState("")
  const [background, setBackground] = useState<UserBackground | "">("")
  const [interests, setInterests] = useState<readonly string[]>([])
  const [bio, setBio] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  if (!guildUser) return null

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const canAdvance = (): boolean => {
    if (step === 0) return country !== ""
    if (step === 1) return background !== ""
    if (step === 2) return interests.length > 0
    return true
  }

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as Step)
      setError("")
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep((step - 1) as Step)
      setError("")
    }
  }

  const handleFinish = async () => {
    const validation = validateOnboardingProfile({
      country,
      background: background as UserBackground,
      interests,
      bio,
    })

    if (!validation.valid) {
      setError(validation.reason)
      return
    }

    setSaving(true)
    setError("")

    try {
      await updateDoc(doc(db, "users", guildUser.uid), {
        country,
        background,
        interests,
        bio: bio.trim(),
        onboardingComplete: true,
      })
      await refreshUser()
      navigate("/profile")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mb-3">
            Step {step + 1} of 4
          </p>
          <div className="flex items-center gap-1.5 justify-center mb-8">
            {[0, 1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-cyan-400/60 w-10" : "bg-white/10 w-6"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-3xl text-white text-center mb-2">
              Where are you from?
            </h2>
            <p className="text-white/30 text-sm text-center mb-8">
              Help us understand our global community
            </p>

            <div className="relative">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3.5 bg-void-900 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Select your country
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRightIcon size={16} className="text-white/20 rotate-90" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-3xl text-white text-center mb-2">
              What&apos;s your background?
            </h2>
            <p className="text-white/30 text-sm text-center mb-8">
              This helps us tailor your experience
            </p>

            <div className="space-y-2">
              {USER_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setBackground(bg.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    background === bg.value
                      ? "border-cyan-400/40 bg-cyan-400/5"
                      : "border-white/5 bg-void-900 hover:bg-void-850 hover:border-white/10"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    background === bg.value ? "border-cyan-400" : "border-white/20"
                  }`}>
                    {background === bg.value && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${background === bg.value ? "text-white" : "text-white/60"}`}>
                      {bg.label}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">{bg.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-3xl text-white text-center mb-2">
              What interests you?
            </h2>
            <p className="text-white/30 text-sm text-center mb-8">
              Pick one or more advancements you want to follow
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ADVANCEMENTS.map((adv) => {
                const theme = ADVANCEMENT_THEMES[adv.id]
                if (!theme) return null
                const selected = interests.includes(adv.id)

                return (
                  <button
                    key={adv.id}
                    onClick={() => toggleInterest(adv.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      selected
                        ? `${theme.borderClass} ${theme.bgClass}`
                        : "border-white/5 bg-void-900 hover:bg-void-850 hover:border-white/10"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selected ? `${theme.bgClass} ${theme.colorClass}` : "bg-white/5 text-white/25"
                    }`}>
                      <AdvancementIcon icon={theme.icon} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${selected ? "text-white" : "text-white/50"}`}>
                        {theme.shortName}
                      </p>
                      <p className="text-[10px] text-white/30 truncate">{theme.tagline}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {interests.length > 0 && (
              <p className="text-center text-xs text-white/30 mt-4">
                {interests.length} selected
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-3xl text-white text-center mb-2">
              Tell us about yourself
            </h2>
            <p className="text-white/30 text-sm text-center mb-8">
              Optional — a short bio visible on your profile
            </p>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="What drives you? What are you working on? What do you hope to contribute?"
              className="w-full px-4 py-3.5 bg-void-900 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400/50 transition-colors resize-none placeholder:text-white/15 leading-relaxed"
            />
            <p className="text-[10px] text-white/25 mt-2 text-right font-mono">
              Optional
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-400/80 text-sm px-3 py-2 mt-4 rounded-lg bg-red-400/5 border border-red-400/10 text-center" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between mt-10">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="px-6 py-2.5 bg-white text-void-950 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              Continue
              <ChevronRightIcon size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-violet-500 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-opacity shadow-lg shadow-cyan-400/20"
            >
              {saving ? "Saving..." : "Complete & Enter The Guild"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
