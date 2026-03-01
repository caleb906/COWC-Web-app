import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Package, ShoppingBag, CheckCircle2,
  X, Loader2, ChevronDown, Heart, Tag,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/appStore'
import { useToast } from './Toast'

const CATEGORIES = [
  { value: 'all',         label: 'All' },
  { value: 'florals',     label: 'Florals' },
  { value: 'decor',       label: 'Décor' },
  { value: 'lighting',    label: 'Lighting' },
  { value: 'linens',      label: 'Linens' },
  { value: 'signage',     label: 'Signage' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'furniture',   label: 'Furniture' },
  { value: 'general',     label: 'General' },
]

const STATUS_STYLES = {
  requested: { bg: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700',  label: 'Requested' },
  confirmed: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
  declined:  { bg: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-600',      label: 'Declined' },
  returned:  { bg: 'bg-gray-50 border-gray-200',    badge: 'bg-gray-100 text-gray-600',    label: 'Returned' },
}

// ── Reserve modal ─────────────────────────────────────────────────────────────
function ReserveModal({ item, available, onReserve, onClose }) {
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onReserve({ quantity: Number(quantity), notes })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-serif text-cowc-dark">Reserve Item</h2>
          <button onClick={onClose} className="p-2 hover:bg-cowc-cream rounded-full">
            <X className="w-5 h-5 text-cowc-gray" />
          </button>
        </div>

        <div className="p-6">
          {/* Item preview */}
          <div className="flex gap-4 mb-6 p-3 bg-cowc-cream rounded-xl">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0">
              {item.photo_url
                ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-cowc-light-gray" /></div>
              }
            </div>
            <div>
              <p className="font-semibold text-cowc-dark">{item.name}</p>
              <p className="text-xs text-cowc-gray capitalize mt-0.5">{item.category}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">{available} available</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">Quantity</label>
              <input
                type="number"
                min={1}
                max={available}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-premium resize-none"
                rows={2}
                placeholder="Any special requests or notes..."
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Your coordinator will confirm this reservation. You'll see the status update here.
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-cowc-sand text-cowc-gray font-semibold hover:bg-cowc-cream transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || quantity < 1 || quantity > available}
                className="flex-1 py-3 rounded-xl bg-cowc-gold text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                Reserve
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// ── Item card for couples ─────────────────────────────────────────────────────
function CatalogueItemCard({ item, myReservation, available, onReserve, onCancelReservation }) {
  const isFull = available <= 0
  const hasReservation = !!myReservation
  const status = myReservation ? STATUS_STYLES[myReservation.status] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
        hasReservation ? status.bg : 'border-gray-100'
      }`}
    >
      {/* Photo */}
      <div className="relative h-44 bg-cowc-cream overflow-hidden">
        {item.photo_url
          ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-cowc-light-gray" /></div>
        }
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="bg-white/90 text-cowc-dark text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
            {item.category}
          </span>
          {hasReservation && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.badge}`}>
              {status.label}
            </span>
          )}
        </div>
        {isFull && !hasReservation && (
          <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center">
            <span className="bg-white/90 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">Fully Reserved</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-cowc-dark">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-cowc-gray mt-1 line-clamp-2">{item.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-semibold ${isFull && !hasReservation ? 'text-red-500' : 'text-emerald-600'}`}>
            {hasReservation
              ? `Reserved: qty ${myReservation.quantity}`
              : isFull ? 'Fully reserved' : `${available} available`
            }
          </span>

          {hasReservation ? (
            myReservation.status === 'requested' ? (
              <button
                onClick={() => onCancelReservation(myReservation.id)}
                className="text-xs text-red-500 font-semibold hover:underline"
              >
                Cancel
              </button>
            ) : null
          ) : (
            !isFull && (
              <button
                onClick={() => onReserve(item)}
                className="flex items-center gap-1.5 bg-cowc-gold text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
              >
                <Heart className="w-3 h-3" />
                Reserve
              </button>
            )
          )}
        </div>

        {myReservation?.notes && (
          <p className="text-xs text-cowc-gray italic mt-2 bg-cowc-cream rounded-lg px-2 py-1">
            "{myReservation.notes}"
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CatalogueScreen({ onPreviewNavigate } = {}) {
  const navigate = useNavigate()
  const goBack = () => onPreviewNavigate ? onPreviewNavigate('/') : navigate('/')
  const { user } = useAuthStore()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [reservations, setReservations] = useState([])
  const [wedding, setWedding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [reservingItem, setReservingItem] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get this couple's wedding — works for both primary couple and partner accounts
      const { data: weddingData } = await supabase
        .from('weddings')
        .select('id, couple_name, wedding_date')
        .or(`couple_user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle()

      setWedding(weddingData)

      const [{ data: itemsData }, { data: resData }] = await Promise.all([
        supabase.from('inventory_items').select('*').eq('active', true).order('sort_order').order('created_at'),
        weddingData
          ? supabase.from('inventory_reservations').select('*').eq('wedding_id', weddingData.id)
          : Promise.resolve({ data: [] }),
      ])

      setItems(itemsData || [])
      setReservations(resData || [])
    } catch (err) {
      toast.error('Failed to load catalogue')
    } finally {
      setLoading(false)
    }
  }

  const getReservedCount = (itemId) =>
    reservations
      .filter(r => r.item_id === itemId && r.status !== 'declined' && r.status !== 'returned')
      .reduce((sum, r) => sum + r.quantity, 0)

  const getMyReservation = (itemId) =>
    reservations.find(r => r.item_id === itemId) || null

  const handleReserve = async ({ quantity, notes }) => {
    if (!wedding) {
      toast.error('No wedding found — contact your coordinator')
      return
    }
    try {
      const { error } = await supabase.from('inventory_reservations').insert({
        item_id: reservingItem.id,
        wedding_id: wedding.id,
        quantity,
        notes,
        status: 'requested',
      })
      if (error) throw error
      toast.success('Reservation requested!')
      setReservingItem(null)
      await loadData()
    } catch (err) {
      toast.error('Failed to reserve: ' + err.message)
    }
  }

  const handleCancelReservation = async (reservationId) => {
    try {
      const { error } = await supabase
        .from('inventory_reservations')
        .delete()
        .eq('id', reservationId)
      if (error) throw error
      toast.success('Reservation cancelled')
      await loadData()
    } catch (err) {
      toast.error('Failed to cancel')
    }
  }

  const filteredItems = items.filter(item =>
    filterCategory === 'all' || item.category === filterCategory
  )

  const myReservationCount = reservations.filter(r => r.status !== 'declined' && r.status !== 'returned').length

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-light">Catalogue</h1>
              <p className="text-white/70 mt-1">
                Browse &amp; reserve items for your wedding
                {myReservationCount > 0 && ` · ${myReservationCount} reserved`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Category filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCategory(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterCategory === c.value ? 'bg-cowc-gold text-white' : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* No wedding message */}
        {!wedding && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
            You don't have a wedding set up yet. Contact your coordinator to get started.
          </div>
        )}

        {/* Items grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-cowc-gold animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <Package className="w-12 h-12 text-cowc-light-gray mx-auto mb-3" />
            <p className="text-cowc-gray">No items in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const available = item.quantity_total - getReservedCount(item.id)
              return (
                <CatalogueItemCard
                  key={item.id}
                  item={item}
                  myReservation={getMyReservation(item.id)}
                  available={available}
                  onReserve={setReservingItem}
                  onCancelReservation={handleCancelReservation}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Reserve modal */}
      <AnimatePresence>
        {reservingItem && (
          <ReserveModal
            item={reservingItem}
            available={reservingItem.quantity_total - getReservedCount(reservingItem.id)}
            onReserve={handleReserve}
            onClose={() => setReservingItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
