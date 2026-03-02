import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plug, Check, X, RefreshCw, AlertCircle, ChevronRight, Clock, Zap, Link2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

// ─── HoneyBook logo SVG ────────────────────────────────────────────────────
function HoneyBookLogo({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#FF6B35" />
      <path d="M10 28V12l10 8 10-8v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ─── Generic "coming soon" integration card ────────────────────────────────
function ComingSoonCard({ name, description, logo }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm opacity-60">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
          {logo}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-cowc-dark">{name}</p>
          <p className="text-sm text-cowc-gray mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-semibold text-cowc-gray bg-gray-100 px-3 py-1.5 rounded-full flex-shrink-0">
          Coming Soon
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function IntegrationsScreen() {
  const navigate = useNavigate()
  const toast = useToast()

  const [hbApiKey, setHbApiKey] = useState('')
  const [hbConnection, setHbConnection] = useState(null) // null | { api_key, status, last_synced_at }
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loadingConnection, setLoadingConnection] = useState(true)

  useEffect(() => {
    loadConnection()
  }, [])

  const loadConnection = async () => {
    try {
      setLoadingConnection(true)
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'honeybook')
        .maybeSingle()
      if (error) throw error
      setHbConnection(data || null)
    } catch (err) {
      console.error('Failed to load integration:', err)
    } finally {
      setLoadingConnection(false)
    }
  }

  const handleConnect = async () => {
    if (!hbApiKey.trim()) {
      toast.error('Please enter your HoneyBook API key')
      return
    }
    setConnecting(true)
    try {
      // Store in Supabase integrations table
      const { error } = await supabase
        .from('integrations')
        .upsert({
          provider: 'honeybook',
          api_key: hbApiKey.trim(),
          status: 'connected',
          last_synced_at: null,
        }, { onConflict: 'provider' })
      if (error) throw error
      toast.success('HoneyBook connected!')
      setHbApiKey('')
      setShowKeyInput(false)
      await loadConnection()
    } catch (err) {
      toast.error('Failed to connect: ' + (err.message || 'Unknown error'))
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect HoneyBook? Syncing will stop but your existing weddings won\'t be affected.')) return
    setDisconnecting(true)
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('provider', 'honeybook')
      if (error) throw error
      setHbConnection(null)
      toast.success('HoneyBook disconnected')
    } catch (err) {
      toast.error('Failed to disconnect: ' + (err.message || 'Unknown error'))
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      // Calls the separate backend sync service
      const backendUrl = import.meta.env.VITE_INTEGRATIONS_API_URL || 'http://localhost:3001'
      const res = await fetch(`${backendUrl}/api/honeybook/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: hbConnection.api_key }),
      })
      if (!res.ok) throw new Error('Sync failed')
      const { synced } = await res.json()
      // Update last_synced_at
      await supabase
        .from('integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('provider', 'honeybook')
      toast.success(`Synced ${synced} wedding${synced !== 1 ? 's' : ''} from HoneyBook`)
      await loadConnection()
    } catch (err) {
      toast.error('Sync failed — make sure the integration backend is running')
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = hbConnection?.status === 'connected'

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white safe-top pt-12 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-cowc-gold rounded-2xl flex items-center justify-center flex-shrink-0">
              <Plug className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-serif font-light">Integrations</h1>
              <p className="text-white/60 mt-1 text-sm">Connect COWC to the tools you already use</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 -mt-8 space-y-6">

        {/* ── HoneyBook Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Card header */}
          <div className="p-5 flex items-center gap-4">
            <HoneyBookLogo className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-cowc-dark text-lg">HoneyBook</p>
                {isConnected && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-cowc-gray mt-0.5">
                Auto-import new bookings from HoneyBook into COWC as weddings
              </p>
            </div>
          </div>

          {/* What it does */}
          <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Zap, label: 'Auto-create weddings', sub: 'New HoneyBook projects become COWC weddings' },
              { icon: RefreshCw, label: 'Two-way sync', sub: 'Status changes flow between both platforms' },
              { icon: Link2, label: 'No double entry', sub: 'One source of truth for your bookings' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-cowc-cream">
                <Icon className="w-4 h-4 text-cowc-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-cowc-dark">{label}</p>
                  <p className="text-xs text-cowc-gray mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Connected state */}
          {isConnected && !loadingConnection && (
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center justify-between p-3 bg-cowc-cream rounded-xl">
                <div className="flex items-center gap-2 text-sm text-cowc-gray">
                  <Clock className="w-4 h-4" />
                  {hbConnection.last_synced_at
                    ? `Last synced ${new Date(hbConnection.last_synced_at).toLocaleString()}`
                    : 'Never synced — run your first sync below'}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cowc-gold text-white font-semibold text-sm hover:bg-opacity-90 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync Now'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-cowc-gray hover:text-red-500 hover:border-red-200 font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </div>
          )}

          {/* Not connected state */}
          {!isConnected && !loadingConnection && (
            <div className="px-5 pb-5">
              <AnimatePresence>
                {showKeyInput ? (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">
                        Find your API key in HoneyBook under <strong>Settings → Integrations → API</strong>. Keep it private.
                      </p>
                    </div>
                    <input
                      type="password"
                      placeholder="Paste your HoneyBook API key…"
                      value={hbApiKey}
                      onChange={(e) => setHbApiKey(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cowc-gold focus:outline-none text-sm font-mono"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleConnect}
                        disabled={connecting || !hbApiKey.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-cowc-gold text-white font-semibold text-sm hover:bg-opacity-90 transition-all disabled:opacity-50"
                      >
                        {connecting ? 'Connecting…' : 'Connect HoneyBook'}
                      </button>
                      <button
                        onClick={() => { setShowKeyInput(false); setHbApiKey('') }}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-cowc-gray font-semibold text-sm transition-all hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="cta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setShowKeyInput(true)}
                    className="w-full py-3 rounded-xl bg-cowc-dark text-white font-semibold text-sm hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    Connect HoneyBook
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}

          {loadingConnection && (
            <div className="px-5 pb-5">
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          )}
        </motion.div>

        {/* ── Coming Soon ── */}
        <div>
          <p className="text-xs font-semibold text-cowc-gray uppercase tracking-wider mb-3 px-1">More coming soon</p>
          <div className="space-y-3">
            <ComingSoonCard name="Dubsado" description="Sync projects and client info from Dubsado" logo="📋" />
            <ComingSoonCard name="Google Calendar" description="Push wedding dates to your Google Calendar" logo="📅" />
            <ComingSoonCard name="Aisle Planner" description="Import wedding details from Aisle Planner" logo="💒" />
          </div>
        </div>

      </div>
    </div>
  )
}
