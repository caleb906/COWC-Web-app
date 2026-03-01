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
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-20 px-6 safe-top relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cowc-gold opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cowc-gold opacity-10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-start justify-between mb-6 sm:mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl sm:text-5xl font-serif font-light mb-1 sm:mb-2"
              >
                Welcome, {user?.full_name?.split(' ')[0]}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/70 text-xs sm:text-sm uppercase tracking-widest"
              >
                Wedding Coordinator
              </motion.p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <NotificationBell iconColor="white" />
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                onClick={handleSignOut}
                className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
            </div>
          </div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-5 sm:p-8 text-center"
          >
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-cowc-gold fill-cowc-gold" />
            </div>
            <div className="text-4xl sm:text-6xl font-serif font-light text-cowc-dark mb-1 sm:mb-2">
              {upcomingCount}
            </div>
            <div className="text-base sm:text-xl text-cowc-dark mb-0.5 sm:mb-1">
              Upcoming {upcomingCount === 1 ? 'Wedding' : 'Weddings'}
            </div>
            <div className="text-xs sm:text-sm text-cowc-gray uppercase tracking-wider">
              Next 6 Months
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 sm:-mt-10 relative z-20">
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
        <section className="mb-10 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-serif font-light text-cowc-dark">
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
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                          <h3 className="text-xl sm:text-2xl font-serif text-cowc-dark group-hover:text-cowc-gold transition-colors">
                            {wedding.couple_name}
                          </h3>
                          {lead && (
                            <span className="badge-lead">Lead</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-cowc-light-gray group-hover:text-cowc-gold group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-cowc-gray">
                        <Calendar className="w-5 h-5 text-cowc-gold" />
                        <span className="font-sans">
                          {formatDate(wedding.wedding_date, 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-cowc-gray">
                        <MapPin className="w-5 h-5 text-cowc-gold" />
                        <span className="font-sans">{wedding.venue_name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-cowc-gold" />
                        <span className={`font-sans font-semibold ${
                          days < 0 ? 'text-cowc-light-gray' :
                          days <= 30 ? 'text-red-500' :
                          'text-cowc-gold'
                        }`}>
                          {days < 0
                            ? `${Math.abs(days)} days ago`
                            : days === 0
                            ? 'Today!'
                            : `${days} days away`}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent Changes */}
        <section>
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-cowc-gold" />
            <h2 className="text-2xl sm:text-3xl font-serif font-light text-cowc-dark">
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
