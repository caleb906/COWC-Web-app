/**
 * NoteSheet — coordinator quick-capture + AI review
 *
 * Flow:
 *  1. CAPTURE  — pick wedding (optional), type/record note
 *  2. PROCESS  — spinner while edge functions run
 *  3. REVIEW   — suggestion cards (Apply / Edit / Skip per item)
 *  4. DONE     — brief success flash, then close
 *
 * Props:
 *   open          {bool}    controlled open state
 *   onClose       {fn}      called when sheet should close
 *   weddings      {array}   [{id, couple_name, wedding_date}] — coordinator's weddings
 *   defaultWeddingId {string|null}  pre-select a wedding (e.g. when opened from detail page)
 *   userId        {string}  current user id
 *   onApplied     {fn}      called after suggestions are applied so parent can refresh
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mic, MicOff, Square, ChevronDown,
  Loader2, CheckCircle2, SkipForward, Pencil,
  Store, Clock, ListChecks, RefreshCw,
  CheckCheck, AlertCircle, WifiOff,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL
const PROCESS_FN      = `${SUPABASE_URL}/functions/v1/process-coordinator-note`
const TRANSCRIBE_FN   = `${SUPABASE_URL}/functions/v1/transcribe-audio`
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON_KEY

// Map suggestion type → icon + label
const TYPE_META = {
  vendor:         { Icon: Store,      label: 'Vendor',         color: 'text-purple-600 bg-purple-50',  border: 'border-purple-200' },
  timeline_item:  { Icon: Clock,      label: 'Timeline',       color: 'text-blue-600   bg-blue-50',    border: 'border-blue-200'   },
  task:           { Icon: ListChecks, label: 'Task',           color: 'text-green-600  bg-green-50',   border: 'border-green-200'  },
  wedding_update: { Icon: RefreshCw,  label: 'Wedding Update', color: 'text-amber-600  bg-amber-50',   border: 'border-amber-200'  },
}

const VENDOR_CATEGORIES = [
  'photographer','videographer','florist','dj','caterer',
  'baker','hair_makeup','officiant','venue','transportation','other',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  return { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' }
}

async function applyVendor(weddingId, data) {
  const { error } = await supabase.from('vendors').insert({
    wedding_id:    weddingId,
    name:          data.name,
    category:      data.category,
    cost:          data.cost ?? null,
    phone:         data.phone ?? null,
    contact_email: data.contact_email ?? null,
    website:       data.website ?? null,
    notes:         data.notes ?? null,
    status:        data.status ?? 'considering',
  })
  if (error) throw error
}

async function applyTimelineItem(weddingId, data) {
  // get max sort_order
  const { data: existing } = await supabase
    .from('timeline_items')
    .select('sort_order')
    .eq('wedding_id', weddingId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const nextOrder = (existing?.sort_order ?? 0) + 10

  const { error } = await supabase.from('timeline_items').insert({
    wedding_id:       weddingId,
    title:            data.title,
    time:             data.time ?? null,
    description:      data.description ?? null,
    duration_minutes: data.duration_minutes ?? null,
    sort_order:       nextOrder,
  })
  if (error) throw error
}

async function applyTask(weddingId, userId, data) {
  const { error } = await supabase.from('tasks').insert({
    wedding_id:  weddingId,
    title:       data.title,
    description: data.description ?? null,
    due_date:    data.due_date ?? null,
    assigned_to: data.assigned_to ?? 'coordinator',
    priority:    data.priority ?? 'medium',
    created_by:  userId,
    completed:   false,
  })
  if (error) throw error
}

async function applyWeddingUpdate(weddingId, data) {
  const { error } = await supabase
    .from('weddings')
    .update({ [data.field]: data.value })
    .eq('id', weddingId)
  if (error) throw error
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Editable data field rows shown inside a suggestion card */
function DataField({ label, value, onChange, type = 'text', options }) {
  if (options) {
    return (
      <div className="flex items-start gap-2 py-1">
        <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-1">{label}</span>
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value || null)}
          className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-1">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700 min-w-0"
      />
    </div>
  )
}

/** A single suggestion card in the review phase */
function SuggestionCard({ suggestion, onDecision }) {
  const [editing, setEditing] = useState(false)
  const [data, setData]       = useState({ ...suggestion.data })
  const [decision, setDecision] = useState(null) // 'apply' | 'skip'

  const meta = TYPE_META[suggestion.type] || TYPE_META.task
  const { Icon, label, color, border } = meta

  const setField = (key) => (val) => setData(d => ({ ...d, [key]: val }))

  const handleApply = () => {
    setDecision('apply')
    onDecision('apply', { ...suggestion, data })
  }
  const handleSkip = () => {
    setDecision('skip')
    onDecision('skip', suggestion)
  }

  if (decision === 'skip') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3 opacity-60">
        <SkipForward className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400 line-through">{suggestion.summary}</span>
      </div>
    )
  }

  if (decision === 'apply') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-700 font-medium">{suggestion.summary}</span>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border ${border} bg-white overflow-hidden`}>
      {/* Card header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${color}`}>
              {label}
            </span>
            {suggestion.confidence === 'high'
              ? <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">High confidence</span>
              : <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Medium confidence</span>
            }
          </div>
          <p className="text-sm font-medium text-gray-800 leading-snug">{suggestion.summary}</p>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Editable fields */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-100 space-y-0.5">
              {suggestion.type === 'vendor' && (<>
                <DataField label="Name"     value={data.name}          onChange={setField('name')} />
                <DataField label="Category" value={data.category}      onChange={setField('category')} options={VENDOR_CATEGORIES} />
                <DataField label="Cost"     value={data.cost}          onChange={v => setField('cost')(v ? Number(v) : null)} type="number" />
                <DataField label="Phone"    value={data.phone}         onChange={setField('phone')} />
                <DataField label="Email"    value={data.contact_email} onChange={setField('contact_email')} type="email" />
                <DataField label="Website"  value={data.website}       onChange={setField('website')} />
                <DataField label="Notes"    value={data.notes}         onChange={setField('notes')} />
                <DataField label="Status"   value={data.status}        onChange={setField('status')} options={['confirmed','pending','considering']} />
              </>)}
              {suggestion.type === 'timeline_item' && (<>
                <DataField label="Title"    value={data.title}            onChange={setField('title')} />
                <DataField label="Time"     value={data.time}             onChange={setField('time')} type="time" />
                <DataField label="Duration" value={data.duration_minutes} onChange={v => setField('duration_minutes')(v ? Number(v) : null)} type="number" />
                <DataField label="Notes"    value={data.description}      onChange={setField('description')} />
              </>)}
              {suggestion.type === 'task' && (<>
                <DataField label="Title"    value={data.title}       onChange={setField('title')} />
                <DataField label="Due date" value={data.due_date}    onChange={setField('due_date')} type="date" />
                <DataField label="Assigned" value={data.assigned_to} onChange={setField('assigned_to')} options={['coordinator','couple']} />
                <DataField label="Priority" value={data.priority}    onChange={setField('priority')} options={['high','medium','low']} />
                <DataField label="Notes"    value={data.description} onChange={setField('description')} />
              </>)}
              {suggestion.type === 'wedding_update' && (<>
                <DataField label="Field" value={data.field} onChange={setField('field')} />
                <DataField label="Value" value={String(data.value ?? '')} onChange={setField('value')} />
              </>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action row */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={handleApply}
          className="flex-1 bg-cowc-dark text-white text-sm font-medium py-2 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NoteSheet({ open, onClose, weddings = [], defaultWeddingId = null, userId, onApplied }) {
  // ── Phase state ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('capture') // 'capture' | 'process' | 'review' | 'done'

  // ── Capture state ────────────────────────────────────────────────────────
  const [selectedWeddingId, setSelectedWeddingId] = useState(defaultWeddingId || '')
  const [noteText, setNoteText]                   = useState('')
  const [showWeddingPicker, setShowWeddingPicker] = useState(false)
  const [charCount, setCharCount]                 = useState(0)

  // ── Recording state ──────────────────────────────────────────────────────
  const [recording, setRecording]       = useState(false)
  const [recordSecs, setRecordSecs]     = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [recordError, setRecordError]   = useState(null)
  const mediaRecorder  = useRef(null)
  const audioChunks    = useRef([])
  const recordTimer    = useRef(null)

  // ── Review state ─────────────────────────────────────────────────────────
  const [suggestions, setSuggestions]   = useState([])
  const [noteId, setNoteId]             = useState(null)
  const [applyingIds, setApplyingIds]   = useState(new Set())
  const [appliedCount, setAppliedCount] = useState(0)
  const [applyError, setApplyError]     = useState(null)

  // ── Process error state ──────────────────────────────────────────────────
  const [processError, setProcessError] = useState(null)

  // ── Reset when opened ────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setPhase('capture')
      setSelectedWeddingId(defaultWeddingId || '')
      setNoteText('')
      setCharCount(0)
      setSuggestions([])
      setNoteId(null)
      setAppliedCount(0)
      setApplyError(null)
      setProcessError(null)
      setRecordError(null)
      setRecordSecs(0)
      setShowWeddingPicker(false)
    }
  }, [open, defaultWeddingId])

  // ── Clean up recording if sheet closed mid-record ────────────────────────
  useEffect(() => {
    if (!open && recording) stopRecording(false)
  }, [open]) // eslint-disable-line

  // ── Recording helpers ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setRecordError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorder.current = mr
      audioChunks.current   = []
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mr.start(250)
      setRecording(true)
      setRecordSecs(0)
      recordTimer.current = setInterval(() => setRecordSecs(s => s + 1), 1000)
    } catch (err) {
      setRecordError(err.name === 'NotAllowedError'
        ? 'Microphone access was denied. Please allow mic access and try again.'
        : `Could not start recording: ${err.message}`)
    }
  }, [])

  const stopRecording = useCallback((andTranscribe = true) => {
    clearInterval(recordTimer.current)
    setRecording(false)
    setRecordSecs(0)
    const mr = mediaRecorder.current
    if (!mr) return
    if (andTranscribe) {
      mr.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: mr.mimeType })
        mr.stream?.getTracks().forEach(t => t.stop())
        mediaRecorder.current = null
        setTranscribing(true)
        try {
          const fd = new FormData()
          fd.append('audio', blob, `recording.${mr.mimeType.includes('ogg') ? 'ogg' : 'webm'}`)
          const res = await fetch(TRANSCRIBE_FN, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON}` },
            body: fd,
          })
          const json = await res.json()
          if (!res.ok || json.error) throw new Error(json.error || 'Transcription failed')
          if (json.transcript) {
            setNoteText(prev => {
              const sep = prev.trim() ? '\n\n' : ''
              return prev + sep + json.transcript
            })
            setCharCount(prev => prev + json.transcript.length)
          }
        } catch (err) {
          setRecordError(`Transcription failed: ${err.message}`)
        } finally {
          setTranscribing(false)
        }
      }
      mr.stop()
    } else {
      mr.stream?.getTracks().forEach(t => t.stop())
      if (mr.state !== 'inactive') mr.stop()
      mediaRecorder.current = null
    }
  }, [])

  const formatSecs = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Submit note for extraction ───────────────────────────────────────────
  const handleExtract = async () => {
    if (!noteText.trim()) return
    setPhase('process')
    setProcessError(null)
    try {
      const res = await fetch(PROCESS_FN, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({
          note_text:  noteText.trim(),
          wedding_id: selectedWeddingId || undefined,
          user_id:    userId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Extraction failed')
      setSuggestions(json.suggestions || [])
      setNoteId(json.note_id || null)
      setPhase('review')
    } catch (err) {
      setProcessError(err.message)
    }
  }

  // ── Handle per-suggestion decision ───────────────────────────────────────
  const handleDecision = useCallback(async (action, suggestion) => {
    if (action !== 'apply') return
    if (!selectedWeddingId) {
      setApplyError('Select a wedding first to apply suggestions.')
      return
    }
    const sid = suggestion.id || suggestion.summary
    setApplyingIds(s => new Set([...s, sid]))
    try {
      switch (suggestion.type) {
        case 'vendor':         await applyVendor(selectedWeddingId, suggestion.data);        break
        case 'timeline_item':  await applyTimelineItem(selectedWeddingId, suggestion.data);  break
        case 'task':           await applyTask(selectedWeddingId, userId, suggestion.data);  break
        case 'wedding_update': await applyWeddingUpdate(selectedWeddingId, suggestion.data); break
        default: break
      }
      setAppliedCount(c => c + 1)
    } catch (err) {
      setApplyError(`Failed to apply "${suggestion.summary}": ${err.message}`)
    } finally {
      setApplyingIds(s => { const n = new Set(s); n.delete(sid); return n })
    }
  }, [selectedWeddingId, userId])

  // ── Finish review ─────────────────────────────────────────────────────────
  const handleDone = () => {
    setPhase('done')
    onApplied?.()
    setTimeout(() => onClose(), 1200)
  }

  // ── Wedding picker options ────────────────────────────────────────────────
  const selectedWedding = weddings.find(w => w.id === selectedWeddingId)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => { if (phase !== 'process') onClose() }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* ══ CAPTURE ═══════════════════════════════════════════════════════ */}
            {phase === 'capture' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-cowc-dark">Quick Note</h2>
                    <p className="text-xs text-gray-400">Capture now, apply later</p>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
                  {/* Wedding picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowWeddingPicker(p => !p)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 hover:border-cowc-gold/50 transition-colors"
                    >
                      <span className={`text-sm ${selectedWedding ? 'text-cowc-dark font-medium' : 'text-gray-400'}`}>
                        {selectedWedding ? selectedWedding.couple_name : 'Tag a wedding (optional)'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWeddingPicker ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showWeddingPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-10"
                        >
                          <button
                            onClick={() => { setSelectedWeddingId(''); setShowWeddingPicker(false) }}
                            className="w-full px-4 py-3 text-sm text-gray-400 text-left hover:bg-gray-50 border-b border-gray-100"
                          >
                            — No wedding —
                          </button>
                          <div className="max-h-52 overflow-y-auto">
                            {weddings.length === 0 && (
                              <p className="px-4 py-3 text-sm text-gray-400">No weddings assigned</p>
                            )}
                            {weddings.map(w => (
                              <button
                                key={w.id}
                                onClick={() => { setSelectedWeddingId(w.id); setShowWeddingPicker(false) }}
                                className={`w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center justify-between ${
                                  selectedWeddingId === w.id ? 'bg-cowc-gold/10 text-cowc-dark font-medium' : 'text-gray-700'
                                }`}
                              >
                                <span>{w.couple_name}</span>
                                {w.wedding_date && (
                                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                    {new Date(w.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      value={noteText}
                      onChange={e => { setNoteText(e.target.value); setCharCount(e.target.value.length) }}
                      placeholder="Vendor names, timeline changes, guest count updates, tasks to add... jot it all down."
                      rows={8}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-cowc-dark placeholder-gray-400 resize-none focus:outline-none focus:border-cowc-gold/60 focus:ring-2 focus:ring-cowc-gold/20"
                    />
                    <span className="absolute bottom-3 right-3 text-[10px] text-gray-300">{charCount}</span>
                  </div>

                  {/* Record errors */}
                  {recordError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                      <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{recordError}</p>
                    </div>
                  )}

                  {/* Record strip */}
                  <div className="flex items-center gap-3">
                    {recording ? (
                      <>
                        <button
                          onClick={() => stopRecording(true)}
                          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-red-600 transition-colors"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          Stop & Transcribe
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-mono text-gray-600">{formatSecs(recordSecs)}</span>
                        </div>
                      </>
                    ) : transcribing ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin text-cowc-gold" />
                        Transcribing…
                      </div>
                    ) : (
                      <button
                        onClick={startRecording}
                        className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                      >
                        <Mic className="w-4 h-4" />
                        Record audio
                      </button>
                    )}
                    <span className="text-xs text-gray-400">Transcription only — audio is never saved</span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-gray-100">
                  <button
                    onClick={handleExtract}
                    disabled={!noteText.trim() || recording || transcribing}
                    className="w-full bg-cowc-dark text-white py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                  >
                    Extract &amp; Review →
                  </button>
                </div>
              </div>
            )}

            {/* ══ PROCESS ═══════════════════════════════════════════════════════ */}
            {phase === 'process' && (
              <div className="flex flex-col flex-1 items-center justify-center px-8 pb-16 gap-5">
                {processError ? (
                  <>
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-cowc-dark mb-1">Extraction failed</p>
                      <p className="text-sm text-gray-500">{processError}</p>
                    </div>
                    <button
                      onClick={() => setPhase('capture')}
                      className="bg-cowc-dark text-white px-6 py-2.5 rounded-xl text-sm font-medium"
                    >
                      Back to note
                    </button>
                  </>
                ) : (
                  <>
                    <div className="relative w-16 h-16">
                      <div className="w-16 h-16 border-4 border-cowc-gold/30 border-t-cowc-gold rounded-full animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-cowc-dark mb-1">Reading your note…</p>
                      <p className="text-sm text-gray-400">AI is extracting suggestions</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ REVIEW ════════════════════════════════════════════════════════ */}
            {phase === 'review' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-cowc-dark">Review Suggestions</h2>
                    <p className="text-xs text-gray-400">
                      {suggestions.length === 0 ? 'Nothing actionable found' : `${suggestions.length} item${suggestions.length > 1 ? 's' : ''} found${selectedWedding ? ` for ${selectedWedding.couple_name}` : ''}`}
                    </p>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* No wedding warning */}
                {!selectedWeddingId && suggestions.length > 0 && (
                  <div className="mx-5 mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Select a wedding above to apply suggestions to the right place.</p>
                  </div>
                )}

                {/* Wedding re-picker (compact) */}
                {suggestions.length > 0 && (
                  <div className="px-5 mb-3 flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={() => setShowWeddingPicker(p => !p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-cowc-gold/50 transition-colors"
                      >
                        <span className={`text-sm ${selectedWedding ? 'text-cowc-dark font-medium' : 'text-gray-400'}`}>
                          {selectedWedding ? selectedWedding.couple_name : 'Select wedding'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWeddingPicker ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showWeddingPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-10"
                          >
                            <button
                              onClick={() => { setSelectedWeddingId(''); setShowWeddingPicker(false) }}
                              className="w-full px-4 py-3 text-sm text-gray-400 text-left hover:bg-gray-50 border-b border-gray-100"
                            >
                              — No wedding —
                            </button>
                            <div className="max-h-48 overflow-y-auto">
                              {weddings.map(w => (
                                <button
                                  key={w.id}
                                  onClick={() => { setSelectedWeddingId(w.id); setShowWeddingPicker(false) }}
                                  className={`w-full px-4 py-3 text-sm text-left hover:bg-gray-50 flex items-center justify-between ${
                                    selectedWeddingId === w.id ? 'bg-cowc-gold/10 text-cowc-dark font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  <span>{w.couple_name}</span>
                                  {w.wedding_date && (
                                    <span className="text-xs text-gray-400 ml-2">
                                      {new Date(w.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Apply error */}
                {applyError && (
                  <div className="mx-5 mb-2 flex-shrink-0">
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{applyError}</p>
                      <button onClick={() => setApplyError(null)} className="ml-auto text-red-300 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggestion cards */}
                <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
                  {suggestions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Nothing actionable found</p>
                      <p className="text-xs text-gray-400 mt-1">The note was saved. Try adding more specific details next time.</p>
                    </div>
                  ) : (
                    suggestions.map((s, i) => (
                      <SuggestionCard
                        key={i}
                        suggestion={{ ...s, id: `${s.type}-${i}` }}
                        onDecision={handleDecision}
                      />
                    ))
                  )}
                </div>

                {/* Done button */}
                <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-gray-100">
                  {appliedCount > 0 && (
                    <p className="text-center text-xs text-green-600 mb-2">
                      {appliedCount} item{appliedCount > 1 ? 's' : ''} applied ✓
                    </p>
                  )}
                  <button
                    onClick={handleDone}
                    className="w-full bg-cowc-dark text-white py-3.5 rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    {appliedCount > 0 ? 'Done — view changes' : 'Done'}
                  </button>
                </div>
              </div>
            )}

            {/* ══ DONE ══════════════════════════════════════════════════════════ */}
            {phase === 'done' && (
              <div className="flex flex-col flex-1 items-center justify-center pb-16 gap-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14 }}
                  className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center"
                >
                  <CheckCheck className="w-8 h-8 text-green-500" />
                </motion.div>
                <p className="font-medium text-cowc-dark">Applied!</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
