import { useState, useEffect } from 'react'
import { Eye, Heart, Users, Crown, ChevronDown, X } from 'lucide-react'
import { weddingsAPI } from '../services/unifiedAPI'

/**
 * DevSwitcher — floating panel shown only for test@cowc.dev.
 * Lets the dev account switch between Admin, Coordinator, and Couple views
 * without needing to log out and back in.
 *
 * Sits at z-[9998] (just below the DevPreview banner at 9999).
 * The view it controls is rendered as a fixed full-screen overlay in App.jsx.
 */
export default function DevSwitcher({ viewAs, setViewAs, devWeddingId, setDevWeddingId }) {
  const [expanded, setExpanded] = useState(false)
  const [weddings, setWeddings] = useState([])

  useEffect(() => {
    weddingsAPI.getAll().then(setWeddings).catch(() => {})
  }, [])

  const views = [
    { key: null,          label: 'Admin',       icon: Crown,  desc: "Amanda's view" },
    { key: 'coordinator', label: 'Coordinator', icon: Users,  desc: 'Coordinator view' },
    { key: 'couple',      label: 'Couple',      icon: Heart,  desc: 'Couple dashboard' },
  ]

  const active = views.find(v => v.key === viewAs) ?? views[0]

  return (
    <div className="fixed bottom-6 right-5 z-[9998] flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {expanded && (
        <div
          className="rounded-2xl shadow-2xl p-4 w-64 flex flex-col gap-3"
          style={{ background: '#0f0f1a', border: '1px solid rgba(240,192,64,0.3)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#f0c040' }}>
              Dev View
            </span>
            <button onClick={() => setExpanded(false)} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {views.map(({ key, label, icon: Icon, desc }) => {
            const isActive = viewAs === key
            return (
              <button
                key={String(key)}
                onClick={() => {
                  setViewAs(key)
                  if (key !== 'couple') setDevWeddingId(null)
                  if (key !== 'couple') setExpanded(false)
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all"
                style={
                  isActive
                    ? { background: 'rgba(240,192,64,0.2)', color: '#f0c040' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs opacity-60">{desc}</div>
                </div>
              </button>
            )
          })}

          {/* Wedding picker — only shown when Couple is selected */}
          {viewAs === 'couple' && (
            <div className="pt-1">
              <label className="block text-xs mb-1.5 font-semibold" style={{ color: 'rgba(240,192,64,0.8)' }}>
                Pick a wedding
              </label>
              <select
                value={devWeddingId ?? ''}
                onChange={(e) => {
                  setDevWeddingId(e.target.value || null)
                  if (e.target.value) setExpanded(false)
                }}
                className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(240,192,64,0.3)' }}
              >
                <option value="">Select a wedding…</option>
                {weddings.map(w => (
                  <option key={w.id} value={w.id}>{w.couple_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Toggle pill */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-xs font-bold tracking-wide transition-all hover:scale-105 active:scale-95"
        style={{
          background: expanded ? '#f0c040' : '#0f0f1a',
          color: expanded ? '#0f0f1a' : '#f0c040',
          border: '1px solid rgba(240,192,64,0.5)',
        }}
      >
        <Eye className="w-3.5 h-3.5" />
        DEV
        <active.icon className="w-3 h-3 opacity-70" />
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
