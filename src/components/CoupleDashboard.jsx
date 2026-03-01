import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Heart, Calendar, MapPin, CheckCircle2, Circle, LogOut, ChevronRight, ExternalLink, X, Users, ShoppingBag, Palette, Package, Camera, Video, Flower2, Music2, UtensilsCrossed, Cake, Sparkles, BookOpen, Building2, Car, Settings, Loader2, Eye, EyeOff, Plus, Trash2, Upload, FileText, Search, Check, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI, tasksAPI, vendorsAPI, logChangeAndNotify } from '../services/unifiedAPI'
import { coupleVendorsAPI, vendorsAPI as supaVendorsAPI } from '../services/supabaseAPI'
import { useWeddingTheme } from '../contexts/WeddingThemeContext'
import { formatDate, daysUntil, isPastDue } from '../utils/dates'
import { primaryGradient, primaryAccent, primaryAlpha, primaryPageBg } from '../utils/colorUtils'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from './Toast'

// Standard vendor slots — `covers` = which category values fill this slot
const VENDOR_SLOTS = [
  { category: 'photographer',   label: 'Photographer',   icon: Camera,          covers: ['photographer', 'photo_video'] },
  { category: 'videographer',   label: 'Videographer',   icon: Video,           covers: ['videographer', 'photo_video'] },
  { category: 'florist',        label: 'Florist',        icon: Flower2,         covers: ['florist'] },
  { category: 'dj',             label: 'DJ',             icon: Music2,          covers: ['dj', 'band'] },
  { category: 'caterer',        label: 'Catering',       icon: UtensilsCrossed, covers: ['caterer'] },
  { category: 'baker',          label: 'Wedding Cake',   icon: Cake,            covers: ['baker'] },
  { category: 'hair_makeup',    label: 'Hair & Makeup',  icon: Sparkles,        covers: ['hair_makeup'] },
  { category: 'officiant',      label: 'Officiant',      icon: BookOpen,        covers: ['officiant'] },
  { category: 'venue',          label: 'Venue',          icon: Building2,       covers: ['venue'] },
  { category: 'transportation', label: 'Transportation', icon: Car,             covers: ['transportation'] },
]
const SLOT_CATEGORIES = new Set(VENDOR_SLOTS.flatMap(s => s.covers))

// Color palette key order for editing
const PALETTE_KEYS = ['primary', 'secondary', 'accent', 'color4', 'color5']
const PALETTE_LABELS = ['Primary', 'Secondary', 'Accent', 'Color 4', 'Color 5']

export default function CoupleDashboard({ previewWeddingId, isPreview, onPreviewNavigate } = {}) {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()
  const { theme, setWeddingTheme } = useWeddingTheme()
  const [loading, setLoading] = useState(true)
  const [wedding, setWedding] = useState(null)
  const [tasks, setTasks] = useState([])
  const [myReservations, setMyReservations] = useState([])
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'timeline' | 'vendors' | 'style'

  // Account settings
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountTab, setAccountTab] = useState('email') // 'email' | 'password' | 'venue'
  const [venueNameEdit, setVenueNameEdit] = useState('')
  const [venueAddressEdit, setVenueAddressEdit] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)

  // Vendor suggestion
  const [submittingVendor, setSubmittingVendor] = useState(false)
  const [showCustomVendorForm, setShowCustomVendorForm] = useState(false)
  const [customVendorName, setCustomVendorName] = useState('')
  const [customVendorCategory, setCustomVendorCategory] = useState('')

  // My Vendors (couple-owned)
  const [coupleVendors, setCoupleVendors] = useState([])
  const [showAddCoupleVendor, setShowAddCoupleVendor] = useState(false)
  const [cvSearch, setCvSearch] = useState('')
  const [cvSearchResults, setCvSearchResults] = useState([])
  const [cvSearching, setCvSearching] = useState(false)
  const [cvForm, setCvForm] = useState({ name: '', category: '', phone: '', email: '', notes: '', vendor_id: null })
  const [cvSaving, setCvSaving] = useState(false)
  const [cvUploadingId, setCvUploadingId] = useState(null)
  const [cvExpandedId, setCvExpandedId] = useState(null)

  // Palette editing
  const [editingPalette, setEditingPalette] = useState(false)
  const [paletteColors, setPaletteColors] = useState([])
  const [paletteSaving, setPaletteSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, previewWeddingId])

  const loadData = async () => {
    if (!user) return
    try {
      let weddingData
      if (previewWeddingId) {
        weddingData = await weddingsAPI.getById(previewWeddingId)
      } else {
        const weddingsData = await weddingsAPI.getForCouple(user.id)
        if (weddingsData.length === 0) { setLoading(false); return }
        weddingData = await weddingsAPI.getById(weddingsData[0].id)
      }
      setWedding(weddingData)
      if (weddingData.theme) setWeddingTheme(weddingData.theme)
      const [tasksData, { data: resData }] = await Promise.all([
        tasksAPI.getByWedding(weddingData.id),
        supabase
          .from('inventory_reservations')
          .select('*, inventory_items(*)')
          .eq('wedding_id', weddingData.id)
          .not('status', 'in', '("declined","returned")')
          .order('created_at', { ascending: false }),
      ])
      setTasks(tasksData)
      setMyReservations(resData || [])
      const cvData = await coupleVendorsAPI.getByWedding(weddingData.id)
      setCoupleVendors(cvData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // In preview mode, delegate navigation to parent; otherwise use router
  const safeNavigate = (path) => {
    if (isPreview) { if (onPreviewNavigate) onPreviewNavigate(path); return }
    navigate(path)
  }

  const handleTaskToggle = async (task) => {
    if (!user || !wedding) return
    try {
      const newCompleted = !task.completed
      if (newCompleted) {
        await tasksAPI.complete(task.id)
        await logChangeAndNotify({
          wedding_id: wedding.id,
          changed_by_user_id: user.id,
          change_type: 'task_completed',
          entity_type: 'task',
          entity_id: task.id,
          description: `Completed task: ${task.title}`,
        })
        toast.success(`Completed: ${task.title}`)
      } else {
        await tasksAPI.uncomplete(task.id)
        toast.info(`Reopened: ${task.title}`)
      }
      await loadData()
    } catch (error) {
      console.error('Error toggling task:', error)
      toast.error('Failed to update task. Please try again.')
    }
  }

  const handleSuggestCustomVendor = async () => {
    if (!wedding || !customVendorName.trim() || !customVendorCategory) return
    setSubmittingVendor(true)
    try {
      const catLabel = customVendorCategory.charAt(0).toUpperCase() + customVendorCategory.slice(1).replace('_', ' ')
      await vendorsAPI.create({
        wedding_id: wedding.id,
        name: customVendorName.trim(),
        category: customVendorCategory,
        status: 'pending',
        submitted_by_couple: true,
      })
      await logChangeAndNotify({
        wedding_id: wedding.id,
        changed_by_user_id: user.id,
        change_type: 'vendor_suggested',
        entity_type: 'vendor',
        entity_id: wedding.id,
        description: `Suggested ${catLabel}: ${customVendorName.trim()}`,
      })
      toast.success(`${catLabel} suggestion sent to your coordinator!`)
      setShowCustomVendorForm(false)
      setCustomVendorName('')
      setCustomVendorCategory('')
      await loadData()
    } catch {
      toast.error('Failed to send suggestion.')
    } finally {
      setSubmittingVendor(false)
    }
  }

  // ── My Vendors handlers ──────────────────────────────────────────────────────
  const handleCvSearch = async (q) => {
    setCvSearch(q)
    if (q.length < 2) { setCvSearchResults([]); return }
    setCvSearching(true)
    try {
      const results = await supaVendorsAPI.search(q)
      setCvSearchResults(results)
    } catch { setCvSearchResults([]) }
    finally { setCvSearching(false) }
  }

  const handleCvSelectExisting = (v) => {
    setCvForm({ name: v.name, category: v.category, phone: v.phone || '', email: v.contact_email || '', notes: '', vendor_id: v.id })
    setCvSearch('')
    setCvSearchResults([])
  }

  const handleCvSave = async () => {
    if (!cvForm.name.trim() || !cvForm.category || !wedding) return
    setCvSaving(true)
    try {
      const created = await coupleVendorsAPI.create({ wedding_id: wedding.id, ...cvForm, name: cvForm.name.trim() })
      setCoupleVendors(prev => [...prev, created])
      setCvForm({ name: '', category: '', phone: '', email: '', notes: '', vendor_id: null })
      setShowAddCoupleVendor(false)
      toast.success('Vendor added!')
    } catch (err) { toast.error(err.message || 'Failed to add vendor') }
    finally { setCvSaving(false) }
  }

  const handleCvToggleConfirmed = async (v) => {
    try {
      const updated = await coupleVendorsAPI.update(v.id, { is_confirmed: !v.is_confirmed })
      setCoupleVendors(prev => prev.map(x => x.id === v.id ? updated : x))
    } catch { toast.error('Failed to update') }
  }

  const handleCvUploadContract = async (v, file) => {
    if (!file) return
    setCvUploadingId(v.id)
    try {
      const { url, filename } = await coupleVendorsAPI.uploadContract(file, wedding.id)
      const updated = await coupleVendorsAPI.update(v.id, { contract_url: url, contract_filename: filename })
      setCoupleVendors(prev => prev.map(x => x.id === v.id ? updated : x))
      toast.success('Contract uploaded!')
    } catch (err) { toast.error(err.message || 'Upload failed') }
    finally { setCvUploadingId(null) }
  }

  const handleCvDelete = async (id) => {
    if (!window.confirm('Remove this vendor from your list?')) return
    try {
      await coupleVendorsAPI.delete(id)
      setCoupleVendors(prev => prev.filter(x => x.id !== id))
      toast.success('Vendor removed')
    } catch { toast.error('Failed to remove vendor') }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return
    setAccountSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      toast.success('Confirmation email sent — check your inbox to verify the new address')
      setNewEmail('')
      setShowAccountModal(false)
    } catch (err) {
      toast.error('Failed to update email: ' + err.message)
    } finally {
      setAccountSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setAccountSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
      setShowAccountModal(false)
    } catch (err) {
      toast.error('Failed to update password: ' + err.message)
    } finally {
      setAccountSaving(false)
    }
  }

  const handleUpdateVenue = async () => {
    if (!wedding || !venueNameEdit.trim()) return
    setAccountSaving(true)
    try {
      await weddingsAPI.update(wedding.id, {
        venue_name: venueNameEdit.trim(),
        venue_address: venueAddressEdit.trim(),
      })
      toast.success('Venue updated!')
      setShowAccountModal(false)
      await loadData()
    } catch (err) {
      toast.error('Failed to update venue: ' + err.message)
    } finally {
      setAccountSaving(false)
    }
  }

  const handleSavePalette = async () => {
    if (!wedding) return
    setPaletteSaving(true)
    try {
      const newTheme = { ...wedding.theme }
      PALETTE_KEYS.forEach((key, i) => { if (paletteColors[i]) newTheme[key] = paletteColors[i] })
      await weddingsAPI.update(wedding.id, { theme: newTheme })
      toast.success('Palette saved!')
      setEditingPalette(false)
      await loadData()
    } catch (err) {
      toast.error('Failed to save palette: ' + err.message)
    } finally {
      setPaletteSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading your wedding...</p>
        </div>
      </div>
    )
  }

  if (!wedding) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center p-6">
        <div className="card-premium p-12 text-center max-w-md">
          <Heart className="w-20 h-20 text-cowc-light-gray mx-auto mb-6" />
          <h2 className="text-3xl font-serif text-cowc-dark mb-4">No Wedding Found</h2>
          <p className="text-cowc-gray mb-8">Please contact your wedding coordinator to get started.</p>
          <button onClick={handleSignOut} className="btn-ghost">Sign Out</button>
        </div>
      </div>
    )
  }

  const days = daysUntil(wedding.wedding_date)
  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const overdueTasks = tasks.filter((t) => !t.completed && isPastDue(t.due_date))

  const gradientBase = theme.gradientBase || theme.primary
  const accent      = primaryAccent(theme.primary)
  const pageBg      = primaryPageBg(theme.primary)
  const heroBg      = primaryGradient(gradientBase)
  const softRing    = primaryAlpha(theme.primary, 0.15)
  const softRingMed = primaryAlpha(theme.primary, 0.30)

  // ── Bottom tab config ────────────────────────────────────────────────────────
  const bottomTabs = [
    { key: 'home',     label: 'Home',     Icon: Home },
    { key: 'timeline', label: 'Timeline', Icon: Calendar },
    { key: 'vendors',  label: 'Vendors',  Icon: Users },
    { key: 'style',    label: 'Style',    Icon: Palette },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ background: pageBg }}>

      {/* ── Hero — couple identity + countdown as the centrepiece ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative text-white overflow-hidden"
        style={{ background: heroBg }}
      >
        {/* Subtle radial glow top-right */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.18) 0%, transparent 60%)' }} />
        {/* Soft glow bottom-left */}
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'white' }} />

        <div className="relative z-10 max-w-lg md:max-w-2xl mx-auto px-5">

          {/* Minimal top bar — icons only, don't compete with the hero */}
          <div className="flex items-center justify-between pt-12 pb-0">
            <div className="flex-shrink-0">
              {!isPreview && <NotificationBell iconColor="white" />}
              {isPreview && (
                <div className="px-2 py-1 rounded-full bg-white/10 text-white/70 text-[10px] font-semibold tracking-wide">
                  Preview
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setNewEmail(user?.email || '')
                  setNewPassword('')
                  setConfirmPassword('')
                  setVenueNameEdit(wedding?.venue_name || '')
                  setVenueAddressEdit(wedding?.venue_address || '')
                  setAccountTab('email')
                  setShowAccountModal(true)
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Account settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={handleSignOut}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Couple name + countdown — the real hero */}
          <div className="text-center pt-5 pb-10">
            <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-2">
              {days < 0 ? 'Married' : days === 0 ? 'Wedding Day' : 'Counting down'}
            </p>

            {days > 0 ? (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 180 }}
              >
                <span className="text-[88px] font-serif font-light leading-none text-white block">{days}</span>
                <span className="text-white/70 text-sm uppercase tracking-widest -mt-2 block">
                  {days === 1 ? 'day' : 'days'} to go
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-serif font-light text-white"
              >
                {days === 0 ? '🎊 Today!' : '🎉'}
              </motion.div>
            )}

            <h1 className="mt-5 text-2xl font-serif font-light tracking-widest text-white">
              {wedding.couple_name}
            </h1>

            <div className="flex items-center justify-center gap-2 mt-2 text-white/55 text-xs">
              <span>{formatDate(wedding.wedding_date, 'MMMM d, yyyy')}</span>
              {wedding.venue_name && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[140px]">{wedding.venue_name}</span>
                </>
              )}
            </div>

            {/* Progress bar — elegant, lives in the hero, part of the story */}
            {totalCount > 0 && (
              <div className="mt-6 mx-auto max-w-[220px]">
                <div className="h-[3px] rounded-full overflow-hidden bg-white/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
                    className="h-full rounded-full bg-white/80"
                  />
                </div>
                <p className="text-white/50 text-xs mt-1.5 tracking-wide">
                  {completedCount} of {totalCount} tasks complete
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div className="max-w-lg md:max-w-2xl mx-auto px-4 -mt-4 relative z-20 space-y-4">

        {/* ── HOME TAB ─────────────────────────────────────── */}
        {activeTab === 'home' && (() => {
          const pendingTasks = tasks.filter(t => !t.completed)
          const allDone = tasks.length > 0 && tasks.every(t => t.completed)
          // Sort: overdue first, then by due date
          const sortedPending = [...pendingTasks].sort((a, b) => {
            const aOver = isPastDue(a.due_date) ? -1 : 0
            const bOver = isPastDue(b.due_date) ? -1 : 0
            if (aOver !== bOver) return aOver - bOver
            if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
            return 0
          })
          const coordinator = wedding.coordinators?.length > 0
            ? (wedding.coordinators.find(c => c.is_lead) || wedding.coordinators[0])
            : null
          const coordName = coordinator ? (coordinator.full_name || coordinator.name || 'Your Coordinator') : null

          return (
            <>
              {/* ── 1. TASKS — the primary action ── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>

                {allDone ? (
                  /* All done — celebration */
                  <div className="bg-white rounded-3xl shadow-sm px-6 py-10 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: softRing }}>
                      <CheckCircle2 className="w-8 h-8" style={{ color: accent }} />
                    </div>
                    <p className="font-serif text-xl text-cowc-dark">All caught up</p>
                    <p className="text-sm text-cowc-gray mt-1">You're ready for the big day 🎉</p>
                  </div>

                ) : sortedPending.length === 0 ? (
                  /* No tasks assigned yet */
                  <div className="bg-white rounded-3xl shadow-sm px-6 py-10 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: accent }} />
                    <p className="text-sm text-cowc-gray">Your tasks will appear here once your coordinator assigns them.</p>
                  </div>

                ) : (() => {
                  /* Featured next task — Option C dark card style */
                  const nextTask = sortedPending[0]
                  const overdue = isPastDue(nextTask.due_date)
                  const remaining = sortedPending.length - 1
                  return (
                    <div>
                      <p className={`text-xs uppercase tracking-widest font-semibold mb-3 ${overdue ? 'text-red-400' : 'text-cowc-gold'}`}
                        style={!overdue ? { color: accent } : {}}>
                        {overdue ? '⚠️ Overdue' : '⚡ What\'s next'}
                      </p>
                      <div
                        className="rounded-3xl p-7 relative overflow-hidden"
                        style={{ backgroundColor: '#2d3748' }}
                      >
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at 90% 10%, ${primaryAlpha(theme.primary, 0.15)} 0%, transparent 60%)` }} />
                        <div className="relative z-10">
                          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                            {overdue ? `Due ${formatDate(nextTask.due_date, 'MMM d')}` : nextTask.due_date ? `Due ${formatDate(nextTask.due_date, 'MMM d')}` : 'No due date'}
                          </p>
                          <h3 className="font-serif text-2xl font-light text-white mb-1 leading-snug">
                            {nextTask.title}
                          </h3>
                          {nextTask.description && (
                            <p className="text-white/50 text-sm mb-5 leading-relaxed line-clamp-2">{nextTask.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/10">
                            <button
                              onClick={() => handleTaskToggle(nextTask)}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                              style={{ backgroundColor: accent }}
                            >
                              Mark complete
                            </button>
                            {remaining > 0 && (
                              <button
                                onClick={() => setActiveTab('timeline')}
                                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/80 text-sm font-semibold hover:bg-white/20 transition"
                              >
                                +{remaining} more task{remaining !== 1 ? 's' : ''}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </motion.div>

              {/* ── 2. QUICK LINKS ── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Timeline',  sub: 'Day-of schedule',  Icon: Calendar,    tab: 'timeline' },
                  { label: 'Vendors',   sub: 'Your vendor team', Icon: Users,       tab: 'vendors' },
                  { label: 'Style',     sub: 'Colours & palette',Icon: Palette,     tab: 'style' },
                  { label: 'Catalogue', sub: 'Reserve items',    Icon: ShoppingBag, path: '/catalogue' },
                ].map(({ label, sub, Icon, tab, path }) => (
                  <button key={label}
                    onClick={() => tab ? setActiveTab(tab) : safeNavigate(path)}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-cowc-gold/20 border border-transparent transition-all active:scale-[0.97] p-5 flex flex-col items-start gap-3">
                    <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ width: 52, height: 52, background: softRing }}>
                      <Icon className="w-6 h-6" style={{ color: accent }} />
                    </div>
                    <div className="text-left">
                      <span className="font-serif text-base text-cowc-dark leading-tight block">{label}</span>
                      <span className="text-xs text-cowc-gray mt-0.5 block">{sub}</span>
                    </div>
                  </button>
                ))}
              </motion.div>

              {/* ── 3. COORDINATOR — contact card ── */}
              {coordinator && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                  className="bg-white rounded-3xl shadow-sm overflow-hidden">
                  {/* Accent top stripe */}
                  <div className="h-1 w-full" style={{ background: heroBg }} />
                  <div className="px-5 pt-5 pb-4">
                    <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray mb-3">Your coordinator</p>
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-white font-serif text-2xl"
                        style={{ background: heroBg }}>
                        {coordName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-lg text-cowc-dark leading-tight">{coordName}</p>
                        <p className="text-xs text-cowc-gray mt-0.5">Lead coordinator</p>
                      </div>
                    </div>
                    {/* Contact buttons */}
                    {(coordinator.email || coordinator.phone) && (
                      <div className="flex gap-2 mt-4">
                        {coordinator.email && (
                          <a href={`mailto:${coordinator.email}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
                            style={{ background: softRing, color: accent }}>
                            <Mail className="w-4 h-4" /> Email
                          </a>
                        )}
                        {coordinator.phone && (
                          <a href={`tel:${coordinator.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
                            style={{ background: softRing, color: accent }}>
                            <Phone className="w-4 h-4" /> Call
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── 4. RENTALS — horizontal scroll, if any ── */}
              {myReservations.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                  className="bg-white rounded-3xl shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-1 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray">Your rentals</p>
                      <p className="font-serif text-cowc-dark text-lg leading-tight mt-0.5">
                        {myReservations.length} item{myReservations.length !== 1 ? 's' : ''} reserved
                      </p>
                    </div>
                    <button onClick={() => safeNavigate('/catalogue')}
                      className="text-xs font-semibold flex items-center gap-0.5" style={{ color: accent }}>
                      Browse <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
                    {myReservations.map(res => {
                      const item = res.inventory_items
                      if (!item) return null
                      const isConfirmed = res.status === 'confirmed'
                      return (
                        <div key={res.id} className="flex-shrink-0 w-28 rounded-2xl overflow-hidden border border-gray-100">
                          <div className="w-full h-24 bg-cowc-cream overflow-hidden">
                            {item.photo_url
                              ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-cowc-light-gray" />
                                </div>}
                          </div>
                          <div className="p-2.5">
                            <p className="text-[11px] font-semibold text-cowc-dark truncate leading-tight">{item.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              <span className={`text-[10px] font-semibold ${isConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isConfirmed ? 'Confirmed' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </>
          )
        })()}

        {/* ── TIMELINE TAB ──────────────────────────────────────────── */}
        {activeTab === 'timeline' && (() => {
          const items = [...(wedding.timeline_items || [])].sort((a, b) => {
            if (a.time && b.time) return a.time.localeCompare(b.time)
            return (a.sort_order ?? 0) - (b.sort_order ?? 0)
          })
          const weddingItems = items.filter(i => i.timeline_type !== 'vendor')
          const vendorItems  = items.filter(i => i.timeline_type === 'vendor')
          const Section = ({ label, list }) => list.length === 0 ? null : (
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray px-1 mb-2">{label}</p>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                {list.map(item => (
                  <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="text-right flex-shrink-0 w-14">
                      <span className="text-sm font-bold text-cowc-dark">{item.time || '—'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cowc-dark">{item.title}</p>
                      {item.description && <p className="text-xs text-cowc-gray mt-0.5">{item.description}</p>}
                      {item.duration_minutes > 0 && (
                        <p className="text-[10px] text-cowc-light-gray mt-1">{item.duration_minutes} min</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
          if (items.length === 0) return (
            <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: accent }} />
              <p className="text-sm text-gray-400">Your day-of timeline will appear here once your coordinator builds it.</p>
            </div>
          )
          return (
            <div className="space-y-4">
              <Section label="Your Day" list={weddingItems} />
              <Section label="Vendor Schedule" list={vendorItems} />
            </div>
          )
        })()}

        {/* ── VENDORS TAB ──────────────────────────────────────────── */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">

            {/* Your Vendor Team (booked by coordinator) */}
            {(() => {
              const filledSlots = VENDOR_SLOTS.filter(slot =>
                wedding.vendors?.find(v => slot.covers.includes(v.category))
              )
              return (
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray px-1 mb-2">Your Vendor Team</p>
                  {filledSlots.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm px-5 py-8 text-center">
                      <p className="text-sm text-gray-400">Your coordinator will add vendors here as they're booked.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                      {filledSlots.map(slot => {
                        const vendor = wedding.vendors.find(v => slot.covers.includes(v.category))
                        const isSuggested = vendor?.submitted_by_couple
                        const SlotIcon = slot.icon
                        return (
                          <div key={slot.category} className="flex items-center gap-3 px-5 py-3.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: isSuggested ? '#fef3c7' : softRing }}>
                              <SlotIcon className="w-4 h-4" style={{ color: isSuggested ? '#d97706' : accent }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray">{slot.label}</p>
                              <p className="text-sm font-semibold truncate leading-tight mt-0.5 text-cowc-dark">{vendor.name}</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                              isSuggested ? 'bg-amber-100 text-amber-700' :
                              vendor.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {isSuggested ? '⏳ Pending' : vendor.status === 'confirmed' ? '✓ Confirmed' : 'Booked'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* Additional vendors (outside standard categories) */}
                  {(() => {
                    const extra = wedding.vendors?.filter(v => !SLOT_CATEGORIES.has(v.category)) || []
                    if (extra.length === 0) return null
                    return (
                      <div className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                        <div className="px-5 py-3 border-b border-gray-50">
                          <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray">Additional Vendors</p>
                        </div>
                        {extra.map(v => (
                          <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: v.submitted_by_couple ? '#fef3c7' : softRing }}>
                              <Sparkles className="w-4 h-4" style={{ color: v.submitted_by_couple ? '#d97706' : accent }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray capitalize">
                                {v.category?.replace('_', ' ')}
                              </p>
                              <p className="text-sm font-semibold truncate text-cowc-dark mt-0.5">{v.name}</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                              v.submitted_by_couple ? 'bg-amber-100 text-amber-700' :
                              v.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {v.submitted_by_couple ? '⏳ Pending' : v.status === 'confirmed' ? '✓ Confirmed' : 'Booked'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )
            })()}

            {/* Suggest a Vendor */}
            <div>
              {!showCustomVendorForm ? (
                <button
                  onClick={() => setShowCustomVendorForm(true)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-dashed transition-all active:scale-95"
                  style={{ borderColor: primaryAlpha(theme.primary, 0.3), color: accent }}
                >
                  + Suggest a Vendor
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-cowc-dark">Suggest a vendor</p>
                    <button onClick={() => setShowCustomVendorForm(false)} className="text-cowc-gray hover:text-cowc-dark p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <select value={customVendorCategory} onChange={e => setCustomVendorCategory(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 mb-2 focus:outline-none text-cowc-dark bg-white">
                    <option value="">Select category…</option>
                    <option value="band">Live Band</option>
                    <option value="planner">Planner</option>
                    <option value="venue">Venue</option>
                    <option value="rentals">Rentals</option>
                    <option value="stationery">Stationery</option>
                    <option value="bar">Bar Service</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" value={customVendorName} onChange={e => setCustomVendorName(e.target.value)}
                    placeholder="Vendor name"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus:outline-none text-cowc-dark bg-white" />
                  <button onClick={handleSuggestCustomVendor}
                    disabled={!customVendorName.trim() || !customVendorCategory || submittingVendor}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: accent }}>
                    {submittingVendor ? 'Sending…' : '→ Send Suggestion'}
                  </button>
                </motion.div>
              )}
            </div>

            {/* ── My Vendors ──────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-base font-semibold text-cowc-dark">My Vendors</h2>
                <button
                  onClick={() => setShowAddCoupleVendor(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
                  style={{ background: primaryAlpha(theme.primary, 0.12), color: accent }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Add form */}
              <AnimatePresence>
                {showAddCoupleVendor && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                      <p className="text-sm font-semibold text-cowc-dark">Add a vendor</p>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cowc-gray" />
                        <input type="text" value={cvSearch} onChange={e => handleCvSearch(e.target.value)}
                          placeholder="Search existing vendors…"
                          className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none text-cowc-dark" />
                        {cvSearching && <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-cowc-gray animate-spin" />}
                      </div>
                      {cvSearchResults.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                          {cvSearchResults.map(r => (
                            <button key={r.id} onClick={() => handleCvSelectExisting(r)}
                              className="w-full text-left px-3 py-2.5 hover:bg-cowc-cream transition-colors">
                              <p className="text-sm font-semibold text-cowc-dark">{r.name}</p>
                              <p className="text-xs text-cowc-gray capitalize">{r.category?.replace('_', ' ')}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <p className="text-xs text-cowc-gray font-medium">Or add manually:</p>
                        <input type="text" value={cvForm.name}
                          onChange={e => setCvForm(f => ({ ...f, name: e.target.value, vendor_id: null }))}
                          placeholder="Vendor name *"
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none text-cowc-dark" />
                        <select value={cvForm.category} onChange={e => setCvForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none text-cowc-dark bg-white">
                          <option value="">Category *</option>
                          <option value="photographer">Photographer</option>
                          <option value="videographer">Videographer</option>
                          <option value="florist">Florist</option>
                          <option value="dj">DJ</option>
                          <option value="band">Live Band</option>
                          <option value="caterer">Catering</option>
                          <option value="baker">Wedding Cake</option>
                          <option value="hair_makeup">Hair & Makeup</option>
                          <option value="officiant">Officiant</option>
                          <option value="venue">Venue</option>
                          <option value="transportation">Transportation</option>
                          <option value="planner">Planner</option>
                          <option value="rentals">Rentals</option>
                          <option value="stationery">Stationery</option>
                          <option value="bar">Bar Service</option>
                          <option value="other">Other</option>
                        </select>
                        <input type="tel" value={cvForm.phone} onChange={e => setCvForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="Phone" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none text-cowc-dark" />
                        <input type="email" value={cvForm.email} onChange={e => setCvForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="Email" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none text-cowc-dark" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleCvSave}
                          disabled={!cvForm.name.trim() || !cvForm.category || cvSaving}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: accent }}>
                          {cvSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Vendor'}
                        </button>
                        <button
                          onClick={() => { setShowAddCoupleVendor(false); setCvForm({ name: '', category: '', phone: '', email: '', notes: '', vendor_id: null }); setCvSearch(''); setCvSearchResults([]) }}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-cowc-dark hover:bg-gray-200 transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vendor list */}
              {coupleVendors.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {coupleVendors.map(v => (
                    <div key={v.id}>
                      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                        onClick={() => setCvExpandedId(id => id === v.id ? null : v.id)}>
                        <button
                          onClick={e => { e.stopPropagation(); handleCvToggleConfirmed(v) }}
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                          style={{ background: v.is_confirmed ? accent : '#f3f4f6' }}
                          title={v.is_confirmed ? 'Confirmed' : 'Mark as confirmed'}>
                          <Check className="w-3.5 h-3.5" style={{ color: v.is_confirmed ? '#fff' : '#9ca3af' }} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-cowc-dark truncate">{v.name}</p>
                          <p className="text-xs text-cowc-gray capitalize">{v.category?.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {v.contract_url && (
                            <a href={v.contract_url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                              title="View contract">
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${v.is_confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {v.is_confirmed ? '✓ Confirmed' : 'Pending'}
                          </span>
                          {cvExpandedId === v.id
                            ? <ChevronUp className="w-3.5 h-3.5 text-cowc-gray" />
                            : <ChevronDown className="w-3.5 h-3.5 text-cowc-gray" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {cvExpandedId === v.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 bg-gray-50/60 border-t border-gray-100">
                              {(v.phone || v.email) && (
                                <div className="pt-3 space-y-1">
                                  {v.phone && (
                                    <a href={`tel:${v.phone}`} className="flex items-center gap-2 text-sm text-cowc-dark hover:underline">
                                      <Phone className="w-3.5 h-3.5 text-cowc-gray" /> {v.phone}
                                    </a>
                                  )}
                                  {v.email && (
                                    <a href={`mailto:${v.email}`} className="flex items-center gap-2 text-sm text-cowc-dark hover:underline">
                                      <Mail className="w-3.5 h-3.5 text-cowc-gray" /> {v.email}
                                    </a>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <label className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all ${cvUploadingId === v.id ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}
                                  style={{ background: primaryAlpha(theme.primary, 0.12), color: accent }}>
                                  {cvUploadingId === v.id
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                                    : <><Upload className="w-3.5 h-3.5" /> {v.contract_url ? 'Replace Contract' : 'Upload Contract'}</>
                                  }
                                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" className="hidden"
                                    onChange={e => handleCvUploadContract(v, e.target.files?.[0])} />
                                </label>
                                {v.contract_url && (
                                  <a href={v.contract_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-blue-500 underline truncate max-w-[120px]">
                                    {v.contract_filename || 'View contract'}
                                  </a>
                                )}
                              </div>
                              <button onClick={() => handleCvDelete(v.id)}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Remove vendor
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-cowc-gray text-center py-6 bg-white rounded-2xl shadow-sm">
                  No vendors added yet — tap Add to get started.
                </p>
              )}
            </div>

          </div>
        )}

        {/* ── STYLE TAB ──────────────────────────────────────────── */}
        {activeTab === 'style' && (() => {
          const t = wedding?.theme
          if (!t) return (
            <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center">
              <Palette className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: accent }} />
              <p className="text-sm text-gray-400">Your style details will appear here once your coordinator sets them up.</p>
            </div>
          )
          const allColors = [t.primary, t.secondary, t.accent, t.color4, t.color5, ...(t.extraColors || [])].filter(Boolean)
          return (
            <div className="space-y-4">

              {/* Palette */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" style={{ color: accent }} />
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray">Your Palette</p>
                      {t.vibe && <p className="text-sm font-semibold text-cowc-dark leading-tight">{t.vibe}</p>}
                    </div>
                  </div>
                  {!editingPalette && (
                    <button
                      onClick={() => {
                        setPaletteColors(PALETTE_KEYS.map(k => t[k] || ''))
                        setEditingPalette(true)
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                      style={{ background: softRing, color: accent }}
                    >
                      Edit Palette
                    </button>
                  )}
                </div>

                {editingPalette ? (
                  <div className="px-5 pb-5 space-y-4">
                    <div className="flex gap-3 flex-wrap">
                      {PALETTE_KEYS.map((key, i) => {
                        if (!t[key] && !paletteColors[i]) return null
                        return (
                          <div key={key} className="flex flex-col items-center gap-1.5">
                            <div className="relative">
                              <input
                                type="color"
                                value={paletteColors[i] || t[key] || '#ffffff'}
                                onChange={e => setPaletteColors(prev => {
                                  const next = [...prev]
                                  next[i] = e.target.value
                                  return next
                                })}
                                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200 p-0.5"
                                style={{ background: paletteColors[i] || t[key] }}
                              />
                            </div>
                            <span className="text-[10px] text-cowc-gray font-medium">{PALETTE_LABELS[i]}</span>
                            <span className="text-[9px] text-cowc-light-gray font-mono">{paletteColors[i] || t[key] || ''}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Preview strip */}
                    <div className="flex h-8 rounded-lg overflow-hidden">
                      {PALETTE_KEYS.map((key, i) => {
                        const color = paletteColors[i] || t[key]
                        if (!color) return null
                        return <div key={key} className="flex-1" style={{ background: color }} />
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePalette}
                        disabled={paletteSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: accent }}
                      >
                        {paletteSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {paletteSaving ? 'Saving…' : 'Save Palette'}
                      </button>
                      <button
                        onClick={() => setEditingPalette(false)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-cowc-dark hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-14">
                    {allColors.map((hex, i) => (
                      <div key={i} className="flex-1" style={{ background: hex }} title={hex} />
                    ))}
                  </div>
                )}
              </div>

              {/* Inspiration photos */}
              {t.inspiration_photos?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray px-1 mb-2">Inspiration</p>
                  <div className="grid grid-cols-3 gap-2">
                    {t.inspiration_photos.slice(0, 9).map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden">
                        <img src={photo} alt={`Inspiration ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pinterest / Vision boards */}
              {t.pinterest_boards?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#E60023">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                    </svg>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray">Vision Boards</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {t.pinterest_boards.map(board => (
                      <a key={board.id} href={board.url} target="_blank" rel="noopener noreferrer"
                        className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all active:scale-95 block">
                        <div className="aspect-square relative overflow-hidden">
                          {board.cover_url ? (
                            <img src={board.cover_url} alt={board.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: softRing }}>
                              <svg viewBox="0 0 24 24" className="w-10 h-10 opacity-40" fill="#E60023">
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/90 rounded-full p-2.5">
                              <ExternalLink className="w-4 h-4 text-cowc-dark" />
                            </div>
                          </div>
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="text-xs font-semibold text-cowc-dark truncate leading-tight">{board.name}</p>
                          <p className="text-[10px] text-cowc-gray mt-0.5">View on Pinterest</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        })()}

      </div>

      {/* ── Bottom Tab Bar ────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto flex items-stretch">
          {bottomTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
              style={{ color: activeTab === key ? accent : '#9ca3af' }}
            >
              {activeTab === key && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: accent }} />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </button>
          ))}
          <button
            onClick={() => safeNavigate('/catalogue')}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            style={{ color: '#9ca3af' }}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-wide">Catalogue</span>
          </button>
        </div>
      </div>

      {/* ── Account Settings Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAccountModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowAccountModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: softRing }}>
                    <Settings className="w-4 h-4" style={{ color: accent }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-cowc-dark">Account Settings</h2>
                    <p className="text-xs text-cowc-gray">{user?.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowAccountModal(false)}
                  className="p-2 rounded-full hover:bg-cowc-cream transition-colors">
                  <X className="w-4 h-4 text-cowc-gray" />
                </button>
              </div>

              <div className="flex border-b border-gray-100">
                {[
                  { key: 'email', label: 'Change Email' },
                  { key: 'password', label: 'Change Password' },
                  { key: 'venue', label: 'Venue' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAccountTab(tab.key)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                      accountTab === tab.key ? 'border-b-2 text-cowc-dark' : 'text-cowc-gray hover:text-cowc-dark'
                    }`}
                    style={accountTab === tab.key ? { borderColor: accent, color: accent } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {accountTab === 'email' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                      After saving, we'll send a confirmation to your new email. You must click that link to complete the change.
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">New Email Address</label>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                        placeholder="new@email.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-cowc-dark"
                        autoFocus />
                    </div>
                    <button onClick={handleUpdateEmail}
                      disabled={accountSaving || !newEmail.trim() || newEmail === user?.email}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: accent }}>
                      {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Send Confirmation Email
                    </button>
                  </div>
                )}

                {accountTab === 'password' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none pr-11 text-cowc-dark"
                          autoFocus />
                        <button type="button" onClick={() => setShowNewPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-cowc-gray hover:text-cowc-dark">
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">Confirm Password</label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none text-cowc-dark ${
                          confirmPassword && newPassword !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`} />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                      )}
                    </div>
                    <button onClick={handleUpdatePassword}
                      disabled={accountSaving || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: accent }}>
                      {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Update Password
                    </button>
                  </div>
                )}

                {accountTab === 'venue' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">Venue Name</label>
                      <input type="text" value={venueNameEdit} onChange={e => setVenueNameEdit(e.target.value)}
                        placeholder="e.g. The Grand Ballroom"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-cowc-dark"
                        autoFocus />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">Address</label>
                      <input type="text" value={venueAddressEdit} onChange={e => setVenueAddressEdit(e.target.value)}
                        placeholder="123 Main St, City, State"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-cowc-dark" />
                    </div>
                    <button onClick={handleUpdateVenue}
                      disabled={accountSaving || !venueNameEdit.trim()}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: accent }}>
                      {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Save Venue
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
