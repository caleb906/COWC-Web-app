import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Calendar, MapPin, CheckCircle2, Circle, Info, List, LogOut, ChevronRight, ExternalLink, X, Users, ShoppingBag, Palette, Package, Camera, Video, Flower2, Music2, UtensilsCrossed, Cake, Sparkles, BookOpen, Building2, Car } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI, tasksAPI, vendorsAPI, logChangeAndNotify } from '../services/unifiedAPI'
import { useWeddingTheme } from '../contexts/WeddingThemeContext'
import { formatDate, daysUntil, isPastDue } from '../utils/dates'
import { primaryGradient, primaryAccent, primaryAlpha, primaryPageBg } from '../utils/colorUtils'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useToast } from './Toast'

// Standard vendor slots always shown on the couple dashboard
// `covers` = which category values count as filling this slot
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
// All category values that are accounted for by a slot (won't appear in "Additional Vendors")
const SLOT_CATEGORIES = new Set(VENDOR_SLOTS.flatMap(s => s.covers))

export default function CoupleDashboard({ previewWeddingId, isPreview, onPreviewNavigate } = {}) {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()
  const { theme, setWeddingTheme } = useWeddingTheme()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [wedding, setWedding] = useState(null)
  const [tasks, setTasks] = useState([])
  const [myReservations, setMyReservations] = useState([])

  // Vendor suggestion state
  const [suggestingSlot, setSuggestingSlot] = useState(null)
  const [suggestName, setSuggestName] = useState('')
  const [suggestNotes, setSuggestNotes] = useState('')
  const [submittingVendor, setSubmittingVendor] = useState(false)
  const [showCustomVendorForm, setShowCustomVendorForm] = useState(false)
  const [customVendorName, setCustomVendorName] = useState('')
  const [customVendorCategory, setCustomVendorCategory] = useState('')

  useEffect(() => {
    loadData()
  }, [user, previewWeddingId])

  const loadData = async () => {
    if (!user) return

    try {
      let weddingData
      if (previewWeddingId) {
        // Dev preview mode: load a specific wedding by ID (admin only)
        weddingData = await weddingsAPI.getById(previewWeddingId)
      } else {
        const weddingsData = await weddingsAPI.getForCouple(user.id)
        if (weddingsData.length === 0) { setLoading(false); return }
        weddingData = await weddingsAPI.getById(weddingsData[0].id)
      }

      setWedding(weddingData)
      // In preview mode this runs in a new tab (isolated context), so setWeddingTheme
      // is safe. In normal mode it's also fine — just skip if no theme data.
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
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // In preview mode, delegate navigation to parent overlay; otherwise use router
  const safeNavigate = (path) => {
    if (isPreview) {
      if (onPreviewNavigate) onPreviewNavigate(path)
      return
    }
    navigate(path)
  }

  const handleTaskToggle = async (task) => {
    if (!user || !wedding) return
    if (isPreview) return // Read-only in preview mode

    try {
      const newCompleted = !task.completed

      if (newCompleted) {
        await tasksAPI.complete(task.id)

        // Log change and notify
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

  const handleSuggestVendor = async (category, label) => {
    if (!wedding || !suggestName.trim()) return
    setSubmittingVendor(true)
    try {
      await vendorsAPI.create({
        wedding_id: wedding.id,
        name: suggestName.trim(),
        category,
        notes: suggestNotes.trim(),
        status: 'pending',
        submitted_by_couple: true,
      })
      await logChangeAndNotify({
        wedding_id: wedding.id,
        changed_by_user_id: user.id,
        change_type: 'vendor_suggested',
        entity_type: 'vendor',
        entity_id: wedding.id,
        description: `Suggested ${label}: ${suggestName.trim()}`,
      })
      toast.success(`${label} suggestion sent to your coordinator!`)
      setSuggestingSlot(null)
      setSuggestName('')
      setSuggestNotes('')
      await loadData()
    } catch {
      toast.error('Failed to send suggestion. Please try again.')
    } finally {
      setSubmittingVendor(false)
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
          <h2 className="text-3xl font-serif text-cowc-dark mb-4">
            No Wedding Found
          </h2>
          <p className="text-cowc-gray mb-8">
            Please contact your wedding coordinator to get started.
          </p>
          <button onClick={handleSignOut} className="btn-ghost">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const days = daysUntil(wedding.wedding_date)
  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const incompleteTasks = tasks.filter((t) => !t.completed)
  const overdueTasks = incompleteTasks.filter((t) => isPastDue(t.due_date))

  const gradientBase = theme.gradientBase || theme.primary
  const accent      = primaryAccent(theme.primary)
  const pageBg      = primaryPageBg(theme.primary)
  const heroBg      = primaryGradient(gradientBase)
  const softRing    = primaryAlpha(theme.primary, 0.15)
  const softRingMed = primaryAlpha(theme.primary, 0.30)

  return (
    <div className="min-h-screen pb-28" style={{ background: pageBg }}>
      {/* ── Hero Header ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative text-white overflow-hidden"
        style={{ background: heroBg }}
      >
        {/* Soft glow orbs behind content */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'white' }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'white' }} />

        <div className="relative z-10 max-w-lg mx-auto px-6 pt-10 pb-10">
          {/* Minimal top nav */}
          <div className="flex items-center justify-between mb-10">
            <p className="text-white/45 text-xs uppercase tracking-[0.18em] font-medium">
              Welcome back, {user?.full_name?.split(' ')[0]}
            </p>
            <div className="flex items-center gap-2">
              {!isPreview && <NotificationBell iconColor="white" />}
              {isPreview ? (
                <div className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-semibold tracking-wide">
                  Preview
                </div>
              ) : (
                <button onClick={handleSignOut}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Hero: Couple name as centrepiece */}
          <div className="text-center mb-10">
            <p className="text-white/40 text-[10px] uppercase tracking-[0.25em] mb-5">Your Wedding</p>
            <h1 className="text-4xl sm:text-5xl font-serif font-light tracking-wide leading-tight">
              {wedding.couple_name}
            </h1>
            {/* Ornamental divider */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="h-px w-10 bg-white/25" />
              <Heart className="w-2.5 h-2.5 text-white/40 fill-current" />
              <div className="h-px w-10 bg-white/25" />
            </div>
          </div>

          {/* Countdown — open editorial typography, no box */}
          <div className="text-center mb-8">
            <div className="text-[6rem] leading-none font-serif font-extralight tracking-tight">
              {days < 0 ? '🎉' : days === 0 ? '🎊' : days}
            </div>
            <div className="text-white/65 text-base font-light mt-3 tracking-wide">
              {days < 0 ? 'Congratulations!'
                : days === 0 ? "It's your wedding day!"
                : `day${days !== 1 ? 's' : ''} until your wedding`}
            </div>
            {/* Elegant date & venue metadata */}
            <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 mt-5 text-white/45 text-[11px] uppercase tracking-[0.15em]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(wedding.wedding_date, 'MMM d, yyyy')}</span>
              </div>
              {wedding.venue_name && (
                <>
                  <span className="text-white/25">·</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span>{wedding.venue_name}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Task progress strip */}
          {totalCount > 0 && (
            <div className="flex items-center gap-4 rounded-xl px-5 py-3.5 border border-white/15"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
              <CheckCircle2 className="w-5 h-5 text-white/60 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-white/60 mb-1.5">
                  <span>Tasks complete</span>
                  <span>{completedCount} / {totalCount}</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 0.4, duration: 0.7 }}
                    className="h-full rounded-full bg-white"
                  />
                </div>
              </div>
              <span className="text-white font-semibold text-sm min-w-[36px] text-right">{progress}%</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Quick nav */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-4 gap-3"
        >
          {[
            { icon: Info,        label: 'Overview',  action: () => safeNavigate(`/wedding/${wedding.id}`) },
            { icon: Calendar,    label: 'Timeline',  action: () => safeNavigate(`/wedding/${wedding.id}?tab=timeline`) },
            { icon: List,        label: 'Vendors',   action: () => safeNavigate(`/wedding/${wedding.id}?tab=vendors`) },
            { icon: ShoppingBag, label: 'Catalogue', action: () => safeNavigate('/catalogue') },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label}
              onClick={action}
              className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2.5 shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: softRing }}>
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <span className="text-xs font-semibold text-cowc-dark">{label}</span>
            </button>
          ))}
        </motion.div>

        {/* Coordinator card */}
        {wedding.coordinators?.length > 0 && (() => {
          const lead = wedding.coordinators.find(c => c.is_lead) || wedding.coordinators[0]
          const name = lead.full_name || lead.name || 'Your Coordinator'
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray mb-3">
                Your Coordinator
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg font-serif"
                  style={{ background: heroBg }}>
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cowc-dark">{name}</p>
                  {lead.email && <p className="text-sm text-cowc-gray truncate">{lead.email}</p>}
                  {lead.phone && <p className="text-sm text-cowc-gray">{lead.phone}</p>}
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: softRing, color: accent }}>
                  Lead
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* Your Color Palette */}
        {(() => {
          const t = wedding?.theme
          if (!t) return null
          const allColors = [
            t.primary, t.secondary, t.accent, t.color4, t.color5,
            ...(t.extraColors || []),
          ].filter(Boolean)
          if (allColors.length === 0) return null
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.27 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" style={{ color: accent }} />
                  <div>
                    <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray">Your Palette</p>
                    {t.vibe && <p className="text-sm font-semibold text-cowc-dark leading-tight">{t.vibe}</p>}
                  </div>
                </div>
                <button
                  onClick={() => safeNavigate(`/wedding/${wedding.id}?tab=style`)}
                  className="text-xs font-semibold flex items-center gap-0.5"
                  style={{ color: accent }}
                >
                  View <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Full-width colour strip */}
              <div className="flex h-12">
                {allColors.map((hex, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ background: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </motion.div>
          )
        })()}

        {/* ── Your Rentals ──────────────────────────────────── */}
        {myReservations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: accent }} />
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray">Your Rentals</p>
                  <p className="text-sm font-semibold text-cowc-dark leading-tight">
                    {myReservations.length} item{myReservations.length !== 1 ? 's' : ''} reserved
                  </p>
                </div>
              </div>
              <button
                onClick={() => safeNavigate('/catalogue')}
                className="text-xs font-semibold flex items-center gap-0.5"
                style={{ color: accent }}
              >
                Browse all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal scroll strip */}
            <div className="flex gap-3 overflow-x-auto px-5 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {myReservations.map(res => {
                const item = res.inventory_items
                if (!item) return null
                const statusColor = {
                  confirmed: { dot: 'bg-emerald-400', label: 'text-emerald-600', text: 'Confirmed' },
                  requested: { dot: 'bg-amber-400',   label: 'text-amber-600',   text: 'Pending' },
                }[res.status] || { dot: 'bg-gray-300', label: 'text-gray-500', text: res.status }

                return (
                  <div
                    key={res.id}
                    className="flex-shrink-0 w-28 rounded-xl overflow-hidden border border-gray-100"
                  >
                    {/* Photo */}
                    <div className="w-full h-24 overflow-hidden bg-cowc-cream">
                      {item.photo_url
                        ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-cowc-light-gray" />
                          </div>
                      }
                    </div>
                    {/* Info */}
                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-cowc-dark truncate leading-tight">{item.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor.dot}`} />
                        <span className={`text-[10px] font-semibold ${statusColor.label}`}>{statusColor.text}</span>
                      </div>
                      {res.quantity > 1 && (
                        <p className="text-[10px] text-cowc-gray mt-0.5">Qty: {res.quantity}</p>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Browse more CTA chip */}
              <button
                onClick={() => safeNavigate('/catalogue')}
                className="flex-shrink-0 w-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 h-[116px]"
                style={{ borderColor: primaryAlpha(theme.primary, 0.3) }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: softRing }}>
                  <ShoppingBag className="w-4 h-4" style={{ color: accent }} />
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight px-1"
                  style={{ color: accent }}>
                  Browse more
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── No rentals yet — browse prompt ─────────────────── */}
        {myReservations.length === 0 && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => safeNavigate('/catalogue')}
            className="w-full bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 text-left hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: softRing }}>
              <ShoppingBag className="w-6 h-6" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-cowc-dark">Browse the Catalogue</p>
              <p className="text-xs text-cowc-gray mt-0.5">Reserve décor, linens, lighting &amp; more for your day</p>
            </div>
            <ChevronRight className="w-5 h-5 text-cowc-light-gray flex-shrink-0" />
          </motion.button>
        )}

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-sm font-bold">{overdueTasks.length}</span>
            </div>
            <p className="text-sm text-red-700 font-semibold">
              {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} — tap below to check them off
            </p>
          </motion.div>
        )}

        {/* Pending tasks */}
        {tasks.filter(t => !t.completed).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-base font-semibold text-cowc-dark">Upcoming Tasks</h2>
              {totalCount > 5 && (
                <button onClick={() => safeNavigate(`/wedding/${wedding.id}?tab=tasks`)}
                  className="text-xs flex items-center gap-0.5 font-semibold" style={{ color: accent }}>
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {tasks.filter(t => !t.completed).slice(0, 5).map(task => {
                const overdue = isPastDue(task.due_date)
                return (
                  <button key={task.id} onClick={() => handleTaskToggle(task)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left active:scale-[0.98]">
                    <Circle className="w-5 h-5 flex-shrink-0" style={{ color: softRingMed }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cowc-dark truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-semibold' : 'text-cowc-gray'}`}>
                          Due {formatDate(task.due_date, 'MMM d')}{overdue ? ' · Overdue' : ''}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* All done state */}
        {tasks.length > 0 && tasks.every(t => t.completed) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="bg-white rounded-2xl p-8 text-center shadow-sm"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: softRing }}>
              <CheckCircle2 className="w-7 h-7" style={{ color: accent }} />
            </div>
            <p className="font-serif text-cowc-dark text-lg">All tasks complete!</p>
            <p className="text-sm text-cowc-gray mt-1">You're all set for the big day 🎉</p>
          </motion.div>
        )}

        {/* ── Your Vendor Team ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: accent }} />
              <h2 className="text-base font-semibold text-cowc-dark">Your Vendor Team</h2>
            </div>
            {(() => {
              const filled = VENDOR_SLOTS.filter(s => wedding.vendors?.some(v => s.covers.includes(v.category))).length
              return (
                <span className="text-xs font-medium text-cowc-gray">
                  {filled}/{VENDOR_SLOTS.length} filled
                </span>
              )
            })()}
          </div>

          {/* Standard 10 slots */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            {VENDOR_SLOTS.map(slot => {
              const vendor = wedding.vendors?.find(v => slot.covers.includes(v.category))
              const isSuggested = vendor?.submitted_by_couple
              const isThisOpen = suggestingSlot === slot.category

              return (
                <div key={slot.category}>
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    {/* Vendor icon */}
                    {(() => {
                      const SlotIcon = slot.icon
                      const filled = vendor && !isSuggested
                      return (
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: filled ? softRing : '#f3f4f6' }}
                        >
                          <SlotIcon
                            className="w-4 h-4"
                            style={{ color: filled ? accent : '#a0aec0' }}
                          />
                        </div>
                      )
                    })()}

                    {/* Label + name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray">{slot.label}</p>
                      <p className={`text-sm font-semibold truncate leading-tight mt-0.5 ${vendor ? 'text-cowc-dark' : 'text-gray-300'}`}>
                        {vendor ? vendor.name : '—'}
                      </p>
                    </div>

                    {/* Status pill or Suggest button */}
                    {vendor ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                        isSuggested
                          ? 'bg-amber-100 text-amber-700'
                          : vendor.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isSuggested ? '⏳ Pending' : vendor.status === 'confirmed' ? '✓ Confirmed' : 'Booked'}
                      </span>
                    ) : (
                      !isPreview && (
                        <button
                          onClick={() => {
                            setSuggestingSlot(isThisOpen ? null : slot.category)
                            setSuggestName('')
                            setSuggestNotes('')
                          }}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 transition-all active:scale-95"
                          style={{ background: softRing, color: accent }}
                        >
                          {isThisOpen ? '✕' : '+ Suggest'}
                        </button>
                      )
                    )}
                  </div>

                  {/* Inline suggest form */}
                  <AnimatePresence>
                    {isThisOpen && (
                      <motion.div
                        key="suggest-form"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs font-semibold text-cowc-gray mb-2">
                            Who is your {slot.label.toLowerCase()}?
                          </p>
                          <input
                            type="text"
                            value={suggestName}
                            onChange={e => setSuggestName(e.target.value)}
                            placeholder={`${slot.label} name`}
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 mb-2 focus:outline-none bg-white text-cowc-dark placeholder-gray-400"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={suggestNotes}
                            onChange={e => setSuggestNotes(e.target.value)}
                            placeholder="Website or contact info (optional)"
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus:outline-none bg-white text-cowc-dark placeholder-gray-400"
                          />
                          <button
                            onClick={() => handleSuggestVendor(slot.category, slot.label)}
                            disabled={!suggestName.trim() || submittingVendor}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                            style={{ background: accent }}
                          >
                            {submittingVendor ? 'Sending…' : '→ Send Suggestion'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Additional vendors (outside the standard 10 categories) */}
          {(() => {
            const extra = wedding.vendors?.filter(v => !SLOT_CATEGORIES.has(v.category)) || []
            if (extra.length === 0) return null
            return (
              <div className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                <div className="px-5 py-3 border-b border-gray-50">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray">Additional Vendors</p>
                </div>
                {extra.map(vendor => (
                  <div key={vendor.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: vendor.submitted_by_couple ? '#fef3c7' : softRing }}>
                      <Sparkles className="w-4 h-4" style={{ color: vendor.submitted_by_couple ? '#d97706' : accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-cowc-gray capitalize">
                        {vendor.category?.replace('_', ' ')}
                      </p>
                      <p className="text-sm font-semibold truncate text-cowc-dark mt-0.5">{vendor.name}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      vendor.submitted_by_couple
                        ? 'bg-amber-100 text-amber-700'
                        : vendor.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {vendor.submitted_by_couple ? '⏳ Pending' : vendor.status === 'confirmed' ? '✓ Confirmed' : 'Booked'}
                    </span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Suggest another vendor (custom category) */}
          {!isPreview && (
            <div className="mt-3">
              {!showCustomVendorForm ? (
                <button
                  onClick={() => setShowCustomVendorForm(true)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-dashed transition-all active:scale-95"
                  style={{ borderColor: primaryAlpha(theme.primary, 0.3), color: accent }}
                >
                  + Suggest Another Vendor
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-cowc-dark">Suggest a vendor</p>
                    <button
                      onClick={() => setShowCustomVendorForm(false)}
                      className="text-cowc-gray hover:text-cowc-dark p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <select
                    value={customVendorCategory}
                    onChange={e => setCustomVendorCategory(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 mb-2 focus:outline-none text-cowc-dark bg-white"
                  >
                    <option value="">Select category…</option>
                    <option value="band">Live Band</option>
                    <option value="planner">Planner</option>
                    <option value="venue">Venue</option>
                    <option value="rentals">Rentals</option>
                    <option value="stationery">Stationery</option>
                    <option value="bar">Bar Service</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    value={customVendorName}
                    onChange={e => setCustomVendorName(e.target.value)}
                    placeholder="Vendor name"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus:outline-none text-cowc-dark bg-white"
                  />
                  <button
                    onClick={handleSuggestCustomVendor}
                    disabled={!customVendorName.trim() || !customVendorCategory || submittingVendor}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: accent }}
                  >
                    {submittingVendor ? 'Sending…' : '→ Send Suggestion'}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Inspiration photos */}
        {wedding.theme?.inspiration_photos?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <h2 className="text-base font-semibold text-cowc-dark mb-2 px-1">Your Inspiration</h2>
            <div className="grid grid-cols-3 gap-2">
              {wedding.theme.inspiration_photos.slice(0, 6).map((photo, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden">
                  <img src={photo} alt={`Inspiration ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pinterest Boards */}
        {wedding.theme?.pinterest_boards?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              {/* Pinterest P logo */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#E60023">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
              </svg>
              <h2 className="text-base font-semibold text-cowc-dark">Vision Boards</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {wedding.theme.pinterest_boards.map((board) => (
                <a
                  key={board.id}
                  href={board.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all active:scale-95 block"
                >
                  {/* Cover image or placeholder */}
                  <div className="aspect-square relative overflow-hidden">
                    {board.cover_url ? (
                      <img
                        src={board.cover_url}
                        alt={board.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: softRing }}>
                        <svg viewBox="0 0 24 24" className="w-10 h-10 opacity-40" fill="#E60023">
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                        </svg>
                      </div>
                    )}

                    {/* Hover overlay with external link hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/90 rounded-full p-2.5">
                        <ExternalLink className="w-4 h-4 text-cowc-dark" />
                      </div>
                    </div>
                  </div>

                  {/* Board name bar */}
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold text-cowc-dark truncate leading-tight">
                      {board.name}
                    </p>
                    <p className="text-[10px] text-cowc-gray mt-0.5">View on Pinterest</p>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Full details CTA */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
          onClick={() => safeNavigate(`/wedding/${wedding.id}`)}
          className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg active:scale-[0.98] transition-all"
          style={{ background: heroBg }}
        >
          View Full Wedding Details
        </motion.button>

      </div>
    </div>
  )
}
