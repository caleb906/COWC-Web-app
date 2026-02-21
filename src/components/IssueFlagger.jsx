import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X, ChevronDown, ChevronUp, Copy, Trash2, Check } from 'lucide-react'

const STORAGE_KEY = 'cowc_issue_flags'

export default function IssueFlagger() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [flags, setFlags] = useState([])
  const [copied, setCopied] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setFlags(JSON.parse(saved))
  }, [])

  const save = (updated) => {
    setFlags(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const addFlag = () => {
    if (!note.trim()) return
    const flag = {
      id: Date.now(),
      note: note.trim(),
      page: window.location.pathname,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    save([...flags, flag])
    setNote('')
    setOpen(false)
  }

  const removeFlag = (id) => save(flags.filter(f => f.id !== id))

  const clearAll = () => save([])

  const copyAll = () => {
    const text = flags.map((f, i) =>
      `${i + 1}. [${f.page}] ${f.note} (${f.time})`
    ).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed bottom-6 left-4 z-[9999] flex flex-col items-start gap-2">

      {/* Expanded flag list */}
      <AnimatePresence>
        {expanded && flags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 max-h-80 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-700">{flags.length} Issue{flags.length !== 1 ? 's' : ''} Flagged</span>
              <div className="flex gap-2">
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {flags.map((flag, i) => (
                <div key={flag.id} className="flex items-start gap-2 px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-gray-400 mt-0.5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">{flag.note}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{flag.page} · {flag.time}</p>
                  </div>
                  <button onClick={() => removeFlag(flag.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick note input */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 p-4"
          >
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Flag an issue · <span className="text-gray-400 font-normal normal-case">{window.location.pathname}</span>
            </p>
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addFlag() } }}
              placeholder="Describe the issue..."
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={addFlag}
                disabled={!note.trim()}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add Flag
              </button>
              <button
                onClick={() => { setOpen(false); setNote('') }}
                className="px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button row */}
      <div className="flex items-center gap-2">
        {/* Toggle list button (only shows when there are flags) */}
        {flags.length > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white shadow-lg border border-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
              {flags.length}
            </span>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </motion.button>
        )}

        {/* Flag button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => { setOpen(!open); setExpanded(false) }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            open ? 'bg-gray-700' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {open
            ? <X className="w-5 h-5 text-white" />
            : <Flag className="w-5 h-5 text-white fill-white" />
          }
        </motion.button>
      </div>
    </div>
  )
}
