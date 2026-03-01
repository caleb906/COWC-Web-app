import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, LogOut, Heart, ChevronRight, CheckCircle2,
  Circle, Clock, Home, ListChecks, AlertCircle,
  RefreshCw, Zap, Radio,
  ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI, tasksAPI } from '../services/unifiedAPI'
import { formatDate, formatTime, daysUntil, timeAgo } from '../utils/dates'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import InternalNotesWidget from './InternalNotesWidget'
import NotificationBell from './NotificationBell'
import { useToast } from './Toast'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

function nowMinutes() {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

function priorityColor(p) {
  if (p === 'high')   return 'text-red-500 bg-red-50'
  if (p === 'medium') return 'text-amber-500 bg-amber-50'
  return 'text-gray-400 bg-gray-50'
}

function dueBadge(dueDate) {
  if (!dueDate) return null
  const d = daysUntil(dueDate)
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`, cls: 'text-red-500 bg-red-50' }
  if (d === 0) return { label: 'Due today',               cls: 'text-amber-600 bg-amber-50' }
  if (d <= 3)  return { label: `${d}d left`,               cls: 'text-amber-500 bg-amber-50' }
  if (d <= 7)  return { label: `${d}d left`,               cls: 'text-cowc-gold bg-cowc-gold/10' }
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'home',     label: 'Home',    Icon: Home },
    { id: 'tasks',    label: 'Tasks',   Icon: ListChecks },
    { id: 'weddings', label: 'Weddings',Icon: Calendar },
  ]
  return (
    <div className="flex bg-white/10 rounded-2xl p-1 gap-1">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            active === id
              ? 'bg-white text-cowc-dark shadow-sm'
              : 'text-white/60 hover:text-white/90'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Day-of live banner ────────────────────────────────────────────────────────
function DayOfBanner({ wedding, onOpen }) {
  const now = nowMinutes()
  const items = [...(wedding.timeline_items || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  // Find current / next event
  const current = items.findLast(item => {
    const start = parseTimeToMinutes(item.time)
    if (start === null) return false
    return start <= now
  })
  const next = items.find(item => {
    const start = parseTimeToMinutes(item.time)
    if (start === null) return false
    return start > now
  })

  const feature = current || next || items[0]
  const minutesUntilNext = next ? (parseTimeToMinutes(next.time) - now) : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 bg-white/20 text-xs font-bold px-2.5 py-1 rounded-full">
            <Radio className="w-3 h-3 animate-pulse" />
            LIVE · TODAY
          </span>
          <span className="text-white/70 text-xs">Day of coordination</span>
        </div>

        <h2 className="font-serif text-2xl font-light text-white mb-0.5">{wedding.couple_name}</h2>
        <p className="text-white/60 text-sm mb-5">
          {wedding.venue_name || 'Venue TBD'}
        </p>

        {feature && (
          <div className="bg-white/15 rounded-2xl p-4 mb-4">
            <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">
              {current ? 'Current event' : 'First event'}
            </p>
            <p className="font-semibold text-white">{feature.title}</p>
            {feature.time && (
              <p className="text-white/70 text-sm mt-0.5">{formatTime(feature.time)}</p>
            )}
            {feature.description && (
              <p className="text-white/60 text-xs mt-1 leading-snug">{feature.description}</p>
            )}
          </div>
        )}

        {next && next !== feature && (
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
            <div>
              <span className="text-white/60 text-xs">Next: </span>
              <span className="text-white text-sm font-medium">{next.title}</span>
              {next.time && <span className="text-white/60 text-xs ml-1">· {formatTime(next.time)}</span>}
              {minutesUntilNext !== null && minutesUntilNext <= 30 && (
                <span className="ml-2 text-[10px] bg-yellow-300/30 text-yellow-200 font-semibold px-1.5 py-0.5 rounded-full">
                  in {minutesUntilNext}m
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onOpen(wedding.id)}
          className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          Full timeline
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Next-event mini-card ──────────────────────────────────────────────────────
function NextEventCard({ wedding, onOpen }) {
  const days = daysUntil(wedding.wedding_date)
  const isUrgent = days >= 0 && days <= 14
  const items = [...(wedding.timeline_items || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const nextItem = items[0]

  return (
    <div
      onClick={() => onOpen(wedding.id)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] flex gap-4 items-center"
    >
      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-50' : 'bg-cowc-gold/10'}`}>
        <p className={`font-serif text-xl font-light leading-none ${isUrgent ? 'text-red-500' : 'text-cowc-gold'}`}>
          {days === 0 ? '🎊' : days}
        </p>
        <p className={`text-[9px] uppercase tracking-wide mt-0.5 ${isUrgent ? 'text-red-400' : 'text-cowc-gold/70'}`}>
          {days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'days'}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-base text-cowc-dark truncate">{wedding.couple_name}</p>
        <p className="text-xs text-cowc-gray mt-0.5">
          {wedding.venue_name || 'Venue TBD'}
          {' · '}{formatDate(wedding.wedding_date, 'MMM d')}
        </p>
        {nextItem && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock className="w-3 h-3 text-cowc-gold flex-shrink-0" />
            <span className="text-xs text-cowc-gold font-medium truncate">
              {nextItem.time ? `${formatTime(nextItem.time)} · ` : ''}{nextItem.title}
            </span>
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-cowc-light-gray flex-shrink-0" />
    </div>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, weddingName, onToggle, toggling }) {
  const badge = dueBadge(task.due_date)
  const isOverdue = badge?.cls?.includes('red') && !task.completed

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: task.completed ? 0.5 : 1 }}
      className={`flex items-start gap-3 px-4 py-3.5 ${isOverdue ? 'bg-red-50/40' : ''}`}
    >
      <button
        onClick={() => onToggle(task)}
        disabled={toggling}
        className="mt-0.5 flex-shrink-0"
      >
        {task.completed
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-gray-300'}`} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${task.completed ? 'line-through text-cowc-light-gray' : 'text-cowc-dark'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {weddingName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cowc-gold/10 text-cowc-gold font-medium">
              {weddingName}
            </span>
          )}
          {badge && !task.completed && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {task.priority === 'high' && !task.completed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-red-500 bg-red-50">
              High priority
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Wedding list row ──────────────────────────────────────────────────────────
function WeddingRow({ wedding, isLead, index, onOpen }) {
  const days = daysUntil(wedding.wedding_date)
  const isPast = days < 0
  const isUrgent = days >= 0 && days <= 30
  const wDate = wedding.wedding_date ? new Date(wedding.wedding_date + 'T00:00:00') : null
  const openTasks = (wedding.tasks || []).filter(t => !t.completed).length

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.04 * index }}
      onClick={() => onOpen(wedding.id)}
      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cowc-cream transition-colors active:scale-[0.99] group"
    >
      {wDate ? (
        <div className="w-12 text-center flex-shrink-0">
          <p className="font-serif text-2xl font-light text-cowc-dark leading-none">{wDate.getDate()}</p>
          <p className="text-[10px] text-cowc-light-gray uppercase tracking-wide mt-0.5">
            {wDate.toLocaleString('default', { month: 'short' })}
          </p>
        </div>
      ) : (
        <div className="w-12 text-center flex-shrink-0">
          <p className="text-cowc-light-gray text-sm">—</p>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-serif text-base text-cowc-dark truncate group-hover:text-cowc-gold transition-colors">
            {wedding.couple_name}
          </p>
          {isLead && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cowc-gold/15 text-cowc-gold font-semibold flex-shrink-0">
              Lead
            </span>
          )}
        </div>
        <p className="text-xs text-cowc-gray">
          {wedding.venue_name || 'Venue TBD'}
          {days !== null && (
            <span className={` · font-medium ${isPast ? 'text-cowc-light-gray' : isUrgent ? 'text-red-500' : 'text-cowc-gold'}`}>
              {isPast ? `${Math.abs(days)}d ago` : days === 0 ? 'Today!' : `${days}d away`}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {openTasks > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cowc-gold/10 text-cowc-gold">
            {openTasks} open
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-cowc-light-gray group-hover:text-cowc-gold transition-colors" />
      </div>
    </motion.button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CoordinatorDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()
  const [weddings, setWeddings]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [activeTab, setActiveTab]       = useState('home')
  const [taskFilter, setTaskFilter]     = useState('open')  // 'open' | 'mine' | 'overdue' | 'done'
  const [togglingId, setTogglingId]     = useState(null)

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      const data = await weddingsAPI.getForCoordinator(user.id)
      const active = data.filter(w => !['Completed', 'Cancelled'].includes(w.status))
      setWeddings(active)
    } catch (e) {
      console.error('Error loading data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSignOut = async () => { await supabase.auth.signOut() }

  const isLead = (w) => w.coordinators?.some(c => c.coordinator?.id === user?.id && c.is_lead)

  // ── Derived data ─────────────────────────────────────────────────────────

  const sorted = [...weddings].sort((a, b) => {
    const dA = daysUntil(a.wedding_date), dB = daysUntil(b.wedding_date)
    if (dA >= 0 && dB >= 0) return dA - dB
    if (dA < 0  && dB < 0)  return dB - dA
    return dA >= 0 ? -1 : 1
  })

  const todayWedding  = weddings.find(w => daysUntil(w.wedding_date) === 0)
  const nextWedding   = sorted.find(w => daysUntil(w.wedding_date) > 0)
  const upcoming3Days = sorted.filter(w => { const d = daysUntil(w.wedding_date); return d > 0 && d <= 3 })
  const thisMonth     = weddings.filter(w => { const d = daysUntil(w.wedding_date); return d >= 0 && d <= 31 }).length

  // Next 3 upcoming weddings (excluding today) for "What's next" strip
  const nextFew = sorted.filter(w => daysUntil(w.wedding_date) > 0).slice(0, 3)

  // All tasks across weddings, with wedding reference attached
  const allTasks = weddings.flatMap(w =>
    (w.tasks || []).map(t => ({ ...t, _weddingName: w.couple_name, _weddingId: w.id }))
  )

  const filteredTasks = (() => {
    let tasks = allTasks
    if (taskFilter === 'open')    tasks = tasks.filter(t => !t.completed)
    if (taskFilter === 'mine')    tasks = tasks.filter(t => !t.completed && (t.assigned_to === 'coordinator' || t.assigned_user_id === user?.id))
    if (taskFilter === 'overdue') tasks = tasks.filter(t => !t.completed && t.due_date && daysUntil(t.due_date) < 0)
    if (taskFilter === 'done')    tasks = tasks.filter(t => t.completed)
    // Sort: overdue first, then by due_date, then no-date last
    return tasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
  })()

  // Group tasks by wedding
  const tasksByWedding = filteredTasks.reduce((acc, t) => {
    const key = t._weddingId
    if (!acc[key]) acc[key] = { name: t._weddingName, weddingId: key, tasks: [] }
    acc[key].tasks.push(t)
    return acc
  }, {})

  const openCount    = allTasks.filter(t => !t.completed).length
  const overdueCount = allTasks.filter(t => !t.completed && t.due_date && daysUntil(t.due_date) < 0).length
  const dueToday     = allTasks.filter(t => !t.completed && t.due_date && daysUntil(t.due_date) === 0).length

  // ── Task toggle ────────────────────────────────────────────────────────
  const handleTaskToggle = async (task) => {
    setTogglingId(task.id)
    try {
      if (task.completed) {
        await tasksAPI.uncomplete(task.id)
        toast.info(`Reopened: ${task.title}`)
      } else {
        await tasksAPI.complete(task.id)
        toast.success(`Done: ${task.title}`)
      }
      await loadData()
    } catch {
      toast.error('Failed to update task')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-cowc-gray text-sm">Loading your weddings…</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cowc-cream pb-28">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(201,169,110,0.18) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-2xl mx-auto px-5">

          {/* Top bar */}
          <div className="flex items-center justify-between pt-12 pb-0">
            <NotificationBell iconColor="white" />
            <button onClick={handleSignOut}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Identity + stats */}
          <div className="pt-4 pb-6">
            <p className="text-white/50 text-xs uppercase tracking-[0.2em] mb-1">Coordinator</p>
            <h1 className="text-3xl font-serif font-light text-white mb-5">
              {user?.full_name?.split(' ')[0]}
            </h1>

            <div className="flex items-center gap-5 mb-6">
              <div>
                <span className={`text-4xl font-serif font-light leading-none ${todayWedding ? 'text-green-300' : 'text-white'}`}>
                  {todayWedding ? '🎊' : weddings.length}
                </span>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">
                  {todayWedding ? 'Day of!' : 'Weddings'}
                </p>
              </div>
              <div className="w-px h-10 bg-white/15" />
              <div>
                <span className={`text-4xl font-serif font-light leading-none ${thisMonth > 0 ? 'text-red-300' : 'text-white'}`}>
                  {thisMonth}
                </span>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">This month</p>
              </div>
              <div className="w-px h-10 bg-white/15" />
              <div>
                <span className={`text-4xl font-serif font-light leading-none ${overdueCount > 0 ? 'text-red-300' : 'text-white'}`}>
                  {openCount}
                </span>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">
                  {overdueCount > 0 ? `${overdueCount} overdue` : 'Open tasks'}
                </p>
              </div>
            </div>

            {/* Tab bar inside hero */}
            <TabBar active={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </motion.div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-5 -mt-3 relative z-20 space-y-4">

        {/* ══════════════════ HOME TAB ══════════════════════════════════════ */}
        {activeTab === 'home' && (
          <>
            {/* Day-of live card */}
            {todayWedding && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <DayOfBanner wedding={todayWedding} onOpen={id => navigate(`/wedding/${id}`)} />
              </motion.div>
            )}

            {/* Upcoming-soon alert strip */}
            {upcoming3Days.length > 0 && !todayWedding && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700 font-medium">
                    {upcoming3Days.length === 1
                      ? `${upcoming3Days[0].couple_name} is in ${daysUntil(upcoming3Days[0].wedding_date)} day${daysUntil(upcoming3Days[0].wedding_date) === 1 ? '' : 's'}`
                      : `${upcoming3Days.length} weddings in the next 3 days`}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Overdue tasks alert */}
            {overdueCount > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
                <button
                  onClick={() => { setActiveTab('tasks'); setTaskFilter('overdue') }}
                  className="w-full bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-red-100 transition-colors"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium flex-1 text-left">
                    {overdueCount} overdue task{overdueCount > 1 ? 's' : ''} across your weddings
                  </p>
                  <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
                </button>
              </motion.div>
            )}

            {/* Due today */}
            {dueToday > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                <button
                  onClick={() => { setActiveTab('tasks'); setTaskFilter('open') }}
                  className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition-colors"
                >
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700 font-medium flex-1 text-left">
                    {dueToday} task{dueToday > 1 ? 's' : ''} due today
                  </p>
                  <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                </button>
              </motion.div>
            )}

            {/* What's next — next few upcoming weddings with their first event */}
            {nextFew.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray">
                    {todayWedding ? 'Coming up next' : 'What\'s next'}
                  </p>
                </div>
                <div className="space-y-2">
                  {nextFew.map(w => (
                    <NextEventCard key={w.id} wedding={w} onOpen={id => navigate(`/wedding/${id}`)} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Empty state */}
            {weddings.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                  <Calendar className="w-10 h-10 text-cowc-light-gray mx-auto mb-3" />
                  <p className="text-cowc-gray text-sm">No weddings assigned yet</p>
                  <p className="text-cowc-light-gray text-xs mt-1">Your coordinator will assign you shortly</p>
                </div>
              </motion.div>
            )}

            {/* Quick task peek — top 3 open tasks */}
            {openCount > 0 && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray">Tasks due soon</p>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs text-cowc-gold font-semibold hover:opacity-70 transition-opacity flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {allTasks
                    .filter(t => !t.completed && t.due_date)
                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                    .slice(0, 3)
                    .map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        weddingName={task._weddingName}
                        onToggle={handleTaskToggle}
                        toggling={togglingId === task.id}
                      />
                    ))
                  }
                </div>
              </motion.section>
            )}
          </>
        )}

        {/* ══════════════════ TASKS TAB ══════════════════════════════════════ */}
        {activeTab === 'tasks' && (
          <>
            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { label: 'Open',    value: openCount,    color: 'text-cowc-dark' },
                { label: 'Due Today', value: dueToday,  color: 'text-amber-600' },
                { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? 'text-red-500' : 'text-cowc-dark' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                  <p className={`text-2xl font-serif font-light ${color}`}>{value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-cowc-gray mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Filter pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
            >
              {[
                { id: 'open',    label: 'Open' },
                { id: 'mine',    label: 'My tasks' },
                { id: 'overdue', label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
                { id: 'done',    label: 'Completed' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTaskFilter(id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    taskFilter === id
                      ? 'bg-cowc-dark text-white'
                      : 'bg-white text-cowc-gray hover:bg-gray-100 shadow-sm'
                  }`}
                >
                  {label}
                </button>
              ))}
            </motion.div>

            {/* Task groups */}
            {Object.keys(tasksByWedding).length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <p className="text-cowc-gray text-sm">
                  {taskFilter === 'done' ? 'No completed tasks yet' : 'All caught up!'}
                </p>
              </div>
            ) : (
              Object.values(tasksByWedding).map((group, gi) => (
                <motion.div
                  key={group.weddingId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * gi }}
                >
                  {/* Wedding header */}
                  <button
                    onClick={() => navigate(`/wedding/${group.weddingId}`)}
                    className="flex items-center gap-2 mb-1.5 group"
                  >
                    <Heart className="w-3 h-3 text-cowc-gold" />
                    <p className="text-xs font-semibold text-cowc-gray group-hover:text-cowc-gold transition-colors">
                      {group.name}
                    </p>
                    <ChevronRight className="w-3 h-3 text-cowc-light-gray group-hover:text-cowc-gold transition-colors" />
                  </button>
                  <div className="bg-white rounded-2xl shadow-sm overflow-visible divide-y divide-gray-50">
                    {group.tasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        weddingName={null}
                        onToggle={handleTaskToggle}
                        toggling={togglingId === task.id}
                      />
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </>
        )}

        {/* ══════════════════ WEDDINGS TAB ══════════════════════════════════ */}
        {activeTab === 'weddings' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray">
                {weddings.length} wedding{weddings.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs text-cowc-gold font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </motion.div>

            {sorted.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                <Calendar className="w-10 h-10 text-cowc-light-gray mx-auto mb-3" />
                <p className="text-cowc-gray text-sm">No weddings assigned yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-visible divide-y divide-cowc-sand">
                {sorted.map((w, i) => (
                  <WeddingRow
                    key={w.id}
                    wedding={w}
                    isLead={isLead(w)}
                    index={i}
                    onOpen={id => navigate(`/wedding/${id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>

      <InternalNotesWidget compactMode={true} />
    </div>
  )
}
