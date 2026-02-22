import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Users, Heart, Plus, TrendingUp,
  LogOut, Settings, Grid, List, Search, X,
  UserPlus, ClipboardList, ChevronDown, Archive,
  RotateCcw, CheckCircle, ShoppingBag, Package, StickyNote, Building2,
} from 'lucide-react'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI, vendorsAPI } from '../services/unifiedAPI'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { formatDate, daysUntil } from '../utils/dates'
import NotificationBell from './NotificationBell'
import { useToast } from './Toast'

// ─── Pipeline config ───────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { value: 'all',       label: 'All',        color: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400' },
  { value: 'Planning',  label: 'Planning',   color: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500' },
  { value: 'Signed',    label: 'Signed',     color: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
  { value: 'In Talks',  label: 'In Talks',   color: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-500' },
  { value: 'Inquiry',   label: 'Inquiry',    color: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400' },
  { value: 'Completed', label: 'Completed',  color: 'bg-green-100 text-green-700',    dot: 'bg-green-600' },
  { value: 'Cancelled', label: 'Cancelled',  color: 'bg-red-100 text-red-600',        dot: 'bg-red-500' },
]

// Display order index for sorting (lower = shown first)
const STAGE_ORDER = { Planning: 0, Signed: 1, 'In Talks': 2, Inquiry: 3, Completed: 4, Cancelled: 5 }

const stageFor = (status) =>
  PIPELINE_STAGES.find((s) => s.value === status) || PIPELINE_STAGES[0]

// ─── Package type config ────────────────────────────────────────────────────
const PACKAGES = [
  { value: 'FP',  short: 'FP',  label: 'Full Planning',        color: 'bg-amber-100 text-amber-800',   border: 'border-amber-300' },
  { value: 'PP',  short: 'PP',  label: 'Partial Planning',     color: 'bg-purple-100 text-purple-800', border: 'border-purple-300' },
  { value: 'DOC', short: 'DOC', label: 'Day of Coordination',  color: 'bg-sky-100 text-sky-800',       border: 'border-sky-300' },
]

function PackageBadge({ packageType }) {
  if (!packageType) return null
  const pkg = PACKAGES.find(p => p.value === packageType)
  if (!pkg) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${pkg.color} ${pkg.border}`}>
      {pkg.label}
    </span>
  )
}

// ─── Status pill with inline dropdown ──────────────────────────────────────
function StatusPill({ wedding, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const stage = stageFor(wedding.status)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handlePick = (e, newStatus) => {
    e.stopPropagation()
    setOpen(false)
    if (newStatus !== wedding.status) onStatusChange(wedding.id, newStatus)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 ${stage.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
        {wedding.status}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-8 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            {PIPELINE_STAGES.filter(s => s.value !== 'all').map((s) => (
              <button
                key={s.value}
                onClick={(e) => handlePick(e, s.value)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                  s.value === wedding.status ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                {s.label}
                {s.value === wedding.status && <CheckCircle className="w-3 h-3 ml-auto text-cowc-gold" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Shared card sub-components ─────────────────────────────────────────────
function WeddingGridCard({ wedding, i, navigate, handleStatusChange }) {
  const days = daysUntil(wedding.wedding_date)
  const progress = wedding.totalTasks > 0
    ? (wedding.tasksCompleted / wedding.totalTasks) * 100 : 0

  return (
    <motion.div
      key={wedding.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.05 }}
      onClick={() => navigate(`/wedding/${wedding.id}`)}
      className="card-premium p-6 cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: wedding.theme.primary }} />

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-xl font-serif text-cowc-dark group-hover:text-cowc-gold transition-colors truncate">
            {wedding.couple_name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-cowc-light-gray">{wedding.theme.vibe}</p>
            <PackageBadge packageType={wedding.package_type} />
          </div>
        </div>
        <StatusPill wedding={wedding} onStatusChange={handleStatusChange} />
      </div>

      <div className="space-y-2 mb-4 text-sm text-cowc-gray">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cowc-gold flex-shrink-0" />
          {formatDate(wedding.wedding_date, 'MMM d, yyyy')}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cowc-gold flex-shrink-0" />
          <span className="truncate">
            {wedding.coordinatorNames?.length > 0 ? wedding.coordinatorNames[0] : 'No coordinator'}
          </span>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-cowc-gray mb-1">
          <span>Tasks</span>
          <span>{wedding.tasksCompleted}/{wedding.totalTasks}</span>
        </div>
        <div className="h-1.5 bg-cowc-sand rounded-full overflow-hidden">
          <div className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: wedding.theme.primary }} />
        </div>
      </div>

      <div className={`text-xs font-semibold mt-2 ${
        days < 0 ? 'text-cowc-light-gray' :
        days <= 30 ? 'text-red-500' : 'text-cowc-gold'
      }`}>
        {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today!' : `${days} days away`}
      </div>
    </motion.div>
  )
}

function WeddingListRow({ wedding, navigate, handleStatusChange }) {
  return (
    <div
      onClick={() => navigate(`/wedding/${wedding.id}`)}
      className="p-5 hover:bg-cowc-cream transition-colors cursor-pointer flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-1 h-12 rounded-full flex-shrink-0"
          style={{ backgroundColor: wedding.theme.primary }} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-serif text-cowc-dark truncate">{wedding.couple_name}</h3>
            <PackageBadge packageType={wedding.package_type} />
          </div>
          <p className="text-sm text-cowc-gray">
            {formatDate(wedding.wedding_date)} · {wedding.venue_name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <p className="text-sm text-cowc-gray hidden md:block">
          {wedding.tasksCompleted}/{wedding.totalTasks} tasks
        </p>
        <StatusPill wedding={wedding} onStatusChange={handleStatusChange} />
      </div>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('grid')
  const [groupBy, setGroupBy] = useState('status') // 'status' | 'date'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [packageFilter, setPackageFilter] = useState('all') // 'all' | 'FP' | 'PP' | 'DOC'
  const [showArchived, setShowArchived] = useState(false)
  const [showFABTray, setShowFABTray] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [weddings, setWeddings] = useState([])
  const [stats, setStats] = useState({
    totalWeddings: 0, next30Days: 0, tasksRemaining: 0, totalVendors: 0,
    inquiry: 0, inTalks: 0, signed: 0, planning: 0,
  })

  useEffect(() => { loadDashboardData() }, [])

  const loadDashboardData = async () => {
    try {
      const [allWeddings, allVendors] = await Promise.all([
        weddingsAPI.getAll(),
        vendorsAPI.getAll().catch(() => []),
      ])
      const now = new Date()
      const in30 = new Date(); in30.setDate(in30.getDate() + 30)

      const enriched = allWeddings.map((w) => {
        const tasks = w.tasks || []
        return {
          ...w,
          coordinatorNames: (w.coordinators || []).map(
            (c) => `${c.coordinator?.full_name || 'Unknown'}${c.is_lead ? ' ✦' : ''}`
          ),
          tasksCompleted: tasks.filter((t) => t.completed).length,
          totalTasks: tasks.length,
        }
      })

      setWeddings(enriched)
      setStats({
        totalWeddings: enriched.filter((w) => !w.archived).length,
        next30Days: enriched.filter((w) => {
          if (!w.wedding_date) return false
          const d = new Date(w.wedding_date)
          return d >= now && d <= in30 && !w.archived
        }).length,
        tasksRemaining: enriched.reduce((s, w) => s + (w.totalTasks - w.tasksCompleted), 0),
        totalVendors: allVendors.length,
        inquiry:  enriched.filter((w) => w.status === 'Inquiry'  && !w.archived).length,
        inTalks:  enriched.filter((w) => w.status === 'In Talks' && !w.archived).length,
        signed:   enriched.filter((w) => w.status === 'Signed'   && !w.archived).length,
        planning: enriched.filter((w) => w.status === 'Planning' && !w.archived).length,
      })
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await weddingsAPI.update(id, { status: newStatus })
      setWeddings((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
      )
      // Auto-archive Completed/Cancelled after a short delay
      if (newStatus === 'Completed' || newStatus === 'Cancelled') {
        toast.info(`Marked as ${newStatus}. Archive it?`, {
          action: { label: 'Archive', onClick: () => handleArchive(id) },
          duration: 6000,
        })
      } else {
        toast.success(`Status updated to ${newStatus}`)
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleArchive = async (id) => {
    try {
      await weddingsAPI.update(id, { archived: true })
      setWeddings((prev) => prev.map((w) => (w.id === id ? { ...w, archived: true } : w)))
      toast.success('Wedding archived')
    } catch {
      toast.error('Failed to archive')
    }
  }

  const handleUnarchive = async (id) => {
    try {
      await weddingsAPI.update(id, { archived: false, status: 'Planning' })
      setWeddings((prev) =>
        prev.map((w) => (w.id === id ? { ...w, archived: false, status: 'Planning' } : w))
      )
      toast.success('Restored to Planning')
    } catch {
      toast.error('Failed to restore')
    }
  }

  const handleSignOut = async () => { await supabase.auth.signOut() }

  // Active (non-archived) weddings → filtered by pipeline stage + package + search
  // In 'all' view, Completed and Cancelled are hidden by default (use status tabs to view them)
  const HIDDEN_IN_ALL = ['Completed', 'Cancelled']
  const activeWeddings = weddings
    .filter((w) => !w.archived)
    .filter((w) => statusFilter === 'all'
      ? !HIDDEN_IN_ALL.includes(w.status)
      : w.status === statusFilter)
    .filter((w) => packageFilter === 'all' || w.package_type === packageFilter)
    .filter((w) =>
      !searchQuery.trim() ||
      w.couple_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.venue_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  // ── Grouping logic ──────────────────────────────────────────────────────
  // groupBy === 'status': group by pipeline stage (existing behaviour, sort by stage order)
  // groupBy === 'date':   group by calendar month, sorted chronologically

  const groupedWeddings = (() => {
    if (groupBy === 'date') {
      // Sort by wedding_date ascending (no date → end of list)
      const sorted = [...activeWeddings].sort((a, b) => {
        if (!a.wedding_date && !b.wedding_date) return 0
        if (!a.wedding_date) return 1
        if (!b.wedding_date) return -1
        return new Date(a.wedding_date) - new Date(b.wedding_date)
      })
      // Group into { key: 'YYYY-MM', label: 'Month Year', weddings: [] }
      const monthMap = new Map()
      for (const w of sorted) {
        let key, label
        if (w.wedding_date) {
          const d = new Date(w.wedding_date + 'T00:00:00')
          key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        } else {
          key   = 'no-date'
          label = 'No Date Set'
        }
        if (!monthMap.has(key)) monthMap.set(key, { key, label, weddings: [] })
        monthMap.get(key).weddings.push(w)
      }
      return Array.from(monthMap.values())
    }

    // groupBy === 'status'
    // Only use grouped view if showing all statuses (statusFilter === 'all')
    if (statusFilter !== 'all') return null // flat list for single-status filter
    return PIPELINE_STAGES.filter(s => s.value !== 'all').reduce((acc, stage) => {
      const group = [...activeWeddings]
        .filter(w => w.status === stage.value)
        .sort((a, b) => (STAGE_ORDER[a.status] ?? 99) - (STAGE_ORDER[b.status] ?? 99))
      if (group.length > 0) acc.push({ stage, weddings: group })
      return acc
    }, [])
  })()

  const archivedWeddings = weddings.filter((w) => w.archived)

  // Count per stage for filter tabs
  const countFor = (val) =>
    val === 'all'
      ? weddings.filter((w) => !w.archived).length
      : weddings.filter((w) => !w.archived && w.status === val).length

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-20 px-6 safe-top relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-cowc-gold opacity-10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Mobile: stacked. Desktop: side-by-side */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="COWC" className="h-10 w-10 sm:h-12 sm:w-12 object-contain flex-shrink-0" />
              <div>
                <h1 className="text-3xl sm:text-5xl font-serif font-light leading-tight">
                  Welcome, {user?.full_name?.split(' ')[0] || 'Admin'}
                </h1>
                <p className="text-white/70 text-xs sm:text-sm uppercase tracking-widest mt-0.5">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 sm:flex-shrink-0">
              <button
                onClick={() => navigate('/admin/users')}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                title="Users"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <NotificationBell iconColor="white" />
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {[
              { icon: Heart,       label: 'Active Weddings', value: stats.totalWeddings,  fill: true },
              { icon: Calendar,    label: 'Next 30 Days',    value: stats.next30Days      },
              { icon: TrendingUp,  label: 'Tasks Remaining', value: stats.tasksRemaining, click: () => navigate('/admin/tasks') },
              { icon: ShoppingBag, label: 'Vendors',         value: stats.totalVendors,   click: () => navigate('/admin/vendors') },
              { icon: Users,       label: 'In Pipeline',     value: stats.inquiry + stats.inTalks + stats.signed },
            ].map(({ icon: Icon, label, value, fill, click }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                onClick={click}
                className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 ${click ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
              >
                <Icon className={`w-8 h-8 text-cowc-gold mb-3 ${fill ? 'fill-cowc-gold' : ''}`} />
                <div className="text-3xl font-serif font-light text-cowc-dark mb-1">{value}</div>
                <div className="text-sm text-cowc-gray">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          {[
            { label: 'Create Wedding',      sub: 'Add a new couple and wedding details',     path: '/admin/create-wedding',      Icon: Plus },
            { label: 'Invite Users',         sub: 'Send invites to couples & coordinators',   path: '/admin/invite-users',         Icon: UserPlus },
            { label: 'Assign Coordinators',  sub: 'Match coordinators to weddings',           path: '/admin/assign-coordinators',  Icon: Calendar },
            { label: 'Catalogue',            sub: 'Manage items couples can reserve',         path: '/admin/catalogue',            Icon: ShoppingBag },
            { label: 'Vendors',              sub: 'Browse and manage your vendor directory',  path: '/admin/vendors',              Icon: Users },
            { label: 'Venues',               sub: 'Browse and manage your venue directory',   path: '/admin/venues',               Icon: Building2 },
          ].map(({ label, sub, path, Icon }) => (
            <button key={label} onClick={() => navigate(path)}
              className="card-premium p-8 text-left group hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <Icon className="w-10 h-10 text-cowc-gold" />
                <span className="text-3xl group-hover:translate-x-2 transition-transform">→</span>
              </div>
              <h3 className="text-2xl font-serif text-cowc-dark mb-2">{label}</h3>
              <p className="text-cowc-gray">{sub}</p>
            </button>
          ))}
        </motion.div>

        {/* ── Weddings Section ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-4xl font-serif font-light text-cowc-dark">Weddings</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-gray-200 focus:border-cowc-gold focus:outline-none w-52 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 bg-white rounded-xl p-1">
                <button onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-cowc-gold text-white' : 'text-cowc-gray'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setView('list')}
                  className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-cowc-gold text-white' : 'text-cowc-gray'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Group by + Package filter row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Group by toggle */}
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200">
              <button
                onClick={() => setGroupBy('status')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${groupBy === 'status' ? 'bg-cowc-dark text-white' : 'text-cowc-gray hover:text-cowc-dark'}`}
              >
                By Status
              </button>
              <button
                onClick={() => setGroupBy('date')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${groupBy === 'date' ? 'bg-cowc-dark text-white' : 'text-cowc-gray hover:text-cowc-dark'}`}
              >
                By Date
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-200" />

            {/* Package type filter */}
            <div className="flex gap-1.5 flex-wrap">
              {[{ value: 'all', label: 'All Types' }, ...PACKAGES].map(pkg => (
                <button
                  key={pkg.value}
                  onClick={() => setPackageFilter(pkg.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    packageFilter === pkg.value
                      ? 'bg-cowc-dark text-white border-cowc-dark'
                      : 'bg-white text-cowc-gray border-gray-200 hover:border-cowc-gold hover:text-cowc-dark'
                  }`}
                >
                  {pkg.label || pkg.value}
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline filter tabs (hidden in date-group mode since status pills still show on cards) */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {PIPELINE_STAGES.map((s) => {
              const count = countFor(s.value)
              const active = statusFilter === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    active
                      ? 'bg-cowc-dark text-white border-cowc-dark shadow-md'
                      : 'bg-white text-cowc-gray border-gray-200 hover:border-cowc-gold hover:text-cowc-dark'
                  }`}
                >
                  {s.value !== 'all' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : s.dot}`} />
                  )}
                  {s.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? 'bg-white/20' : 'bg-gray-100 text-cowc-gray'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Wedding cards */}
          {activeWeddings.length === 0 ? (
            <div className="card-premium p-16 text-center">
              <Heart className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
              <p className="text-xl text-cowc-gray">No weddings match your filters</p>
            </div>
          ) : groupedWeddings ? (
            /* ── Grouped view (by status or by date) ── */
            <div className="space-y-10">
              {groupedWeddings.map((group) => {
                const isDateGroup = groupBy === 'date'
                const key    = isDateGroup ? group.key   : group.stage.value
                const label  = isDateGroup ? group.label : group.stage.label
                const dot    = isDateGroup ? 'bg-cowc-gold' : group.stage.dot
                const count  = group.weddings.length
                return (
                  <div key={key}>
                    {/* Section header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                      <h2 className="text-base font-semibold text-cowc-dark">{label}</h2>
                      <span className="text-xs text-cowc-light-gray font-medium">
                        {count} wedding{count !== 1 ? 's' : ''}
                      </span>
                      <div className="flex-1 h-px bg-cowc-sand" />
                    </div>

                    {view === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {group.weddings.map((wedding, i) => <WeddingGridCard key={wedding.id} wedding={wedding} i={i} navigate={navigate} handleStatusChange={handleStatusChange} />)}
                      </div>
                    ) : (
                      <div className="card-premium divide-y divide-cowc-sand">
                        {group.weddings.map(wedding => <WeddingListRow key={wedding.id} wedding={wedding} navigate={navigate} handleStatusChange={handleStatusChange} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : view === 'grid' ? (
            /* ── Flat grid (single-status filter) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeWeddings.map((wedding, i) => (
                <WeddingGridCard key={wedding.id} wedding={wedding} i={i} navigate={navigate} handleStatusChange={handleStatusChange} />
              ))}
            </div>
          ) : (
            /* ── Flat list (single-status filter) ── */
            <div className="card-premium divide-y divide-cowc-sand">
              {activeWeddings.map(wedding => (
                <WeddingListRow key={wedding.id} wedding={wedding} navigate={navigate} handleStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </section>

        {/* ── Archived Section ─────────────────────────────── */}
        {archivedWeddings.length > 0 && (
          <section className="mt-12">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-3 text-cowc-gray hover:text-cowc-dark transition-colors mb-4 group"
            >
              <Archive className="w-5 h-5" />
              <span className="font-semibold">Archived ({archivedWeddings.length})</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="card-premium divide-y divide-cowc-sand opacity-70">
                    {archivedWeddings.map((wedding) => (
                      <div key={wedding.id}
                        className="p-5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-1 h-10 rounded-full bg-gray-300 flex-shrink-0" />
                          <div className="min-w-0">
                            <h3 className="text-base font-serif text-cowc-gray truncate">{wedding.couple_name}</h3>
                            <p className="text-xs text-cowc-light-gray">
                              {formatDate(wedding.wedding_date)} · {stageFor(wedding.status).label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => navigate(`/wedding/${wedding.id}`)}
                            className="text-xs text-cowc-gray hover:text-cowc-gold font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleUnarchive(wedding.id)}
                            className="flex items-center gap-1.5 text-xs text-cowc-gold font-semibold px-3 py-1.5 rounded-lg hover:bg-cowc-gold/10 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      {/* ── Single FAB ───────────────────────────────────────── */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50">
        <AnimatePresence>
          {showFABTray && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col items-end gap-3"
            >
              {[
                { icon: Heart,        label: 'New Wedding',       action: () => navigate('/admin/create-wedding') },
                { icon: UserPlus,     label: 'Invite User',       action: () => navigate('/admin/invite-users') },
                { icon: Users,        label: 'Assign Coordinator',action: () => navigate('/admin/assign-coordinators') },
                { icon: ClipboardList,label: 'All Tasks',         action: () => navigate('/admin/tasks') },
                { icon: ShoppingBag,  label: 'All Vendors',       action: () => navigate('/admin/vendors') },
                { icon: Package,      label: 'Catalogue',         action: () => navigate('/admin/catalogue') },
                { icon: StickyNote,   label: 'Notes',             action: () => navigate('/admin/notes') },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label}
                  onClick={() => { action(); setShowFABTray(false) }}
                  className="flex items-center gap-3 bg-white text-cowc-dark shadow-xl rounded-full pl-4 pr-5 py-3 hover:bg-cowc-cream transition-colors font-semibold text-sm"
                >
                  <div className="w-8 h-8 bg-cowc-gold rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => setShowFABTray(!showFABTray)}
          className={`w-16 h-16 text-white rounded-full shadow-2xl flex items-center justify-center transition-all ${
            showFABTray ? 'bg-cowc-dark' : 'bg-cowc-gold hover:scale-110'
          }`}
        >
          <Plus className={`w-8 h-8 transition-transform ${showFABTray ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>

      {showFABTray && (
        <div className="fixed inset-0 z-40" onClick={() => setShowFABTray(false)} />
      )}

      {/* ── Settings Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-serif text-cowc-dark">Settings</h3>
                <button onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-cowc-gray" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-cowc-dark">Email Notifications</p>
                    <p className="text-sm text-cowc-gray">Receive updates via email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-cowc-gold" />
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <p className="font-semibold text-cowc-dark">Dark Mode</p>
                    <p className="text-sm text-cowc-gray">Coming soon</p>
                  </div>
                  <input type="checkbox" disabled className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
