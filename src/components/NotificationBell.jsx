import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/appStore'
import { notificationsAPI } from '../services/unifiedAPI'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../utils/dates'
import { useToast } from './Toast'

/**
 * NotificationBell
 * Renders a bell icon with unread badge + popover list.
 * Subscribes to Supabase Realtime for live updates.
 *
 * Props:
 *   iconColor  — color of the bell icon (default 'white')
 *   darkMode   — if true uses a subtle dark hover ring instead of white/10
 */
export default function NotificationBell({ iconColor = 'white', darkMode = false }) {
  const { user } = useAuthStore()
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // ── Load + Realtime ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    loadNotifications()

    // Subscribe to new notifications for this user in real time
    const channel = supabase
      .channel(`notifications-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          // Show a toast so the user knows something happened
          toast.info(payload.new.message || 'You have a new notification')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // ── Close on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getForUser(user.id)
      setNotifications(data)
    } catch (e) {
      console.error('Error loading notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllAsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleMarkRead = async (id) => {
    if (notifications.find((n) => n.id === id)?.read) return
    await notificationsAPI.markAsRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2.5 rounded-full transition-colors ${
          darkMode
            ? 'hover:bg-black/8 text-cowc-gray'
            : 'bg-white/10 hover:bg-white/20'
        }`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" style={{ color: iconColor }} />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-cowc-dark text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-cowc-gold font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-cowc-gray" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-cowc-gray text-sm">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-cowc-light-gray mx-auto mb-2" />
                  <p className="text-cowc-gray text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 25).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                      !n.read ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !n.read ? 'bg-blue-500' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cowc-dark leading-snug">{n.message}</p>
                        <p className="text-xs text-cowc-gray mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
