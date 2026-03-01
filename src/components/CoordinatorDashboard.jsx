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

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">

      {/* ── Nav bar ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cowc-gold opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cowc-gold opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-7">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0"><NotificationBell iconColor="white" /></div>
            <h1 className="flex-1 text-center text-xl font-serif font-light tracking-widest text-white truncate">
              {user?.full_name?.split(' ')[0]}
            </h1>
            <div className="flex-shrink-0">
              <button onClick={handleSignOut}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-5 relative z-20 space-y-4">

        {/* Two-up stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3"
          >
            <Heart className="w-6 h-6 text-cowc-gold fill-cowc-gold flex-shrink-0" />
            <div>
              <div className="text-3xl font-serif font-light text-cowc-dark leading-none">{upcomingCount}</div>
              <div className="text-[10px] text-cowc-gray uppercase tracking-wider mt-0.5">Upcoming</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 ${thisMonthCount > 0 ? 'ring-1 ring-red-200' : ''}`}
          >
            <Calendar className={`w-6 h-6 flex-shrink-0 ${thisMonthCount > 0 ? 'text-red-500' : 'text-cowc-gold'}`} />
            <div>
              <div className={`text-3xl font-serif font-light leading-none ${thisMonthCount > 0 ? 'text-red-500' : 'text-cowc-dark'}`}>
                {thisMonthCount}
              </div>
              <div className="text-[10px] text-cowc-gray uppercase tracking-wider mt-0.5">This Month</div>
            </div>
          </motion.div>
        </div>

        {/* Refresh indicator */}
        {refreshing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-cowc-gold font-semibold">
            <TrendingUp className="w-3.5 h-3.5 animate-spin" /> Refreshing...
          </motion.div>
        )}

        {/* ── Wedding List ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray">Your Weddings</p>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-xs text-cowc-gold font-semibold flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <TrendingUp className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {sortedWeddings.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <Calendar className="w-10 h-10 text-cowc-light-gray mx-auto mb-3" />
              <p className="text-cowc-gray text-sm">No weddings assigned yet</p>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {sortedWeddings.map((wedding, index) => {
                const days = daysUntil(wedding.wedding_date)
                const lead = isLead(wedding)
                // Urgency: red border <30d, gold 30-90d, subtle gray for past
                const borderColor = days < 0 ? '#e5e7eb' : days <= 30 ? '#ef4444' : '#c9a96e'

                return (
                  <motion.div
                    key={wedding.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => navigate(`/wedding/${wedding.id}`)}
                    style={{ borderLeftColor: borderColor }}
                    className="bg-white rounded-2xl shadow-sm border-l-4 px-4 py-3 cursor-pointer group active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Left: name + lead badge */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="text-base font-serif text-cowc-dark group-hover:text-cowc-gold transition-colors truncate">
                          {wedding.couple_name}
                        </h3>
                        {lead && (
                          <span className="badge-lead flex-shrink-0 text-[10px] px-1.5 py-0.5">Lead</span>
                        )}
                      </div>
                      {/* Right: days badge + chevron */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          days < 0      ? 'bg-gray-100 text-cowc-gray' :
                          days === 0    ? 'bg-red-100 text-red-600' :
                          days <= 30    ? 'bg-red-100 text-red-600' :
                                          'bg-cowc-gold/15 text-cowc-gold'
                        }`}>
                          {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today!' : `${days}d`}
                        </span>
                        <ChevronRight className="w-4 h-4 text-cowc-light-gray group-hover:text-cowc-gold group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    {/* Date + venue */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-cowc-gray flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-cowc-gold flex-shrink-0" />
                        <span>{formatDate(wedding.wedding_date, 'MMM d, yyyy')}</span>
                      </div>
                      {wedding.venue_name && (
                        <>
                          <span className="text-cowc-light-gray">·</span>
                          <div className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-cowc-gold flex-shrink-0" />
                            <span className="truncate">{wedding.venue_name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Recent Activity ───────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Bell className="w-3.5 h-3.5 text-cowc-gold" />
            <p className="text-xs uppercase tracking-widest font-semibold text-cowc-gray">Recent Activity</p>
          </div>

          {changeLogs.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <Bell className="w-10 h-10 text-cowc-light-gray mx-auto mb-3" />
              <p className="text-cowc-gray text-sm">No recent updates</p>
            </motion.div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {changeLogs.slice(0, 10).map((change, index) => (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                >
                  <ChangeIcon type={change.change_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cowc-gold/12 text-cowc-gold truncate max-w-[60%]">
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
          )}
        </section>

      </div>

      <InternalNotesWidget compactMode={true} />
    </div>
  )
}
