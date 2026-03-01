import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, TrendingUp, Bell, LogOut, Heart, ChevronRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI, changeLogsAPI } from '../services/unifiedAPI'
import { formatDate, daysUntil, timeAgo } from '../utils/dates'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import InternalNotesWidget from './InternalNotesWidget'
import NotificationBell from './NotificationBell'

// Map change_type → icon + label
function ChangeIcon({ type }) {
  if (type === 'task_completed')  return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
  if (type === 'vendor_suggested') return <AlertCircle  className="w-3.5 h-3.5 text-cowc-gold  flex-shrink-0 mt-0.5" />
  return <Clock className="w-3.5 h-3.5 text-cowc-light-gray flex-shrink-0 mt-0.5" />
}

export default function CoordinatorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [weddings, setWeddings] = useState([])
  const [changeLogs, setChangeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      const weddingsData = await weddingsAPI.getForCoordinator(user.id)
      const activeWeddingsData = weddingsData.filter(
        (w) => !['Completed', 'Cancelled'].includes(w.status)
      )
      setWeddings(activeWeddingsData)

      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      const upcoming = weddingsData.filter((w) => {
        if (!w.wedding_date) return false
        const d = new Date(w.wedding_date)
        return d >= new Date() && d <= sixMonthsFromNow
      })
      setUpcomingCount(upcoming.length)

      const changes = await changeLogsAPI.getForCoordinator(user.id)
      setChangeLogs(changes)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false) }
  const handleSignOut = async () => { await supabase.auth.signOut() }

  const isLead = (wedding) =>
    wedding.coordinators?.some((c) => c.coordinator?.id === user?.id && c.is_lead)

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-cowc-gray text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Derived stats
  const thisMonthCount = weddings.filter(w => { const d = daysUntil(w.wedding_date); return d >= 0 && d <= 31 }).length

  // Sort: upcoming soonest first, past at the end
  const sortedWeddings = [...weddings].sort((a, b) => {
    const dA = daysUntil(a.wedding_date)
    const dB = daysUntil(b.wedding_date)
    if (dA >= 0 && dB >= 0) return dA - dB
    if (dA < 0  && dB < 0)  return dB - dA
    return dA >= 0 ? -1 : 1
  })

  // Most urgent upcoming wedding (for featured card)
  const nextWedding = sortedWeddings.find(w => daysUntil(w.wedding_date) >= 0)

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">

      {/* ── Hero — coordinator identity + at-a-glance ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(201,169,110,0.15) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-5">
          {/* Top bar */}
          <div className="flex items-center justify-between pt-12 pb-0">
            <NotificationBell iconColor="white" />
            <button onClick={handleSignOut}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Identity + stats */}
          <div className="pt-4 pb-10">
            <p className="text-white/50 text-xs uppercase tracking-[0.2em] mb-1">Coordinator</p>
            <h1 className="text-3xl font-serif font-light text-white">
              {user?.full_name?.split(' ')[0]}
            </h1>

            {/* Inline stats row */}
            <div className="flex items-center gap-6 mt-5">
              <div>
                <span className="text-4xl font-serif font-light text-white leading-none">{upcomingCount}</span>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">Upcoming</p>
              </div>
              <div className="w-px h-10 bg-white/15" />
              <div>
                <span className={`text-4xl font-serif font-light leading-none ${thisMonthCount > 0 ? 'text-red-300' : 'text-white'}`}>
                  {thisMonthCount}
                </span>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">This month</p>
              </div>
              <div className="w-px h-10 bg-white/15" />
              <div>
                <span className="text-4xl font-serif font-light text-white leading-none">{weddings.length}</span>
                <p className="text-white/50 text-xs uppercase tracking-wider mt-0.5">Total</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 relative z-20 space-y-5">

        {/* ── Featured: next upcoming wedding ── */}
        {nextWedding && (() => {
          const days = daysUntil(nextWedding.wedding_date)
          const isUrgent = days <= 30
          return (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => navigate(`/wedding/${nextWedding.id}`)}
              className="bg-white rounded-3xl shadow-lg overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            >
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{ background: isUrgent ? '#ef4444' : '#c9a96e' }} />
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray mb-1">
                      {isUrgent ? '⚡ Coming up soon' : 'Next wedding'}
                    </p>
                    <h2 className="font-serif text-2xl text-cowc-dark leading-tight">{nextWedding.couple_name}</h2>
                    <div className="flex items-center gap-2 mt-2 text-xs text-cowc-gray">
                      <Calendar className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
                      <span>{formatDate(nextWedding.wedding_date, 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    {nextWedding.venue_name && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-cowc-gray">
                        <MapPin className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
                        <span className="truncate">{nextWedding.venue_name}</span>
                      </div>
                    )}
                  </div>
                  {/* Countdown */}
                  <div className="text-right flex-shrink-0">
                    <span className={`text-5xl font-serif font-light leading-none ${isUrgent ? 'text-red-500' : 'text-cowc-gold'}`}>
                      {days === 0 ? '🎊' : days}
                    </span>
                    <p className="text-[11px] text-cowc-gray mt-1">{days === 0 ? 'today' : days === 1 ? 'day' : 'days'}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end">
                  <span className="text-xs font-semibold text-cowc-gold flex items-center gap-1">
                    Open wedding <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* ── All Weddings list ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray">
              All weddings
            </p>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-xs text-cowc-gold font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity">
              <TrendingUp className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {sortedWeddings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <Calendar className="w-10 h-10 text-cowc-light-gray mx-auto mb-3" />
              <p className="text-cowc-gray text-sm">No weddings assigned yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {sortedWeddings.map((wedding, index) => {
                const days = daysUntil(wedding.wedding_date)
                const lead = isLead(wedding)
                const isUrgent = days >= 0 && days <= 30
                const isPast = days < 0

                return (
                  <motion.button
                    key={wedding.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 + index * 0.04 }}
                    onClick={() => navigate(`/wedding/${wedding.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors active:scale-[0.99] group"
                  >
                    {/* Urgency dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isPast ? 'bg-gray-200' : isUrgent ? 'bg-red-400' : 'bg-cowc-gold'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-serif text-cowc-dark text-base md:text-lg truncate group-hover:text-cowc-gold transition-colors">
                          {wedding.couple_name}
                        </p>
                        {lead && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cowc-gold/15 text-cowc-gold font-semibold flex-shrink-0">
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-cowc-gray mt-0.5">
                        {formatDate(wedding.wedding_date, 'MMM d, yyyy')}
                        {wedding.venue_name && ` · ${wedding.venue_name}`}
                      </p>
                    </div>

                    {/* Days badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isPast    ? 'bg-gray-100 text-cowc-gray' :
                        isUrgent  ? 'bg-red-50 text-red-600' :
                                    'bg-cowc-gold/10 text-cowc-gold'
                      }`}>
                        {isPast ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-cowc-gold transition-colors" />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Recent Activity ───────────────────────────────── */}
        {changeLogs.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider font-semibold text-cowc-gray mb-3">Recent activity</p>
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {changeLogs.slice(0, 8).map((change, index) => (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex gap-3 px-5 py-4"
                >
                  <ChangeIcon type={change.change_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-cowc-gold truncate max-w-[55%]">
                        {change.wedding?.couple_name}
                      </span>
                      <span className="text-[11px] text-cowc-light-gray flex-shrink-0">
                        {timeAgo(change.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-cowc-gray leading-snug">{change.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

      </div>

      <InternalNotesWidget compactMode={true} />
    </div>
  )
}
