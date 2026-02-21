import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Search, ExternalLink, ChevronDown } from 'lucide-react'
import { useToast } from './Toast'
import { tasksAPI, vendorsAPI, timelineAPI } from '../services/unifiedAPI'

// Timeline preset packages
const TIMELINE_PRESETS = {
  'Getting Ready': [
    { title: 'Hair & Makeup Begins', time: '09:00', description: 'Bridal party getting ready', order: 1 },
    { title: 'Bride Gets Ready', time: '11:00', description: 'Bride hair & makeup', order: 2 },
    { title: 'Getting Ready Photos', time: '12:00', description: 'Photographer captures getting-ready moments', order: 3 },
    { title: 'First Look (Optional)', time: '13:30', description: 'Private first look with couple', order: 4 },
    { title: 'Wedding Party Photos', time: '14:00', description: 'Formal portraits', order: 5 },
  ],
  'Ceremony': [
    { title: 'Guests Arrive', time: '15:30', description: 'Guests seated by ushers', order: 1 },
    { title: 'Processional', time: '16:00', description: 'Wedding party walks down the aisle', order: 2 },
    { title: 'Ceremony', time: '16:05', description: 'Exchange of vows and rings', order: 3 },
    { title: 'Recessional', time: '16:35', description: 'Couple exits', order: 4 },
    { title: 'Cocktail Hour', time: '17:00', description: 'Guests enjoy cocktails while couple takes photos', order: 5 },
  ],
  'Reception': [
    { title: 'Grand Entrance', time: '18:00', description: 'Wedding party and couple introduced', order: 1 },
    { title: 'First Dance', time: '18:10', description: "Couple's first dance", order: 2 },
    { title: 'Parent Dances', time: '18:20', description: 'Father-daughter and mother-son dances', order: 3 },
    { title: 'Dinner Service', time: '18:30', description: 'Guests enjoy dinner', order: 4 },
    { title: 'Toasts & Speeches', time: '19:00', description: 'Best man, maid of honor, family toasts', order: 5 },
    { title: 'Cake Cutting', time: '20:00', description: 'Couple cuts the cake', order: 6 },
    { title: 'Open Dancing', time: '20:30', description: 'Dance floor opens to all guests', order: 7 },
    { title: 'Last Dance', time: '22:00', description: 'Final song of the evening', order: 8 },
    { title: 'Grand Exit / Send-Off', time: '22:15', description: "Couple's exit", order: 9 },
  ],
  'Rehearsal Day': [
    { title: 'Venue Walkthrough', time: '16:00', description: 'Coordinator walks through the venue', order: 1 },
    { title: 'Rehearsal Begins', time: '17:00', description: 'Practice run of ceremony', order: 2 },
    { title: 'Rehearsal Dinner', time: '18:30', description: 'Dinner with wedding party & family', order: 3 },
    { title: 'Final Questions & Prep', time: '21:00', description: 'Last minute coordination notes', order: 4 },
  ],
  'Full Wedding Day': [
    { title: 'Bridal Party Gets Ready', time: '09:00', description: 'Hair, makeup, and getting ready', order: 1 },
    { title: 'Getting Ready Photos', time: '11:00', description: 'Photographer captures preparations', order: 2 },
    { title: 'First Look', time: '13:30', description: 'Private couple moment before ceremony', order: 3 },
    { title: 'Wedding Party Photos', time: '14:00', description: 'Formal portraits', order: 4 },
    { title: 'Guests Arrive', time: '15:30', description: 'Ushers seat guests', order: 5 },
    { title: 'Ceremony Begins', time: '16:00', description: 'Exchange of vows', order: 6 },
    { title: 'Cocktail Hour', time: '17:00', description: 'Cocktails while couple finishes photos', order: 7 },
    { title: 'Grand Entrance', time: '18:00', description: 'Reception begins', order: 8 },
    { title: 'First Dance', time: '18:10', description: "Couple's first dance", order: 9 },
    { title: 'Dinner Service', time: '18:30', description: 'Dinner served', order: 10 },
    { title: 'Toasts', time: '19:00', description: 'Speeches and toasts', order: 11 },
    { title: 'Cake Cutting', time: '20:00', description: 'Cake ceremony', order: 12 },
    { title: 'Open Dancing', time: '20:30', description: 'Dance floor opens', order: 13 },
    { title: 'Last Dance & Send-Off', time: '22:00', description: 'Final song and grand exit', order: 14 },
  ],
}

export function AddTaskModal({ isOpen, onClose, weddingId, onTaskAdded }) {
  const toast = useToast()
  const modalRef = useRef(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: 'couple',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    setSaving(true)

    try {
      await tasksAPI.create({
        wedding_id: weddingId,
        title: formData.title,
        description: formData.description || '',
        due_date: formData.due_date,
        assigned_to: formData.assigned_to,
      })

      toast.success('Task created successfully!')
      onTaskAdded()
      onClose()
      setFormData({ title: '', description: '', due_date: '', assigned_to: 'couple' })
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-title"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 outline-none"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 id="add-task-title" className="text-3xl font-serif text-cowc-dark">Add Task</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cowc-cream rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-premium"
                placeholder="e.g., Book photographer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-premium min-h-[100px]"
                placeholder="Additional details..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Assigned To *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="input-premium"
                >
                  <option value="couple">Couple</option>
                  <option value="coordinator">Coordinator</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function AddVendorModal({ isOpen, onClose, weddingId, onVendorAdded }) {
  const toast = useToast()
  const modalRef = useRef(null)
  const searchRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'photographer',
    contact: '',
    phone: '',
    website: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(true)

  const categories = [
    { value: 'photo_video',    label: '📷🎥 Photo & Video (combined)' },
    { value: 'photographer',   label: '📷 Photographer' },
    { value: 'videographer',   label: '🎥 Videographer' },
    { value: 'florist',        label: '💐 Florist' },
    { value: 'dj',             label: '🎧 DJ' },
    { value: 'band',           label: '🎶 Band' },
    { value: 'caterer',        label: '🍽️ Catering' },
    { value: 'baker',          label: '🎂 Wedding Cake' },
    { value: 'hair_makeup',    label: '💄 Hair & Makeup' },
    { value: 'officiant',      label: '💍 Officiant' },
    { value: 'venue',          label: '🏛️ Venue' },
    { value: 'transportation', label: '🚗 Transportation' },
    { value: 'planner',        label: '📋 Planner' },
    { value: 'rentals',        label: '🪑 Rentals' },
    { value: 'stationery',     label: '✉️ Stationery' },
    { value: 'bar',            label: '🍾 Bar / Beverages' },
    { value: 'other',          label: '⭐ Other' },
  ]

  const formatCategory = (cat) => {
    const match = categories.find(c => c.value === cat)
    if (match) return match.label.replace(/^\S+\s/, '') // strip emoji
    return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await vendorsAPI.search(searchQuery)
        setSearchResults(results)
      } catch (e) {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectExisting = (vendor) => {
    setFormData({
      name: vendor.name,
      category: vendor.category || 'other',
      contact: vendor.contact_email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      notes: vendor.notes || '',
    })
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter a vendor name')
      return
    }

    setSaving(true)

    try {
      await vendorsAPI.create({
        wedding_id: weddingId,
        name: formData.name,
        category: formData.category,
        contact_email: formData.contact || '',
        phone: formData.phone || '',
        website: formData.website || '',
        notes: formData.notes || '',
      })

      toast.success('Vendor added successfully!')
      onVendorAdded()
      onClose()
      setFormData({ name: '', category: 'photographer', contact: '', phone: '', website: '', notes: '' })
      setShowSearch(true)
      setSearchQuery('')
    } catch (error) {
      console.error('Error creating vendor:', error)
      toast.error('Failed to add vendor. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vendor-title"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto outline-none"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 id="add-vendor-title" className="text-3xl font-serif text-cowc-dark">Add Vendor</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cowc-cream rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search existing vendors */}
          {showSearch && (
            <div className="mb-6 relative">
              <p className="text-sm text-cowc-gray mb-2 font-medium">Search existing vendors first</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-premium pl-10"
                  placeholder="Type vendor name to search..."
                />
              </div>

              {/* Search results */}
              <AnimatePresence>
                {(searchResults.length > 0 || searching) && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 z-10 bg-white border border-cowc-sand rounded-xl shadow-xl mt-1 overflow-hidden"
                  >
                    {searching && (
                      <div className="px-4 py-3 text-sm text-cowc-gray">Searching...</div>
                    )}
                    {searchResults.map((vendor) => (
                      <button
                        key={vendor.id}
                        type="button"
                        onClick={() => handleSelectExisting(vendor)}
                        className="w-full text-left px-4 py-3 hover:bg-cowc-cream transition-colors border-b border-cowc-sand/50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-cowc-dark text-sm">{vendor.name}</p>
                            <p className="text-xs text-cowc-gray mt-0.5">
                              {formatCategory(vendor.category || 'other')}
                              {vendor.wedding_name && (
                                <span className="ml-2 text-amber-600">· Used for {vendor.wedding_name}</span>
                              )}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-cowc-gray flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-cowc-sand" />
                <span className="px-3 text-xs text-cowc-gray font-medium">or enter new vendor below</span>
                <div className="flex-1 h-px bg-cowc-sand" />
              </div>
            </div>
          )}

          {!showSearch && (
            <div className="mb-4 flex items-center justify-between">
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg">
                Pre-filled from existing vendor — review & save
              </div>
              <button
                type="button"
                onClick={() => { setShowSearch(true); setFormData({ name: '', category: 'photographer', contact: '', phone: '', website: '', notes: '' }) }}
                className="text-sm text-cowc-gray hover:text-cowc-dark transition-colors ml-3"
              >
                Clear
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Vendor Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-premium"
                placeholder="e.g., Kate Holt Photography"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-premium"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">Email</label>
                <input
                  type="email"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="input-premium"
                  placeholder="vendor@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-premium"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input-premium"
                placeholder="https://vendorwebsite.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-premium min-h-[80px]"
                placeholder="Budget, status, special notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Adding...' : 'Add Vendor'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function AddTimelineModal({ isOpen, onClose, weddingId, onTimelineAdded }) {
  const toast = useToast()
  const modalRef = useRef(null)
  const [mode, setMode] = useState('preset') // 'preset' | 'single'
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    time: '',
    description: '',
    order: 0,
  })
  const [saving, setSaving] = useState(false)

  const presetColors = {
    'Getting Ready': 'from-pink-50 to-pink-100 border-pink-200 hover:border-pink-400',
    'Ceremony': 'from-purple-50 to-purple-100 border-purple-200 hover:border-purple-400',
    'Reception': 'from-amber-50 to-amber-100 border-amber-200 hover:border-amber-400',
    'Rehearsal Day': 'from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400',
    'Full Wedding Day': 'from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-400',
  }

  const presetIcons = {
    'Getting Ready': '💄',
    'Ceremony': '💒',
    'Reception': '🥂',
    'Rehearsal Day': '📋',
    'Full Wedding Day': '💍',
  }

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handleEscape)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleClose = () => {
    setMode('preset')
    setSelectedPreset(null)
    setSelectedItems([])
    setFormData({ title: '', time: '', description: '', order: 0 })
    onClose()
  }

  const handleSelectPreset = (presetName) => {
    setSelectedPreset(presetName)
    setSelectedItems(TIMELINE_PRESETS[presetName].map((_, i) => i))
  }

  const toggleItem = (index) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  const handleAddPreset = async () => {
    if (!selectedPreset || selectedItems.length === 0) {
      toast.error('Please select at least one item')
      return
    }
    setSaving(true)
    try {
      const items = TIMELINE_PRESETS[selectedPreset].filter((_, i) => selectedItems.includes(i))
      await Promise.all(items.map(item => timelineAPI.create({
        wedding_id: weddingId,
        title: item.title,
        time: item.time,
        description: item.description,
        sort_order: item.order,
      })))
      toast.success(`Added ${items.length} timeline item${items.length !== 1 ? 's' : ''}!`)
      onTimelineAdded()
      handleClose()
    } catch (error) {
      console.error('Error adding preset:', error)
      toast.error('Failed to add timeline items. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Please enter an event title')
      return
    }
    setSaving(true)
    try {
      await timelineAPI.create({
        wedding_id: weddingId,
        title: formData.title,
        time: formData.time || null,
        description: formData.description || '',
        sort_order: Number(formData.order) || 0,
      })
      toast.success('Timeline item added!')
      onTimelineAdded()
      handleClose()
    } catch (error) {
      console.error('Error creating timeline item:', error)
      toast.error('Failed to add timeline item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-timeline-title"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto outline-none"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 id="add-timeline-title" className="text-3xl font-serif text-cowc-dark">Add Timeline</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-cowc-cream rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-cowc-cream rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('preset'); setSelectedPreset(null); setSelectedItems([]) }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${mode === 'preset' ? 'bg-white shadow text-cowc-dark' : 'text-cowc-gray hover:text-cowc-dark'}`}
            >
              Use Preset Package
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${mode === 'single' ? 'bg-white shadow text-cowc-dark' : 'text-cowc-gray hover:text-cowc-dark'}`}
            >
              Add Single Item
            </button>
          </div>

          {/* Preset package picker */}
          {mode === 'preset' && !selectedPreset && (
            <div>
              <p className="text-sm text-cowc-gray mb-4">Choose a preset to quickly add common wedding timeline events.</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.keys(TIMELINE_PRESETS).map(presetName => (
                  <button
                    key={presetName}
                    type="button"
                    onClick={() => handleSelectPreset(presetName)}
                    className={`bg-gradient-to-br ${presetColors[presetName]} border-2 rounded-xl p-4 text-left transition-all hover:shadow-md`}
                  >
                    <div className="text-2xl mb-2">{presetIcons[presetName]}</div>
                    <p className="font-semibold text-sm text-cowc-dark">{presetName}</p>
                    <p className="text-xs text-cowc-gray mt-1">{TIMELINE_PRESETS[presetName].length} items</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Preset item checklist */}
          {mode === 'preset' && selectedPreset && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => { setSelectedPreset(null); setSelectedItems([]) }}
                  className="text-sm text-cowc-gray hover:text-cowc-dark transition-colors flex items-center gap-1"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" /> Back
                </button>
                <span className="font-semibold text-cowc-dark">{presetIcons[selectedPreset]} {selectedPreset}</span>
                <span className="ml-auto text-xs text-cowc-gray">{selectedItems.length} of {TIMELINE_PRESETS[selectedPreset].length} selected</span>
              </div>

              <div className="space-y-2 mb-5 max-h-[320px] overflow-y-auto pr-1">
                {TIMELINE_PRESETS[selectedPreset].map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleItem(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedItems.includes(i)
                        ? 'bg-cowc-cream border-cowc-gold'
                        : 'bg-white border-cowc-sand opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      selectedItems.includes(i) ? 'bg-cowc-gold border-cowc-gold' : 'border-cowc-gray'
                    }`}>
                      {selectedItems.includes(i) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-cowc-dark">{item.title}</p>
                      <p className="text-xs text-cowc-gray mt-0.5">{item.time} · {item.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedItems(
                      selectedItems.length === TIMELINE_PRESETS[selectedPreset].length
                        ? []
                        : TIMELINE_PRESETS[selectedPreset].map((_, i) => i)
                    )
                  }
                  className="py-2 px-4 rounded-xl font-semibold text-sm text-cowc-gray hover:bg-cowc-cream transition-all border border-cowc-sand"
                >
                  {selectedItems.length === TIMELINE_PRESETS[selectedPreset].length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="py-2 px-4 rounded-xl font-semibold text-sm text-cowc-gray hover:bg-cowc-cream transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPreset}
                  disabled={saving || selectedItems.length === 0}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Adding...' : `Add ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Single item form */}
          {mode === 'single' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-premium"
                  placeholder="e.g., Ceremony Begins"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="input-premium"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-premium min-h-[100px]"
                  placeholder="Event details..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
