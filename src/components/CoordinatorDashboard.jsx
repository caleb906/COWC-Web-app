import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Clock, TrendingUp, Bell, LogOut, Heart, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI, changeLogsAPI } from '../services/unifiedAPI'
import { formatDate, daysUntil, timeAgo } from '../utils/dates'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import InternalNotesWidget from './InternalNotesWidget'
import NotificationBell from './NotificationBell'

export default function CoordinatorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [weddings, setWeddings] = useState([])
  const [changeLogs, setChangeLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      const weddingsData = await weddingsAPI.getForCoordinator(user.id)
      // Hide completed/cancelled from default view
      const activeWeddingsData = weddingsData.filter(
        (w) => !['Completed', 'Cancelled'].includes(w.status)
      )
      setWeddings(activeWeddingsData)

      // Count upcoming weddings (next 6 months)
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      const upcoming = weddingsData.filter((w) => {
        if (!w.wedding_date) return false
        const weddingDate = new Date(w.wedding_date)
        return weddingDate >= new Date() && weddingDate <= sixMonthsFromNow
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // coordinators from Supabase join: [{ id: assignmentId, is_lead, coordinator: { id, full_name, email } }]
  const isLead = (wedding) => {
    return wedding.coordinators?.some(
      (c) => c.coordinator?.id === user?.id && c.is_lead
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading your weddings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Hero — single nav bar, no greeting text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cowc-gold opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cowc-gold opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-7">
          <div className="flex items-center gap-2">
            {/* Left: notification bell */}
            <div className="flex-shrink-0">
              <NotificationBell iconColor="white" />
            </div>

            {/* Centre: coordinator name */}
            <h1 className="flex-1 text-center text-xl font-serif font-light tracking-widest text-white truncate">
              {user?.full_name?.split(' ')[0]}
            </h1>

            {/* Right: sign out */}
            <div className="flex-shrink-0">
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-5 relative z-20">

        {/* Stats card — overlaps hero, same pattern as CoupleDashboard countdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-lg flex items-center gap-3 px-4 py-3 mb-3"
        >
          <Heart className="w-7 h-7 text-cowc-gold fill-cowc-gold flex-shrink-0" />
          <div className="flex items-baseline gap-2 flex-1">
            <span className="text-4xl font-serif font-light text-cowc-dark leading-none">
              {upcomingCount}
            </span>
            <div>
              <div className="text-sm text-cowc-dark font-medium leading-tight">
                Upcoming {upcomingCount === 1 ? 'Wedding' : 'Weddings'}
              </div>
              <div className="text-[10px] text-cowc-gray uppercase tracking-wider">
                Next 6 Months
              </div>
            </div>
          </div>
        </motion.div>
        {/* Pull to refresh indicator */}
        {refreshing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pull-refresh mb-4"
          >
            <TrendingUp className="w-5 h-5 animate-spin mr-2" />
            Refreshing...
          </motion.div>
        )}

        {/* Your Weddings */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-serif font-light text-cowc-dark">
              Your Weddings
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-cowc-gold font-semibold text-sm flex items-center gap-2 hover:gap-3 transition-all"
            >
              Refresh
              <TrendingUp className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {weddings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-premium p-12 text-center"
            >
              <Calendar className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
              <p className="text-xl text-cowc-gray">No weddings assigned yet</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {weddings.map((wedding, index) => {
                const days = daysUntil(wedding.wedding_date)
                const lead = isLead(wedding)

                return (
                  <motion.div
                    key={wedding.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/wedding/${wedding.id}`)}
                    className="card-premium p-4 sm:p-6 cursor-pointer group"
                  >
                    {/* Card header: name + badges */}
                    <div className="flex items-start justify-between mb-2.5 sm:mb-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-serif text-cowc-dark group-hover:text-cowc-gold transition-colors truncate">
                          {wedding.couple_name}
                        </h3>
                        {lead && (
                          <span className="badge-lead flex-shrink-0">Lead</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          days < 0 ? 'bg-gray-100 text-cowc-gray' :
                          days <= 30 ? 'bg-red-100 text-red-600' :
                          'bg-cowc-gold/15 text-cowc-gold'
                        }`}>
                          {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today!' : `${days}d`}
                        </span>
                        <ChevronRight className="w-5 h-5 text-cowc-light-gray group-hover:text-cowc-gold group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    {/* Date + venue on one compact row */}
                    <div className="flex items-center gap-3 text-sm text-cowc-gray flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
                        <span>{formatDate(wedding.wedding_date, 'MMM d, yyyy')}</span>
                      </div>
                      {wedding.venue_name && (
                        <>
                          <span className="text-cowc-light-gray">·</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
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

        {/* Recent Changes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-cowc-gold" />
            <h2 className="text-xl font-serif font-light text-cowc-dark">
              Recent Changes
            </h2>
          </div>

          {changeLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-premium p-12 text-center"
            >
              <Bell className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
              <p className="text-xl text-cowc-gray">No recent updates</p>
            </motion.div>
          ) : (
            <div className="card-premium p-6">
              <div className="space-y-4">
                {changeLogs.slice(0, 10).map((change, index) => (
                  <motion.div
                    key={change.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="pb-4 border-b border-cowc-sand last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-cowc-dark">
                        {change.wedding?.couple_name}
                      </span>
                      <span className="text-sm text-cowc-light-gray">
                        {timeAgo(change.created_at)}
                      </span>
                    </div>
                    <p className="text-cowc-gray font-sans text-sm">
                      {change.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Floating Internal Notes Widget */}
      <InternalNotesWidget compactMode={true} />
    </div>
  )
}
