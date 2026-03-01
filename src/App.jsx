import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/appStore'
import { WeddingThemeProvider } from './contexts/WeddingThemeContext'
import { ToastProvider } from './components/Toast'
import ScrollToTop from './components/ScrollToTop'

// Always-needed — tiny, required on first render
import LoginScreen from './components/LoginScreenNew'
import ChangePasswordModal from './components/ChangePasswordModal'

// Role-gated — load on demand via code splitting
const CoupleDashboard        = lazy(() => import('./components/CoupleDashboard'))
const CatalogueScreen        = lazy(() => import('./components/CatalogueScreen'))
const CoordinatorDashboard   = lazy(() => import('./components/CoordinatorDashboard'))
const WeddingDetailPage      = lazy(() => import('./components/WeddingDetailPageFull'))
const AdminDashboard         = lazy(() => import('./components/AdminDashboard'))
const CreateWeddingScreen    = lazy(() => import('./components/CreateWeddingScreenSimple'))
const InviteUsersScreen      = lazy(() => import('./components/InviteUsersScreenNew'))
const AssignCoordinatorsScreen = lazy(() => import('./components/AssignCoordinatorsScreenNew'))
const UsersManagementScreen  = lazy(() => import('./components/UsersManagementScreenNew'))
const TasksListScreen        = lazy(() => import('./components/TasksListScreen'))
const VendorListScreen       = lazy(() => import('./components/VendorListScreen'))
const CatalogueManagementScreen = lazy(() => import('./components/CatalogueManagementScreen'))
const VenuesScreen           = lazy(() => import('./components/VenuesScreen'))
const AdminNotesScreen       = lazy(() => import('./components/AdminNotesScreen'))
const DevPreview             = lazy(() => import('./components/DevPreview'))

// Minimal spinner shown while a lazy chunk loads
function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cowc-cream">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-4 border-cowc-gold border-t-transparent rounded-full"
      />
    </div>
  )
}

function _unused_DevCoupleOverlay({ devWeddingId }) {
  const navigate = useNavigate()
  const [devCoupleTab, setDevCoupleTab] = useState('home')
  const handlePreviewNavigate = (path) => {
    if (path === '/catalogue') setDevCoupleTab('catalogue')
    else if (path.startsWith('/wedding/')) navigate(path)
    else setDevCoupleTab('home')
  }
  return (
    <div className="fixed inset-0 z-[9000] overflow-auto bg-cowc-cream">
      <Suspense fallback={<RouteLoader />}>
        {devCoupleTab === 'catalogue' ? (
          <CatalogueScreen onPreviewNavigate={handlePreviewNavigate} />
        ) : (
          <CoupleDashboard
            previewWeddingId={devWeddingId}
            isPreview
            onPreviewNavigate={handlePreviewNavigate}
          />
        )}
      </Suspense>
    </div>
  )
}

function App() {
  const { user, session, loading, setUser, setSession, setLoading } = useAuthStore()


  // Welcome screen: shown when couple lands via invite link with ?setup=PASSWORD
  // Forces them to set their own permanent password before entering the app
  const [setupPassword, setSetupPassword] = useState(null)
  const [newSetupPw, setNewSetupPw] = useState('')
  const [confirmSetupPw, setConfirmSetupPw] = useState('')
  const [setupPwError, setSetupPwError] = useState('')
  const [setupPwLoading, setSetupPwLoading] = useState(false)
  const [setupPwDone, setSetupPwDone] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
        // Check for ?setup= param (invite link landing)
        const params = new URLSearchParams(window.location.search)
        const pw = params.get('setup')
        if (pw) {
          setSetupPassword(pw)
          // Remove from URL without reload
          const clean = window.location.pathname + window.location.hash.replace(/[?&]setup=[^&]+/, '')
          window.history.replaceState({}, '', clean)
        }
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet — create one (e.g. first-time Google sign-in)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: authUser?.email || '',
            full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || '',
            role: 'couple',
          })
          .select()
          .single()

        if (createError) throw createError
        setUser(newProfile)
      } else if (error) {
        throw error
      } else {
        setUser(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cowc-cream via-white to-cowc-sand flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <img src="/logo.png" alt="COWC" className="w-24 h-24 mx-auto mb-6 opacity-50" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full mx-auto mb-6"
          />
          <h1 className="text-4xl font-serif font-light text-cowc-dark mb-2">
            COWC
          </h1>
          <p className="text-cowc-gray text-sm uppercase tracking-widest">
            Loading...
          </p>
        </motion.div>
      </div>
    )
  }

  const handlePasswordChangeComplete = async () => {
    // Re-fetch user profile so force_password_change is now false
    if (user?.id) {
      await fetchUserProfile(user.id)
    }
  }

  return (
    <ToastProvider>
      <WeddingThemeProvider>
        <BrowserRouter>
          {user && user.force_password_change && (
            <ChangePasswordModal user={user} onComplete={handlePasswordChangeComplete} />
          )}

          {/* Welcome overlay — shown when couple lands via invite link */}
          {/* Forces couple to set their own permanent password before entering the app */}
          {setupPassword && user?.role === 'couple' && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
              >
                {/* Header */}
                <div className="bg-[#1a1a2e] px-8 py-6 text-center">
                  <p className="text-[#f5f0e8] font-bold text-xl tracking-widest">COWC</p>
                  <p className="text-[#a89b85] text-xs tracking-widest uppercase mt-1">Welcome to your portal</p>
                </div>

                {/* Body */}
                <div className="px-8 py-7 space-y-5">
                  {!setupPwDone ? (
                    <>
                      <div className="text-center">
                        <p className="text-[#1a1a2e] font-semibold text-lg">Create your password 🔐</p>
                        <p className="text-[#6b6b6b] text-sm mt-1">You're logged in! Set a secure password to access your portal going forward.</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[#a89b85] uppercase tracking-widest font-semibold block mb-1">New Password</label>
                          <input
                            type="password"
                            value={newSetupPw}
                            onChange={e => { setNewSetupPw(e.target.value); setSetupPwError('') }}
                            placeholder="At least 8 characters"
                            className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e0d0] text-[#1a1a2e] text-sm focus:outline-none focus:border-[#c9a96e] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#a89b85] uppercase tracking-widest font-semibold block mb-1">Confirm Password</label>
                          <input
                            type="password"
                            value={confirmSetupPw}
                            onChange={e => { setConfirmSetupPw(e.target.value); setSetupPwError('') }}
                            placeholder="Re-enter password"
                            className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e0d0] text-[#1a1a2e] text-sm focus:outline-none focus:border-[#c9a96e] transition-colors"
                            onKeyDown={async e => { if (e.key === 'Enter') await handleSetupPwSubmit() }}
                          />
                        </div>
                        {setupPwError && (
                          <p className="text-red-500 text-xs text-center">{setupPwError}</p>
                        )}
                      </div>

                      <button
                        onClick={async () => {
                          if (newSetupPw.length < 8) { setSetupPwError('Password must be at least 8 characters.'); return }
                          if (newSetupPw !== confirmSetupPw) { setSetupPwError('Passwords don\'t match.'); return }
                          setSetupPwLoading(true)
                          const { error } = await supabase.auth.updateUser({ password: newSetupPw })
                          setSetupPwLoading(false)
                          if (error) { setSetupPwError(error.message); return }
                          setSetupPwDone(true)
                        }}
                        disabled={setupPwLoading}
                        className="w-full py-3 rounded-xl bg-[#c9a96e] text-white font-semibold text-sm hover:bg-[#b8954f] transition-colors disabled:opacity-60"
                      >
                        {setupPwLoading ? 'Setting password…' : 'Set Password →'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-center py-4">
                        <p className="text-4xl mb-3">🎉</p>
                        <p className="text-[#1a1a2e] font-semibold text-lg">You're all set!</p>
                        <p className="text-[#6b6b6b] text-sm mt-1">Your password has been saved. Welcome to your wedding portal.</p>
                      </div>
                      <button
                        onClick={() => { setSetupPassword(null); setSetupPwDone(false); setNewSetupPw(''); setConfirmSetupPw('') }}
                        className="w-full py-3 rounded-xl bg-[#c9a96e] text-white font-semibold text-sm hover:bg-[#b8954f] transition-colors"
                      >
                        Enter my portal →
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
          <ScrollToTop />


          <Suspense fallback={<RouteLoader />}>
          <AnimatePresence mode="wait">
            <Routes>
            {!user ? (
              <Route path="*" element={<LoginScreen />} />
            ) : user.role === 'admin' ? (
              <>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UsersManagementScreen />} />
                <Route path="/admin/tasks" element={<TasksListScreen />} />
                <Route path="/admin/vendors" element={<VendorListScreen />} />
                <Route path="/admin/create-wedding" element={<CreateWeddingScreen />} />
                <Route path="/admin/invite-users" element={<InviteUsersScreen />} />
                <Route path="/admin/assign-coordinators" element={<AssignCoordinatorsScreen />} />
                <Route path="/admin/catalogue" element={<CatalogueManagementScreen />} />
                <Route path="/admin/venues" element={<VenuesScreen />} />
                <Route path="/admin/notes" element={<AdminNotesScreen />} />
                <Route path="/admin/preview/couple/:id" element={<DevPreview />} />
                <Route path="/wedding/:id" element={<WeddingDetailPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            ) : user.role === 'coordinator' ? (
              <>
                <Route path="/" element={<CoordinatorDashboard />} />
                <Route path="/wedding/:id" element={<WeddingDetailPage />} />
                <Route path="/admin/preview/couple/:id" element={<DevPreview />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : user.role === 'couple' ? (
              <>
                <Route path="/" element={<CoupleDashboard />} />
                <Route path="/catalogue" element={<CatalogueScreen />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/" replace />} />
            )}
            </Routes>
          </AnimatePresence>
          </Suspense>
        </BrowserRouter>
      </WeddingThemeProvider>
    </ToastProvider>
  )
}

export default App
