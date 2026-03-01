/**
 * NoteSheet — coordinator quick-capture + AI extraction
 *
 * Clean, minimal bottom drawer. Type or speak a note, hit Submit.
 * AI suggestions appear inline as small chips — tap to apply, swipe to skip.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mic, Square, ChevronDown,
  Store, Clock, ListChecks, RefreshCw,
  CheckCircle2, WifiOff, Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const PROCESS_FN    = `${SUPABASE_URL}/functions/v1/process-coordinator-note`
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null

const TYPE_META = {
  vendor:         { Icon: Store,      label: 'Vendor',   dot: 'bg-purple-400' },
  timeline_item:  { Icon: Clock,      label: 'Timeline', dot: 'bg-blue-400'   },
  task:           { Icon: ListChecks, label: 'Task',     dot: 'bg-green-400'  },
  wedding_update: { Icon: RefreshCw,  label: 'Update',   dot: 'bg-amber-400'  },
}

function authHeaders() {
  return { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' }
}

// ─── Apply helpers ────────────────────────────────────────────────────────────

async function applyVendor(weddingId, d) {
  const { error } = await supabase.from('vendors').insert({
    wedding_id: weddingId, name: d.name, category: d.category,
    cost: d.cost ?? null, phone: d.phone ?? null,
    contact_email: d.contact_email ?? null, notes: d.notes ?? null,
    status: d.status ?? 'considering',
  })
  if (error) throw error
}

async function applyTimelineItem(weddingId, d) {
  const { data: ex } = await supabase
    .from('timeline_items').select('sort_order')
    .eq('wedding_id', weddingId).order('sort_order', { ascending: false }).limit(1).single()
  const { error } = await supabase.from('timeline_items').insert({
    wedding_id: weddingId, event_name: d.event_name ?? d.title,
    event_time: d.event_time ?? d.time ?? null,
    sort_order: (ex?.sort_order ?? 0) + 10, notes: d.notes ?? null,
  })
  if (error) throw error
}

async function applyTask(weddingId, userId, d) {
  const { error } = await supabase.from('tasks').insert({
    wedding_id: weddingId, title: d.title,
    due_date: d.due_date ?? null, priority: d.priority ?? 'medium',
    assigned_to: 'coordinator', assigned_user_id: userId,
    notes: d.notes ?? null, completed: false,
  })
  if (error) throw error
}

async function applyWeddingUpdate(weddingId, d) {
  const updates = {}
  if (d.venue_name)    updates.venue_name    = d.venue_name
  if (d.wedding_date)  updates.wedding_date  = d.wedding_date
  if (d.guest_count)   updates.guest_count   = d.guest_count
  if (d.notes)         updates.notes         = d.notes
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('weddings').update(updates).eq('id', weddingId)
    if (error) throw error
  }
}

// ─── Suggestion chip ─────────────────────────────────────────────────────────

function SuggestionChip({ s, weddingId, userId, onApplied, onSkip }) {
  const [state, setState] = useState('idle') // idle | applying | done | error
  const meta = TYPE_META[s.type] || TYPE_META.task

  const apply = async () => {
    if (!weddingId || state !== 'idle') return
    setState('applying')
    try {
      if (s.type === 'vendor')         await applyVendor(weddingId, s.data)
      else if (s.type === 'timeline_item') await applyTimelineItem(weddingId, s.data)
      else if (s.type === 'task')      await applyTask(weddingId, userId, s.data)
      else if (s.type === 'wedding_update') await applyWeddingUpdate(weddingId, s.data)
      setState('done')
      setTimeout(() => onApplied?.(), 600)
    } catch {
      setState('error')
    }
  }

  const label = s.data?.name || s.data?.title || s.data?.event_name || s.data?.venue_name || meta.label

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
        state === 'done'    ? 'bg-green-50 border-green-200' :
        state === 'error'   ? 'bg-red-50 border-red-200' :
        state === 'applying'? 'bg-gray-50 border-gray-200 opacity-60' :
                              'bg-white border-gray-200'
      }`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
      <span className="flex-1 text-xs font-medium text-gray-700 truncate">{label}</span>
      <span className="text-[10px] text-gray-400 flex-shrink-0">{meta.label}</span>
      {state === 'idle' && (
        <>
          <button
            onClick={apply}
            className="ml-1 px-2 py-0.5 rounded-lg bg-cowc-gold/10 text-cowc-gold text-[10px] font-bold hover:bg-cowc-gold/20 transition-colors"
          >
            Add
          </button>
          <button onClick={onSkip} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </>
      )}
      {state === 'applying' && <Loader2 className="w-3 h-3 text-gray-400 animate-spin flex-shrink-0" />}
      {state === 'done'     && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
      {state === 'error'    && <span className="text-[10px] text-red-500">failed</span>}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NoteSheet({ open, onClose, weddings = [], defaultWeddingId, userId, onApplied }) {
  const [weddingId, setWeddingId]     = useState(defaultWeddingId || '')
  const [noteText, setNoteText]       = useState('')
  const [recording, setRecording]     = useState(false)
  const [recordSecs, setRecordSecs]   = useState(0)
  const [recordError, setRecordError] = useState(null)
  const [processing, setProcessing]   = useState(false)
  const [suggestions, setSuggestions] = useState([])   // array of {id, type, data}
  const [skipped, setSkipped]         = useState([])
  const [weddingOpen, setWeddingOpen] = useState(false)

  const recognitionRef = useRef(null)
  const recordTimer    = useRef(null)
  const sheetRef       = useRef(null)

  // Sync defaultWeddingId when it changes (e.g. opened from detail page)
  useEffect(() => {
    if (defaultWeddingId) setWeddingId(defaultWeddingId)
  }, [defaultWeddingId])

  // Reset when opened
  useEffect(() => {
    if (open) {
      setNoteText('')
      setSuggestions([])
      setSkipped([])
      setRecordError(null)
      setProcessing(false)
      if (!defaultWeddingId && weddings.length === 1) setWeddingId(weddings[0].id)
    } else {
      stopRecording()
    }
  }, [open])

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (sheetRef.current && !sheetRef.current.contains(e.target)) onClose()
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      setRecordError('Speech recognition not supported. Try Chrome or Edge.')
      return
    }
    setRecordError(null)
    const sr = new SpeechRecognition()
    sr.continuous = true
    sr.interimResults = true
    sr.lang = 'en-US'
    sr.onresult = (e) => {
      let chunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript + ' '
      }
      if (chunk) setNoteText(prev => prev + (prev.trim() ? ' ' : '') + chunk.trim())
    }
    sr.onend = () => {
      if (recognitionRef.current) {
        try { sr.start() } catch (_) {}
      }
    }
    sr.onerror = (e) => {
      if (e.error !== 'aborted') setRecordError('Mic error — please try again')
      stopRecording()
    }
    recognitionRef.current = sr
    sr.start()
    setRecording(true)
    setRecordSecs(0)
    recordTimer.current = setInterval(() => setRecordSecs(s => s + 1), 1000)
  }, [])

  const stopRecording = useCallback(() => {
    clearInterval(recordTimer.current)
    setRecording(false)
    setRecordSecs(0)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
  }, [])

  const toggleRecording = () => recording ? stopRecording() : startRecording()

  const fmtSecs = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!noteText.trim() || processing) return
    setProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || SUPABASE_ANON
      const res = await fetch(PROCESS_FN, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText.trim(), wedding_id: weddingId || null, coordinator_id: userId }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const raw = json.suggestions || []
      setSuggestions(raw.map((s, i) => ({ ...s, id: `${i}-${Date.now()}` })))
      if (raw.length === 0) {
        // No suggestions — just close after a beat
        setTimeout(() => { onApplied?.(); onClose() }, 800)
      }
    } catch (e) {
      console.error('Note processing error:', e)
      // Still close gracefully — the raw note was captured
      setTimeout(() => onClose(), 600)
    } finally {
      setProcessing(false)
    }
  }

  const visibleSuggestions = suggestions.filter(s => !skipped.includes(s.id))
  const selectedWedding = weddings.find(w => w.id === weddingId)
  const canSubmit = noteText.trim().length > 0 && !processing

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdrop}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full bg-white rounded-t-3xl shadow-2xl px-4 pt-4 pb-8 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Quick Note</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Wedding picker (compact) */}
            {weddings.length > 1 && (
              <div className="relative mb-3">
                <button
                  onClick={() => setWeddingOpen(o => !o)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-left"
                >
                  <span className="flex-1 truncate text-gray-700 font-medium">
                    {selectedWedding?.couple_name || 'Select wedding (optional)'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${weddingOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {weddingOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto"
                    >
                      <button
                        onClick={() => { setWeddingId(''); setWeddingOpen(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
                      >
                        No specific wedding
                      </button>
                      {weddings.map(w => (
                        <button
                          key={w.id}
                          onClick={() => { setWeddingId(w.id); setWeddingOpen(false) }}
                          className={`w-full text-left px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${w.id === weddingId ? 'text-cowc-gold' : 'text-gray-800'}`}
                        >
                          {w.couple_name}
                          {w.wedding_date && (
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(w.wedding_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Note textarea */}
            <div className="relative mb-3">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={recording ? 'Listening…' : 'Type a note or tap the mic to speak…'}
                rows={4}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm resize-none outline-none transition-colors ${
                  recording ? 'border-cowc-gold/60 bg-cowc-gold/5' : 'border-gray-200 bg-gray-50 focus:border-cowc-gold/40 focus:bg-white'
                }`}
              />
              {recording && (
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-red-500 font-medium">{fmtSecs(recordSecs)}</span>
                </div>
              )}
            </div>

            {recordError && (
              <div className="flex items-center gap-2 mb-3 text-xs text-red-500">
                <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                {recordError}
              </div>
            )}

            {/* Action row */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  recording
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {recording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {recording ? 'Stop' : 'Speak'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-cowc-gold text-white text-xs font-bold disabled:opacity-40 transition-opacity"
              >
                {processing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                ) : (
                  'Submit Note'
                )}
              </button>
            </div>

            {/* Suggestions */}
            <AnimatePresence mode="popLayout">
              {visibleSuggestions.length > 0 && (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    AI Suggestions — tap Add to apply
                  </p>
                  <div className="flex flex-col gap-2">
                    <AnimatePresence mode="popLayout">
                      {visibleSuggestions.map(s => (
                        <SuggestionChip
                          key={s.id}
                          s={s}
                          weddingId={weddingId}
                          userId={userId}
                          onApplied={() => {
                            onApplied?.()
                            setSkipped(prev => [...prev, s.id])
                          }}
                          onSkip={() => setSkipped(prev => [...prev, s.id])}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                  {visibleSuggestions.length > 0 && (
                    <button
                      onClick={() => { setSkipped(suggestions.map(s => s.id)); onClose() }}
                      className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
                    >
                      Dismiss all & close
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
