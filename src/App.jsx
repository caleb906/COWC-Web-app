import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/appStore'
import { WeddingThemeProvider } from './contexts/WeddingThemeContext'
import { ToastProvider } from './components/Toast'
import LoginScreen from './components/LoginScreenNew'
import ChangePasswordModal from './components/ChangePasswordModal'
import IssueFlagger from './components/IssueFlagger'
import CoordinatorDashboard from './components/CoordinatorDashboard'
import CoupleDashboard from './components/CoupleDashboard'
import AdminDashboard from './components/AdminDashboard'
import CreateWeddingScreen from './components/CreateWeddingScreenSimple'
import WeddingDetailPage from './components/WeddingDetailPageFull'
import InviteUsersScreen from './components/InviteUsersScreenNew'
import AssignCoordinatorsScreen from './components/AssignCoordinatorsScreenNew'
import UsersManagementScreen from './components/UsersManagementScreenNew'
import TasksListScreen from './components/TasksListScreen'
import VendorListScreen from './components/VendorListScreen'
import CatalogueManagementScreen from './components/CatalogueManagementScreen'
import VenuesScreen from './components/VenuesScreen'
import AdminNotesScreen from './components/AdminNotesScreen'
import CatalogueScreen from './components/CatalogueScreen'
import DevPreview from './components/DevPreview'
import DevSwitcher from './components/DevSwitcher'
import ScrollToTop from './components/ScrollToTop'

// Renders the couple-view overlay for the dev switcher.
// Lives inside BrowserRouter so hooks like useNavigate work normally.
function DevCoupleOverlay({ devWeddingId }) {
  const navigate = useNavigate()
  const [devCoupleTab, setDevCoupleTab] = useState('home') // 'home' | 'catalogue'

  const handlePreviewNavigate = (path) => {
    if (path === '/catalogue') {
      setDevCoupleTab('catalogue')
    } else if (path.startsWith('/wedding/')) {
      navigate(path) // pass through to real BrowserRouter — WeddingDetailPage
    } else {
      setDevCoupleTab('home')
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] overflow-auto bg-cowc-cream">
      {devCoupleTab === 'catalogue' ? (
        <CatalogueScreen onPreviewNavigate={handlePreviewNavigate} />
      ) : (
        <CoupleDashboard
          previewWeddingId={devWeddingId}
          isPreview
          onPreviewNavigate={handlePreviewNavigate}
        />
      )}
    </div>
  )
}

function App() {
  const { user, session, loading, setUser, setSession, setLoading } = useAuthStore()

  // Dev account view switching (test@cowc.dev only)
  const [devViewAs, setDevViewAs] = useState(null)       // null=admin, 'coordinator', 'couple'
  const [devWeddingId, setDevWeddingId] = useState(null)
  const isDev = user?.email === 'test@cowc.dev'

  // Welcome screen: shown when couple lands via invite link with ?setup=PASSWORD
  const [setupPassword, setSetupPassword] = useState(null)
  const [copiedSetup, setCopiedSetup] = useState(false)

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
          {user && <IssueFlagger />}

          {/* Welcome overlay — shown when couple lands via invite link */}
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
                  <div className="text-center">
                    <p className="text-[#1a1a2e] font-semibold text-lg">You're all set! 🎉</p>
                    <p className="text-[#6b6b6b] text-sm mt-1">Save your temporary password below. You can change it anytime in account settings.</p>
                  </div>

                  {/* Password display */}
                  <div className="bg-[#f5f0e8] rounded-2xl px-6 py-5 text-center">
                    <p className="text-xs text-[#a89b85] uppercase tracking-widest font-semibold mb-2">Temporary Password</p>
                    <p className="font-mono text-3xl font-bold text-[#1a1a2e] tracking-[0.2em] select-all">{setupPassword}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(setupPassword)
                        setCopiedSetup(true)
                        setTimeout(() => setCopiedSetup(false), 2000)
                      }}
                      className="flex-1 py-3 rounded-xl border-2 border-[#e8e0d0] text-[#1a1a2e] font-semibold text-sm hover:bg-[#f5f0e8] transition-colors"
                    >
                      {copiedSetup ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setSetupPassword(null)}
                      className="flex-1 py-3 rounded-xl bg-[#c9a96e] text-white font-semibold text-sm hover:bg-[#b8954f] transition-colors"
                    >
                      Got it →
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          <ScrollToTop />

          {/* Dev account view overlays */}
          {isDev && devViewAs === 'coordinator' && (
            <div className="fixed inset-0 z-[9000] overflow-auto bg-cowc-cream">
              <CoordinatorDashboard />
            </div>
          )}
          {isDev && devViewAs === 'couple' && devWeddingId && (
            <DevCoupleOverlay devWeddingId={devWeddingId} />
          )}

          {/* Dev switcher pill */}
          {isDev && (
            <DevSwitcher
              viewAs={devViewAs}
              setViewAs={setDevViewAs}
              devWeddingId={devWeddingId}
              setDevWeddingId={setDevWeddingId}
            />
          )}

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
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : user.role === 'couple' ? (
              <>
                <Route path="/" element={<CoupleDashboard />} />
                <Route path="/catalogue" element={<CatalogueScreen />} />
                <Route path="/wedding/:id" element={<WeddingDetailPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/" replace />} />
            )}
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </WeddingThemeProvider>
    </ToastProvider>
  )
}

export default App
