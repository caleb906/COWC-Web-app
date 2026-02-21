import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  StickyNote, Plus, X, Save, Search, Calendar, Tag,
  Trash2, Eye, EyeOff, Lock, Users, Link2, ChevronDown,
  Loader2, CheckCircle2, Clock
} from 'lucide-react'
import { formatDate } from '../utils/dates'
import { useAuthStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import { weddingsAPI } from '../services/unifiedAPI'
import { useToast } from './Toast'

// ── localStorage draft helpers ───────────────────────────────────────────────
const DRAFT_KEY = (userId) => `cowc_note_draft_${userId || 'guest'}`

const saveDraft = (draft, userId) => {
  try { localStorage.setItem(DRAFT_KEY(userId), JSON.stringify(draft)) } catch {}
}
const loadDraft = (userId) => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(userId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
const clearDraft = (userId) => {
  try { localStorage.removeItem(DRAFT_KEY(userId)) } catch {}
}

const BLANK_NOTE = {
  title: '',
  content: '',
  tags: '',
  wedding_id: '',
  visible_to_couple: false,
}

// ── NoteCard ─────────────────────────────────────────────────────────────────
function NoteCard({ note, weddings, onDelete, onToggleVisibility }) {
  const weddingName = weddings.find(w => w.id === note.wedding_id)?.couple_name

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-l-4 p-4 shadow-sm transition-all ${
        note.visible_to_couple
          ? 'bg-emerald-50 border-emerald-400'
          : 'bg-amber-50 border-amber-400'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h4 className="font-semibold text-cowc-dark truncate">{note.title}</h4>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleVisibility(note)}
            title={note.visible_to_couple ? 'Shared with couple — click to make private' : 'Private — click to share with couple'}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
              note.visible_to_couple
                ? 'bg-emerald-200 text-emerald-700 hover:bg-emerald-300'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            {note.visible_to_couple
              ? <><Users className="w-3 h-3" />Shared</>
              : <><Lock className="w-3 h-3" />Private</>
            }
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 text-cowc-gray hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-cowc-dark whitespace-pre-wrap leading-relaxed">{note.content}</p>

      {weddingName && (
        <div className="flex items-center gap-1 mt-2 text-xs text-cowc-gold font-semibold">
          <Link2 className="w-3 h-3" />
          {weddingName}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1 text-xs text-cowc-gray">
          <Clock className="w-3 h-3" />
          <span>{formatDate(note.updated_at || note.created_at)}</span>
        </div>
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-xs font-semibold">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── NewNoteForm ───────────────────────────────────────────────────────────────
function NewNoteForm({ weddings, onSave, onCancel, defaultWeddingId, userId }) {
  const [form, setForm] = useState(() => {
    const draft = loadDraft(userId)
    return draft || { ...BLANK_NOTE, wedding_id: defaultWeddingId || '' }
  })
  const [saving, setSaving] = useState(false)
  const contentRef = useRef()
  const toast = useToast()

  // Auto-save draft to localStorage on every keystroke
  useEffect(() => {
    if (form.title || form.content) {
      saveDraft(form, userId)
    }
  }, [form, userId])

  // Focus the content textarea on mount
  useEffect(() => {
    setTimeout(() => contentRef.current?.focus(), 100)
  }, [])

  const handleSave = async () => {
    if (!form.content.trim() && !form.title.trim()) return
    setSaving(true)
    try {
      const autoTitle = form.title.trim() ||
        form.content.trim().split(/\s+/).slice(0, 6).join(' ') ||
        'Untitled'
      await onSave({
        title: autoTitle,
        content: form.content.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        wedding_id: form.wedding_id || null,
        visible_to_couple: form.visible_to_couple,
      })
      clearDraft(userId)
    } catch (err) {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if ((form.title || form.content) && !confirm('Discard this note?')) return
    clearDraft(userId)
    onCancel()
  }

  const hasDraft = loadDraft(userId) !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border-b bg-cowc-cream flex-shrink-0"
    >
      {hasDraft && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Draft auto-saved
        </div>
      )}

      <input
        type="text"
        placeholder="Title (optional)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full px-3 py-2 rounded-lg border border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2 text-sm"
      />
      <textarea
        ref={contentRef}
        placeholder="Notes from the call, meeting, or email..."
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        className="w-full px-3 py-2 rounded-lg border border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2 min-h-[100px] resize-none text-sm"
      />
      <input
        type="text"
        placeholder="Tags (comma separated: call, venue, flowers)"
        value={form.tags}
        onChange={(e) => setForm({ ...form, tags: e.target.value })}
        className="w-full px-3 py-2 rounded-lg border border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2 text-sm"
      />

      {/* Link to couple */}
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-4 h-4 text-cowc-gray flex-shrink-0" />
        <select
          value={form.wedding_id}
          onChange={(e) => setForm({ ...form, wedding_id: e.target.value })}
          className="flex-1 px-3 py-2 rounded-lg border border-cowc-sand focus:border-cowc-gold focus:outline-none text-sm text-cowc-dark"
        >
          <option value="">Tag a couple (optional)</option>
          {weddings.map(w => (
            <option key={w.id} value={w.id}>{w.couple_name}</option>
          ))}
        </select>
      </div>

      {/* Private / Shared toggle */}
      <button
        type="button"
        onClick={() => setForm({ ...form, visible_to_couple: !form.visible_to_couple })}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold border-2 transition-all mb-3 ${
          form.visible_to_couple
            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
            : 'border-cowc-sand bg-white text-cowc-gray hover:border-gray-300'
        }`}
      >
        {form.visible_to_couple
          ? <><Users className="w-4 h-4" /> Shared with Couple's Profile</>
          : <><Lock className="w-4 h-4" /> Private (Internal Only)</>
        }
      </button>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || (!form.content.trim() && !form.title.trim())}
          className="flex-1 py-2 bg-cowc-gold text-white rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Note
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-200 text-cowc-dark rounded-lg font-semibold hover:bg-gray-300 transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

// ── InternalNotesPanel ────────────────────────────────────────────────────────
function InternalNotesPanel({
  notes,
  weddings,
  loading,
  onClose,
  onCreateNote,
  onDeleteNote,
  onToggleVisibility,
  defaultWeddingId,
  userId,
  filterWeddingId,
  setFilterWeddingId,
  searchQuery,
  setSearchQuery,
}) {
  const [isCreating, setIsCreating] = useState(false)

  // Auto-open create form if there's a saved draft
  useEffect(() => {
    const draft = loadDraft(userId)
    if (draft && (draft.title || draft.content)) setIsCreating(true)
  }, [userId])

  const handleSave = async (noteData) => {
    await onCreateNote(noteData)
    setIsCreating(false)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-cowc-dark text-white p-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <StickyNote className="w-5 h-5" />
            <h2 className="text-xl font-serif">Notes</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
          />
        </div>
        {/* Couple filter (when not already scoped) */}
        {!defaultWeddingId && weddings.length > 0 && (
          <select
            value={filterWeddingId}
            onChange={(e) => setFilterWeddingId(e.target.value)}
            className="mt-2 w-full px-3 py-1.5 text-sm rounded-lg bg-white/10 text-white/80 focus:bg-white/20 focus:outline-none border border-white/20"
          >
            <option value="">All couples</option>
            {weddings.map(w => (
              <option key={w.id} value={w.id}>{w.couple_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* New Note */}
      {!isCreating && (
        <div className="p-3 border-b flex-shrink-0">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full py-2.5 bg-cowc-gold text-white rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Quick Note
          </button>
        </div>
      )}

      <AnimatePresence>
        {isCreating && (
          <NewNoteForm
            weddings={weddings}
            onSave={handleSave}
            onCancel={() => setIsCreating(false)}
            defaultWeddingId={defaultWeddingId}
            userId={userId}
          />
        )}
      </AnimatePresence>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-cowc-gold animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote className="w-12 h-12 text-cowc-light-gray mx-auto mb-3" />
            <p className="text-cowc-gray text-sm">No notes yet</p>
            <p className="text-xs text-cowc-light-gray mt-1">
              Add a quick note after a call or meeting
            </p>
          </div>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              weddings={weddings}
              onDelete={onDeleteNote}
              onToggleVisibility={onToggleVisibility}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function InternalNotesWidget({
  compactMode = false,
  weddingId = null,   // when used inside a wedding detail page
}) {
  const { user } = useAuthStore()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [weddings, setWeddings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterWeddingId, setFilterWeddingId] = useState(weddingId || '')

  useEffect(() => {
    loadWeddings()
  }, [])

  useEffect(() => {
    if (!compactMode || isOpen) loadNotes()
  }, [isOpen, user, filterWeddingId])

  const loadWeddings = async () => {
    try {
      const all = await weddingsAPI.getAll()
      setWeddings(all.map(w => ({ id: w.id, couple_name: w.couple_name })))
    } catch {}
  }

  const loadNotes = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('internal_notes')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (filterWeddingId) {
        query = query.eq('wedding_id', filterWeddingId)
      } else if (weddingId) {
        query = query.eq('wedding_id', weddingId)
      }

      const { data, error } = await query
      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async (noteData) => {
    const { data, error } = await supabase
      .from('internal_notes')
      .insert({
        ...noteData,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    setNotes(prev => [data, ...prev])
    toast.success('Note saved!')
  }

  const handleDeleteNote = async (id) => {
    if (!confirm('Delete this note?')) return
    const { error } = await supabase
      .from('internal_notes')
      .delete()
      .eq('id', id)

    if (error) { toast.error('Failed to delete note'); return }
    setNotes(prev => prev.filter(n => n.id !== id))
    toast.success('Note deleted')
  }

  const handleToggleVisibility = async (note) => {
    const newVal = !note.visible_to_couple
    const { error } = await supabase
      .from('internal_notes')
      .update({ visible_to_couple: newVal, updated_at: new Date().toISOString() })
      .eq('id', note.id)

    if (error) { toast.error('Failed to update note'); return }
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, visible_to_couple: newVal } : n))
    toast.success(newVal ? 'Note shared with couple' : 'Note is now private')
  }

  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase()
    return (
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.tags?.some(t => t.toLowerCase().includes(q))
    )
  })

  const panelProps = {
    notes: filteredNotes,
    weddings,
    loading,
    onCreateNote: handleCreateNote,
    onDeleteNote: handleDeleteNote,
    onToggleVisibility: handleToggleVisibility,
    defaultWeddingId: weddingId,
    userId: user?.id,
    filterWeddingId,
    setFilterWeddingId,
    searchQuery,
    setSearchQuery,
  }

  if (!compactMode) {
    return (
      <div className="h-full">
        <InternalNotesPanel {...panelProps} />
      </div>
    )
  }

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-cowc-gold text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <StickyNote className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[440px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <InternalNotesPanel {...panelProps} onClose={() => setIsOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
