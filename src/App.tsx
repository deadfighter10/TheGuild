import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/features/auth/AuthContext"
import { isAdmin } from "@/domain/user"
import { Layout } from "@/shared/components/Layout"
import { ErrorBoundary } from "@/shared/components/ErrorBoundary"
import { ToastProvider } from "@/shared/components/Toast"
import type { ReactNode } from "react"

const HomePage = lazy(() => import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })))
const AdvancementsPage = lazy(() => import("@/features/advancements/AdvancementsPage").then((m) => ({ default: m.AdvancementsPage })))
const AdvancementDetailPage = lazy(() => import("@/features/advancements/AdvancementDetailPage").then((m) => ({ default: m.AdvancementDetailPage })))
const LibraryPage = lazy(() => import("@/features/library/LibraryPage").then((m) => ({ default: m.LibraryPage })))
const LibraryEntryPage = lazy(() => import("@/features/library/LibraryEntryPage").then((m) => ({ default: m.LibraryEntryPage })))
const NewsroomPage = lazy(() => import("@/features/newsroom/NewsroomPage").then((m) => ({ default: m.NewsroomPage })))
const AuthForm = lazy(() => import("@/features/auth/AuthForm").then((m) => ({ default: m.AuthForm })))
const OnboardingPage = lazy(() => import("@/features/onboarding/OnboardingPage").then((m) => ({ default: m.OnboardingPage })))
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })))
const PoolPage = lazy(() => import("@/features/pool/PoolPage").then((m) => ({ default: m.PoolPage })))
const AdminPage = lazy(() => import("@/features/admin/AdminPage").then((m) => ({ default: m.AdminPage })))
const PublicProfilePage = lazy(() => import("@/features/profile/PublicProfilePage").then((m) => ({ default: m.PublicProfilePage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 animate-pulse" />
        <p className="text-white/30 font-mono text-xs tracking-wider">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { readonly children: ReactNode }) {
  const { firebaseUser, guildUser, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/auth" replace />
  if (guildUser && !guildUser.onboardingComplete && !isAdmin(guildUser.repPoints)) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function OnboardingRoute({ children }: { readonly children: ReactNode }) {
  const { firebaseUser, guildUser, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/auth" replace />
  if (guildUser?.onboardingComplete) return <Navigate to="/profile" replace />

  return <>{children}</>
}

function AdminRoute({ children }: { readonly children: ReactNode }) {
  const { firebaseUser, guildUser, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/auth" replace />
  if (!guildUser || !isAdmin(guildUser.repPoints)) return <Navigate to="/" replace />

  return <>{children}</>
}

function PublicRoute({ children }: { readonly children: ReactNode }) {
  const { firebaseUser, guildUser, loading } = useAuth()

  if (loading) return <PageLoader />
  if (firebaseUser) {
    if (guildUser && isAdmin(guildUser.repPoints)) return <Navigate to="/admin" replace />
    if (guildUser && !guildUser.onboardingComplete) return <Navigate to="/onboarding" replace />
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <ErrorBoundary>
    <ToastProvider>
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/advancements" element={<AdvancementsPage />} />
              <Route path="/advancements/:id" element={<ProtectedRoute><AdvancementDetailPage /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/library/:id" element={<ProtectedRoute><LibraryEntryPage /></ProtectedRoute>} />
              <Route path="/newsroom" element={<ProtectedRoute><NewsroomPage /></ProtectedRoute>} />
              <Route path="/pool" element={<ProtectedRoute><PoolPage /></ProtectedRoute>} />
              <Route
                path="/auth"
                element={
                  <PublicRoute>
                    <div className="max-w-7xl mx-auto px-6 pt-12">
                      <div className="text-center mb-4">
                        <h1 className="font-display text-4xl text-white">The Guild</h1>
                        <p className="text-white/30 mt-2">
                          Contributing to humanity&apos;s biggest advancements
                        </p>
                      </div>
                      <AuthForm />
                    </div>
                  </PublicRoute>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <OnboardingRoute>
                    <OnboardingPage />
                  </OnboardingRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:uid"
                element={
                  <ProtectedRoute>
                    <PublicProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
            </Routes>
          </Suspense>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
    </ToastProvider>
    </ErrorBoundary>
  )
}
