import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Package, Camera, Edit2, Trash2,
  CheckCircle2, X, Upload, Tag, Hash, AlignLeft,
  Archive, ArchiveRestore, Loader2, ClipboardList,
  ShoppingBag, Eye, ChevronDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { formatDate } from '../utils/dates'

const CATEGORIES = [
  { value: 'florals',      label: 'Florals' },
  { value: 'decor',        label: 'Décor' },
  { value: 'lighting',     label: 'Lighting' },
  { value: 'linens',       label: 'Linens' },
  { value: 'signage',      label: 'Signage' },
  { value: 'accessories',  label: 'Accessories' },
  { value: 'furniture',    label: 'Furniture' },
  { value: 'general',      label: 'General' },
]

const STATUS_COLORS = {
  requested:  'bg-amber-100 text-amber-700',
  confirmed:  'bg-emerald-100 text-emerald-700',
  declined:   'bg-red-100 text-red-600',
  returned:   'bg-gray-100 text-gray-600',
}

const BLANK_FORM = {
  name: '',
  description: '',
  category: 'general',
  quantity_total: 1,
  photo_url: '',
}

// ── Reservation row shown inside an item card ────────────────────────────────
function ReservationRow({ res, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const statuses = ['requested', 'confirmed', 'declined', 'returned']

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-cowc-dark">{res.wedding?.couple_name || 'Unknown couple'}</p>
        <p className="text-xs text-cowc-gray">{res.wedding?.wedding_date ? formatDate(res.wedding.wedding_date) : 'No date'} · qty {res.quantity}</p>
        {res.notes && <p className="text-xs text-cowc-gray italic mt-0.5">{res.notes}</p>}
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[res.status]} hover:opacity-80`}
        >
          {res.status}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
            >
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => { setOpen(false); onStatusChange(res.id, s) }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 capitalize flex items-center gap-2 ${s === res.status ? 'bg-gray-50' : ''}`}
                >
                  {s === res.status && <CheckCircle2 className="w-3 h-3 text-cowc-gold" />}
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Item card ────────────────────────────────────────────────────────────────
function ItemCard({ item, reservations, onEdit, onToggleActive, onStatusChange }) {
  const [showReservations, setShowReservations] = useState(false)
  const reserved = reservations.reduce((sum, r) => sum + (r.status !== 'declined' && r.status !== 'returned' ? r.quantity : 0), 0)
  const available = item.quantity_total - reserved

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border transition-all ${item.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}
    >
      {/* Photo */}
      <div className="relative h-44 bg-cowc-cream rounded-t-2xl overflow-hidden">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-cowc-light-gray" />
          </div>
        )}
        {!item.active && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
            <span className="bg-white/90 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">Archived</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => onEdit(item)}
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-all"
          >
            <Edit2 className="w-3.5 h-3.5 text-cowc-dark" />
          </button>
          <button
            onClick={() => onToggleActive(item)}
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-all"
            title={item.active ? 'Archive item' : 'Restore item'}
          >
            {item.active
              ? <Archive className="w-3.5 h-3.5 text-cowc-gray" />
              : <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600" />
            }
          </button>
        </div>
        <span className="absolute bottom-2 left-2 bg-white/90 text-cowc-dark text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
          {item.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-cowc-dark text-base leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-cowc-gray mt-1 line-clamp-2">{item.description}</p>
        )}

        {/* Qty bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-cowc-gray">Reserved</span>
              <span className="font-semibold text-cowc-dark">{reserved}/{item.quantity_total}</span>
            </div>
            <div className="h-1.5 bg-cowc-cream rounded-full overflow-hidden">
              <div
                className="h-full bg-cowc-gold rounded-full transition-all"
                style={{ width: `${Math.min((reserved / item.quantity_total) * 100, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {available > 0 ? `${available} avail` : 'Full'}
          </span>
        </div>

        {/* Reservations toggle */}
        {reservations.length > 0 && (
          <button
            onClick={() => setShowReservations(!showReservations)}
            className="mt-3 w-full flex items-center justify-between text-xs text-cowc-gold font-semibold hover:opacity-70 transition-all"
          >
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showReservations ? 'rotate-180' : ''}`} />
          </button>
        )}
        <AnimatePresence>
          {showReservations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 border-t border-gray-100 pt-2">
                {reservations.map(r => (
                  <ReservationRow key={r.id} res={r} onStatusChange={onStatusChange} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Add / Edit modal ─────────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? {
    name: item.name,
    description: item.description || '',
    category: item.category,
    quantity_total: item.quantity_total,
    photo_url: item.photo_url || '',
  } : { ...BLANK_FORM })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const toast = useToast()

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('inventory-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage
        .from('inventory-photos')
        .getPublicUrl(path)
      setForm(f => ({ ...f, photo_url: publicUrl }))
    } catch (err) {
      toast.error('Photo upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave({ ...form, quantity_total: Number(form.quantity_total) || 1 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-serif text-cowc-dark">{item ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-cowc-cream rounded-full transition-all">
            <X className="w-5 h-5 text-cowc-gray" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo */}
          <div>
            <label className="block text-sm font-semibold text-cowc-dark mb-2">Photo</label>
            <div
              className="relative h-40 bg-cowc-cream rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-cowc-sand hover:border-cowc-gold transition-all"
              onClick={() => fileRef.current?.click()}
            >
              {form.photo_url ? (
                <>
                  <img src={form.photo_url} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  {uploading
                    ? <Loader2 className="w-8 h-8 text-cowc-gold animate-spin" />
                    : <>
                        <Upload className="w-8 h-8 text-cowc-light-gray" />
                        <span className="text-sm text-cowc-gray">Tap to upload photo</span>
                      </>
                  }
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {/* URL paste option */}
            <div className="mt-2 flex gap-2 items-center">
              <input
                type="url"
                placeholder="Or paste an image URL (Canva, etc.)"
                value={form.photo_url && !form.photo_url.startsWith('http') ? '' : (form.photo_url || '')}
                onChange={(e) => setForm(f => ({ ...f, photo_url: e.target.value }))}
                className="input-premium text-xs py-2 flex-1"
              />
            </div>
            {form.photo_url && (
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, photo_url: '' }))}
                className="mt-1 text-xs text-red-500 hover:underline"
              >Remove photo</button>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-cowc-dark mb-2">Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-premium"
              placeholder="e.g. Eucalyptus Garland"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-cowc-dark mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-premium resize-none"
              rows={2}
              placeholder="Brief description of the item..."
            />
          </div>

          {/* Category + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-premium"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">Total Qty</label>
              <input
                type="number"
                min={1}
                value={form.quantity_total}
                onChange={e => setForm(f => ({ ...f, quantity_total: e.target.value }))}
                className="input-premium"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-cowc-sand text-cowc-gray font-semibold hover:bg-cowc-cream transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 py-3 rounded-xl bg-cowc-gold text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CatalogueManagementScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: itemsData }, { data: resData }] = await Promise.all([
        supabase.from('inventory_items').select('*').order('sort_order').order('created_at'),
        supabase.from('inventory_reservations').select(`
          *,
          wedding:weddings(id, couple_name, wedding_date)
        `).order('created_at'),
      ])
      setItems(itemsData || [])
      setReservations(resData || [])
    } catch (err) {
      toast.error('Failed to load catalogue')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(formData)
          .eq('id', editingItem.id)
        if (error) throw error
        toast.success('Item updated!')
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert(formData)
        if (error) throw error
        toast.success('Item added to catalogue!')
      }
      setShowModal(false)
      setEditingItem(null)
      await loadData()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ active: !item.active })
        .eq('id', item.id)
      if (error) throw error
      toast.success(item.active ? 'Item archived' : 'Item restored')
      await loadData()
    } catch (err) {
      toast.error('Failed to update item')
    }
  }

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: newStatus })
        .eq('id', reservationId)
      if (error) throw error
      toast.success('Status updated')
      await loadData()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const getItemReservations = (itemId) =>
    reservations.filter(r => r.item_id === itemId)

  const filteredItems = items.filter(item => {
    if (!showArchived && !item.active) return false
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    return true
  })

  const totalReserved = reservations.filter(r => r.status === 'requested' || r.status === 'confirmed').length
  const activeItems = items.filter(i => i.active).length

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-light">Catalogue</h1>
                <p className="text-white/70 mt-1">{activeItems} active items · {totalReserved} pending reservations</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingItem(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-cowc-gold text-white px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterCategory === 'all' ? 'bg-cowc-gold text-white' : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'}`}
            >
              All
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCategory(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filterCategory === c.value ? 'bg-cowc-gold text-white' : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showArchived ? 'bg-gray-200 text-gray-700' : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'}`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-cowc-gold animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <Package className="w-12 h-12 text-cowc-light-gray mx-auto mb-3" />
            <p className="text-cowc-gray font-medium">No items yet</p>
            <button
              onClick={() => { setEditingItem(null); setShowModal(true) }}
              className="mt-4 text-cowc-gold font-semibold hover:underline text-sm"
            >
              Add your first item →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                reservations={getItemReservations(item.id)}
                onEdit={(i) => { setEditingItem(i); setShowModal(true) }}
                onToggleActive={handleToggleActive}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ItemModal
            item={editingItem}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingItem(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
