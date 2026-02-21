import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Eye, X, Users, Heart, Crown } from 'lucide-react'
import CoupleDashboard from './CoupleDashboard'
import CoordinatorDashboard from './CoordinatorDashboard'
import AdminDashboard from './AdminDashboard'

/**
 * DevPreview — admin-only route (opens in new tab) that lets you switch
 * between Couple, Coordinator, and Admin (Amanda) views for a given wedding.
 *
 * Route: /admin/preview/couple/:id
 */

const VIEWS = [
  { key: 'couple',      label: 'Couple',      icon: Heart,  hint: 'What the couple sees' },
  { key: 'coordinator', label: 'Coordinator', icon: Users,  hint: 'Coordinator dashboard' },
  { key: 'admin',       label: 'Admin',       icon: Crown,  hint: "Amanda's full admin view" },
]

export default function DevPreview() {
  const { id } = useParams()
  const [activeView, setActiveView] = useState('couple')

  return (
    <div className="relative">
      {/* ── Sticky dev banner ──────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 gap-4"
        style={{ background: '#0f0f1a', borderBottom: '1px solid rgba(240,192,64,0.3)' }}
      >
        {/* Left: label */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ color: '#f0c040' }}>
          <Eye className="w-3.5 h-3.5" />
          <span className="text-xs font-bold tracking-wide">DEV PREVIEW</span>
        </div>

        {/* Centre: view switcher */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {VIEWS.map(({ key, label, icon: Icon }) => {
            const active = activeView === key
            return (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                title={VIEWS.find(v => v.key === key)?.hint}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all"
                style={
                  active
                    ? { background: 'rgba(240,192,64,0.25)', color: '#f0c040' }
                    : { color: 'rgba(255,255,255,0.45)' }
                }
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: close */}
        <button
          onClick={() => window.close()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 flex-shrink-0"
          style={{ background: 'rgba(240,192,64,0.15)', color: '#f0c040' }}
        >
          <X className="w-3 h-3" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* ── View content ──────────────────────────────── */}
      <div className="pt-9">
        {activeView === 'couple' && (
          <CoupleDashboard previewWeddingId={id} isPreview />
        )}
        {activeView === 'coordinator' && (
          <CoordinatorDashboard />
        )}
        {activeView === 'admin' && (
          <AdminDashboard />
        )}
      </div>
    </div>
  )
}
