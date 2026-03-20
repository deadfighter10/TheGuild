import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { auth, db, app } from "@/lib/firebase"
import { calculateInitialRep, isSchoolEmail } from "@/domain/reputation"
import type { GuildUser } from "@/domain/user"
import { parseGuildUserDoc } from "@/lib/firestore-schemas"

type AuthState = {
  readonly firebaseUser: User | null
  readonly guildUser: GuildUser | null
  readonly loading: boolean
}

type AuthActions = {
  readonly register: (email: string, password: string, displayName: string) => Promise<void>
  readonly login: (email: string, password: string) => Promise<void>
  readonly logout: () => Promise<void>
  readonly refreshUser: () => Promise<void>
  readonly resendVerificationEmail: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    guildUser: null,
    loading: true,
  })

  const fetchGuildUser = async (uid: string): Promise<GuildUser | null> => {
    const userDoc = await getDoc(doc(db, "users", uid))
    const data = userDoc.data()
    if (!data) return null
    return parseGuildUserDoc(uid, data as Record<string, unknown>)
  }

  const migrateLegacyAdmin = async (guildUser: GuildUser | null): Promise<boolean> => {
    if (!guildUser) return false
    if (guildUser.role === "admin") return false
    if (guildUser.repPoints !== -1) return false

    try {
      const functions = getFunctions(app)
      const migrate = httpsCallable<void, { isAdmin: boolean; migrated: boolean }>(functions, "migrateAdminStatus")
      const result = await migrate()
      return result.data.migrated
    } catch {
      return false
    }
  }

  const checkEmailVerificationBonus = async (firebaseUser: User, guildUser: GuildUser | null) => {
    if (!guildUser) return
    if (guildUser.emailVerified) return
    if (!firebaseUser.emailVerified) return
    if (!guildUser.isSchoolEmail) return

    try {
      const functions = getFunctions(app)
      const claimSchoolBonus = httpsCallable(functions, "claimSchoolEmailBonus")
      await claimSchoolBonus()
    } catch {
      // Bonus will be claimed on next login
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let guildUser = await fetchGuildUser(firebaseUser.uid)
        const wasMigrated = await migrateLegacyAdmin(guildUser)
        if (wasMigrated) {
          guildUser = await fetchGuildUser(firebaseUser.uid)
        }
        await checkEmailVerificationBonus(firebaseUser, guildUser)
        const refreshedUser = guildUser ? await fetchGuildUser(firebaseUser.uid) : null
        setState({ firebaseUser, guildUser: refreshedUser ?? guildUser, loading: false })
      } else {
        setState({ firebaseUser: null, guildUser: null, loading: false })
      }
    })
    return unsubscribe
  }, [])

  const register = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })

    const schoolEmail = isSchoolEmail(email)
    const initialRep = calculateInitialRep(email)

    const guildUser: GuildUser = {
      uid: credential.user.uid,
      email,
      displayName,
      repPoints: initialRep,
      isSchoolEmail: schoolEmail,
      emailVerified: false,
      createdAt: new Date(),
      onboardingComplete: false,
      country: null,
      background: null,
      interests: [],
      bio: "",
      photoURL: null,
      role: "user" as const,
      bannedUntil: null,
      digestPreferences: { enabled: false, period: "daily" as const, lastSentAt: null },
    }

    try {
      await setDoc(doc(db, "users", credential.user.uid), {
        email: guildUser.email,
        displayName: guildUser.displayName,
        repPoints: guildUser.repPoints,
        isSchoolEmail: guildUser.isSchoolEmail,
        emailVerified: false,
        createdAt: guildUser.createdAt,
        onboardingComplete: false,
        bio: "",
        country: null,
        background: null,
        interests: [],
        role: "user",
        bannedUntil: null,
      })
    } catch (error) {
      await credential.user.delete()
      throw error
    }

    await sendEmailVerification(credential.user)

    setState((prev) => ({ ...prev, guildUser }))
  }

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const refreshUser = async () => {
    if (!state.firebaseUser) return
    const guildUser = await fetchGuildUser(state.firebaseUser.uid)
    setState((prev) => ({ ...prev, guildUser }))
  }

  const resendVerificationEmail = async () => {
    if (!state.firebaseUser) return
    await sendEmailVerification(state.firebaseUser)
  }

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, refreshUser, resendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
