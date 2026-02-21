import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import InternalNotesWidget from './InternalNotesWidget'

export default function AdminNotesScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cowc-cream flex flex-col">
      {/* Back bar */}
      <div className="bg-cowc-dark text-white px-4 pt-12 pb-4 safe-top flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-serif">All Notes</span>
      </div>

      {/* Notes panel takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <InternalNotesWidget compactMode={false} />
      </div>
    </div>
  )
}
