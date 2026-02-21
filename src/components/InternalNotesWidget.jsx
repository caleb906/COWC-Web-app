import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  StickyNote, Plus, X, Save, Search, Calendar, Tag,
  ChevronDown, Trash2, Edit
} from 'lucide-react'
import { formatDate } from '../utils/dates'
import { useAuthStore } from '../stores/appStore'
import { weddingsAPI } from '../services/unifiedAPI'

// This would be stored in database - using localStorage for now
const getNotesFromStorage = (userId) => {
  try {
    const key = userId ? `cowc_notes_${userId}` : 'cowc_notes_guest'
    const notes = localStorage.getItem(key)
    return notes ? JSON.parse(notes) : []
  } catch {
    return []
  }
}

const saveNotesToStorage = (notes, userId) => {
  const key = userId ? `cowc_notes_${userId}` : 'cowc_notes_guest'
  localStorage.setItem(key, JSON.stringify(notes))
}

export default function InternalNotesWidget({ compactMode = false }) {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [weddings, setWeddings] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: '',
    wedding_id: '',
    shared_with_amanda: false,
  })

  useEffect(() => {
    loadNotes()
    loadWeddings()
  }, [user])

  const loadWeddings = async () => {
    try {
      const allWeddings = await weddingsAPI.getAll()
      setWeddings(allWeddings.map(w => ({ id: w.id, couple_name: w.couple_name })))
    } catch (error) {
      // Non-critical - notes still work without wedding links
    }
  }

  const loadNotes = () => {
    const savedNotes = getNotesFromStorage(user?.id)
    setNotes(savedNotes)
  }

  const handleCreateNote = () => {
    if (!newNote.title.trim() && !newNote.content.trim()) return

    const note = {
      id: `note_${Date.now()}`,
      ...newNote,
      tags: newNote.tags.split(',').map(t => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updatedNotes = [note, ...notes]
    setNotes(updatedNotes)
    saveNotesToStorage(updatedNotes, user?.id)

    setNewNote({ title: '', content: '', tags: '', wedding_id: '', shared_with_amanda: false })
    setIsCreating(false)
  }

  const handleDeleteNote = (id) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    const updatedNotes = notes.filter(n => n.id !== id)
    setNotes(updatedNotes)
    saveNotesToStorage(updatedNotes, user?.id)
  }

  const filteredNotes = notes.filter(note =>
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (compactMode) {
    // Floating button mode for dashboard
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
                className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
              >
                <InternalNotesPanel
                  notes={filteredNotes}
                  weddings={weddings}
                  onClose={() => setIsOpen(false)}
                  onCreate={handleCreateNote}
                  onDelete={handleDeleteNote}
                  newNote={newNote}
                  setNewNote={setNewNote}
                  isCreating={isCreating}
                  setIsCreating={setIsCreating}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Full page mode
  return (
    <div className="max-w-5xl mx-auto">
      <InternalNotesPanel
        notes={filteredNotes}
        weddings={weddings}
        onCreate={handleCreateNote}
        onDelete={handleDeleteNote}
        newNote={newNote}
        setNewNote={setNewNote}
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  )
}

function InternalNotesPanel({
  notes,
  weddings = [],
  onClose,
  onCreate,
  onDelete,
  newNote,
  setNewNote,
  isCreating,
  setIsCreating,
  searchQuery,
  setSearchQuery
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-cowc-dark text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StickyNote className="w-6 h-6" />
            <h2 className="text-2xl font-serif">Internal Notes</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 focus:bg-white/20 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* New Note Button */}
      {!isCreating && (
        <div className="p-4 border-b flex-shrink-0">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full py-3 bg-cowc-gold text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Quick Note
          </button>
        </div>
      )}

      {/* Create Note Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b bg-cowc-cream flex-shrink-0"
        >
          <input
            type="text"
            placeholder="Title (optional)"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border-2 border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2"
          />
          <textarea
            placeholder="What did they say? Any important details..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border-2 border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2 min-h-[100px] resize-none"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={newNote.tags}
            onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border-2 border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2"
          />
          <select
            value={newNote.wedding_id}
            onChange={(e) => setNewNote({ ...newNote, wedding_id: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border-2 border-cowc-sand focus:border-cowc-gold focus:outline-none mb-2 text-cowc-dark"
          >
            <option value="">Link to wedding (optional)</option>
            {weddings.map(w => (
              <option key={w.id} value={w.id}>{w.couple_name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 mb-3 text-sm text-cowc-gray cursor-pointer">
            <input
              type="checkbox"
              checked={newNote.shared_with_amanda}
              onChange={(e) => setNewNote({ ...newNote, shared_with_amanda: e.target.checked })}
              className="w-4 h-4 text-cowc-gold focus:ring-cowc-gold rounded"
            />
            <span>Share with Amanda</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={onCreate}
              className="flex-1 py-2 bg-cowc-gold text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Note
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewNote({ title: '', content: '', tags: '', wedding_id: '', shared_with_amanda: false })
              }}
              className="px-4 py-2 bg-gray-200 text-cowc-dark rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {note.title && (
              <h4 className="font-semibold text-cowc-dark mb-2">{note.title}</h4>
            )}
            <p className="text-sm text-cowc-gray mb-3 whitespace-pre-wrap">{note.content}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-cowc-gray">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(note.created_at, 'MMM d, h:mm a')}</span>
              </div>
              
              <button
                onClick={() => onDelete(note.id)}
                className="p-1 text-cowc-gray hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {note.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {notes.length === 0 && (
          <div className="text-center py-12">
            <StickyNote className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
            <p className="text-cowc-gray">No notes yet</p>
            <p className="text-sm text-cowc-light-gray mt-2">
              Create a quick note during calls or meetings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
