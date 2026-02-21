import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Save, Heart, MapPin, Search, Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { weddingsAPI } from '../services/unifiedAPI'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

// ── VenueSelector ─────────────────────────────────────────────────────────────
function VenueSelector({ value, onChange, onAddressResolved }) {
  const [query, setQuery] = useState(value || '')
  const [venues, setVenues] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef()
  const toast = useToast()

  // Load venues on mount and on query change
  useEffect(() => {
    const timer = setTimeout(() => searchVenues(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchVenues = async (q) => {
    if (!q.trim()) { setVenues([]); return }
    const { data } = await supabase
      .from('venues')
      .select('id, name, address, city, state')
      .ilike('name', `%${q}%`)
      .limit(8)
    setVenues(data || [])
    setShowDropdown(true)
  }

  const selectVenue = (venue) => {
    setQuery(venue.name)
    onChange(venue.name)
    if (venue.address) onAddressResolved(venue.address)
    setShowDropdown(false)
  }

  const addNewVenue = async (name) => {
    setCreating(true)
    setShowDropdown(false)
    try {
      // Look up the address
      let resolvedAddress = ''
      setLookingUp(true)
      try {
        const res = await supabase.functions.invoke('lookup-venue-address', {
          body: { venueName: name },
        })
        if (res.data?.address) {
          resolvedAddress = res.data.address
        }
      } catch {}
      setLookingUp(false)

      // Insert into venues table
      const { data, error } = await supabase
        .from('venues')
        .insert({ name: name.trim(), address: resolvedAddress || null })
        .select()
        .single()

      if (error) throw error
      onChange(data.name)
      if (resolvedAddress) {
        onAddressResolved(resolvedAddress)
        toast.success(`Venue added! Address found: ${resolvedAddress}`)
      } else {
        toast.success('Venue added — no address found, you can enter it manually')
      }
    } catch (err) {
      toast.error('Failed to add venue: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const showAddOption = query.trim().length > 1 &&
    !venues.some(v => v.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
        <input
          type="text"
          placeholder="Search or add a venue..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
          }}
          onFocus={() => query && setShowDropdown(true)}
          className="input-premium pl-9"
          required
        />
        {(lookingUp || creating) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gold animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (venues.length > 0 || showAddOption) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {venues.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVenue(v)}
                className="w-full text-left px-4 py-3 hover:bg-cowc-cream transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-cowc-dark">{v.name}</p>
                    {v.address && <p className="text-xs text-cowc-gray truncate">{v.address}</p>}
                  </div>
                </div>
              </button>
            ))}
            {showAddOption && (
              <button
                type="button"
                onClick={() => addNewVenue(query.trim())}
                className="w-full text-left px-4 py-3 hover:bg-cowc-cream transition-colors flex items-center gap-2 text-cowc-gold font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
                Add "{query.trim()}" as new venue
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateWeddingScreenSimple() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    brideFirstName: '',
    groomFirstName: '',
    coupleEmail: '',
    packageType: '',
    weddingDate: '',
    venueName: '',
    venueAddress: '',
    guestCount: 100,
    budget: 35000,
    notes: '',
    primaryColor: '#d4a574',
    secondaryColor: '#2d3748',
    accentColor: '#faf9f7',
    vibe: 'Classic Elegant',
  })

  // Auto-build couple_name from bride + groom names
  const coupleName = [formData.brideFirstName.trim(), formData.groomFirstName.trim()]
    .filter(Boolean)
    .join(' & ')

  const packageOptions = [
    { value: '', label: 'Select package...' },
    { value: 'DOC', label: 'Day of Coordination' },
    { value: 'PP', label: 'Partial Planning' },
    { value: 'FP', label: 'Full Planning' },
  ]

  const vibeOptions = [
    'Romantic Garden',
    'Modern Bohemian',
    'Classic Elegant',
    'Rustic Charm',
    'Mountain Elegant',
    'Beach Chic',
    'Urban Modern',
    'Vintage Glam',
    'Desert Luxe',
    'Autumn Romance',
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.brideFirstName.trim() && !formData.groomFirstName.trim()) {
      toast.error('Please enter at least one name')
      return
    }
    if (!formData.weddingDate) {
      toast.error('Please select a wedding date')
      return
    }
    if (!formData.venueName) {
      toast.error('Please enter a venue name')
      return
    }

    const weddingDate = new Date(formData.weddingDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (weddingDate < today) {
      toast.warning('Wedding date is in the past')
    }

    setLoading(true)
    try {
      const newWedding = {
        couple_name: coupleName,
        bride_first_name: formData.brideFirstName.trim() || null,
        groom_first_name: formData.groomFirstName.trim() || null,
        couple_user_id: null,
        couple_email: formData.coupleEmail || null,
        package_type: formData.packageType || null,
        wedding_date: formData.weddingDate,
        venue_name: formData.venueName,
        venue_address: formData.venueAddress,
        guest_count: parseInt(formData.guestCount) || 0,
        budget: parseInt(formData.budget) || 0,
        status: 'Planning',
        notes: formData.notes,
        theme: {
          primary: formData.primaryColor,
          secondary: formData.secondaryColor,
          accent: formData.accentColor,
          vibe: formData.vibe,
          inspiration_photos: [],
        },
      }

      await weddingsAPI.create(newWedding)
      toast.success(`Wedding created for ${coupleName || 'new couple'}!`)
      navigate('/admin')
    } catch (error) {
      console.error('Error creating wedding:', error)
      toast.error('Failed to create wedding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value })

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
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-5xl font-serif font-light">Create New Wedding</h1>
              {coupleName && (
                <p className="text-white/80 mt-2 text-lg font-serif">{coupleName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <form onSubmit={handleSubmit} className="card-premium p-8 space-y-8">

          {/* Couple Names */}
          <div>
            <h3 className="text-2xl font-serif text-cowc-dark mb-6">The Couple</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Bride's First Name
                </label>
                <input
                  type="text"
                  placeholder="Jessica"
                  value={formData.brideFirstName}
                  onChange={set('brideFirstName')}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Groom's First Name
                </label>
                <input
                  type="text"
                  placeholder="Mark"
                  value={formData.groomFirstName}
                  onChange={set('groomFirstName')}
                  className="input-premium"
                />
              </div>

              {coupleName && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 px-4 py-3 bg-cowc-cream rounded-xl border border-cowc-sand">
                    <Heart className="w-4 h-4 text-cowc-gold fill-cowc-gold" />
                    <span className="font-serif text-cowc-dark text-lg">{coupleName}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Couple's Email
                  <span className="ml-2 text-xs font-normal text-cowc-gray">(portal invite)</span>
                </label>
                <input
                  type="email"
                  placeholder="jessica@example.com"
                  value={formData.coupleEmail}
                  onChange={set('coupleEmail')}
                  className="input-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Package
                </label>
                <select
                  value={formData.packageType}
                  onChange={set('packageType')}
                  className="input-premium"
                >
                  {packageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wedding Details */}
          <div>
            <h3 className="text-2xl font-serif text-cowc-dark mb-6">Wedding Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Wedding Date *
                </label>
                <input
                  type="date"
                  value={formData.weddingDate}
                  onChange={set('weddingDate')}
                  className="input-premium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Guest Count
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.guestCount}
                  onChange={set('guestCount')}
                  className="input-premium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Venue *
                </label>
                <VenueSelector
                  value={formData.venueName}
                  onChange={(name) => setFormData(f => ({ ...f, venueName: name }))}
                  onAddressResolved={(addr) => setFormData(f => ({ ...f, venueAddress: addr }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Venue Address
                  <span className="ml-2 text-xs font-normal text-cowc-gray">Auto-filled when venue is found</span>
                </label>
                <textarea
                  placeholder="Address will auto-fill when you select or add a venue"
                  value={formData.venueAddress}
                  onChange={set('venueAddress')}
                  className="input-premium min-h-[80px]"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">Budget</label>
                <input
                  type="number"
                  placeholder="35000"
                  value={formData.budget}
                  onChange={set('budget')}
                  className="input-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">Wedding Vibe</label>
                <select value={formData.vibe} onChange={set('vibe')} className="input-premium">
                  {vibeOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-cowc-dark mb-2">Notes</label>
                <textarea
                  placeholder="Special requests, preferences, important details..."
                  value={formData.notes}
                  onChange={set('notes')}
                  className="input-premium min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Theme Colors */}
          <div>
            <h3 className="text-2xl font-serif text-cowc-dark mb-6">Theme Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Primary Color', key: 'primaryColor', placeholder: '#d4a574' },
                { label: 'Secondary Color', key: 'secondaryColor', placeholder: '#2d3748' },
                { label: 'Accent Color', key: 'accentColor', placeholder: '#faf9f7' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">{label}</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-16 h-12 rounded-lg border-2 border-cowc-sand cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="input-premium flex-1"
                      placeholder={placeholder}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-6 p-6 rounded-xl text-white text-center"
              style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
            >
              <p className="text-xl font-serif">{coupleName || 'Color Preview'}</p>
              <p className="text-sm opacity-75 mt-1">Couple's dashboard gradient</p>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-8 py-3 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-premium flex items-center justify-center gap-2 bg-cowc-gold text-white disabled:opacity-50 py-3 rounded-xl font-semibold"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? 'Creating...' : `Create Wedding${coupleName ? ` for ${coupleName}` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
