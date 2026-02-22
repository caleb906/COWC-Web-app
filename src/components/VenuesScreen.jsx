import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Plus, Search, Edit2, Trash2, Save, X, Loader2, ExternalLink, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { getVenuePredictions, getPlaceDetails } from '../lib/googleMaps'

// ── Autocomplete hook (Google Maps Places) ─────────────────────────────────────
function useVenueAutocomplete() {
  const [suggestions, setSuggestions] = useState([])
  const [suggesting, setSuggesting] = useState(false)
  const debounceRef = useRef(null)

  const suggest = useCallback((query) => {
    clearTimeout(debounceRef.current)
    if (!query || query.trim().length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setSuggesting(true)
      try {
        const results = await getVenuePredictions(query.trim())
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSuggesting(false)
      }
    }, 300)
  }, [])

  const fetchDetails = useCallback(async (placeId) => {
    const details = await getPlaceDetails(placeId)
    return details || {}
  }, [])

  const clear = useCallback(() => {
    setSuggestions([])
    clearTimeout(debounceRef.current)
  }, [])

  return { suggestions, suggesting, suggest, fetchDetails, clear }
}

// ── Autocomplete dropdown ─────────────────────────────────────────────────────
function SuggestionsDropdown({ suggestions, suggesting, onSelect, query }) {
  if (!query || query.trim().length < 2) return null
  if (!suggesting && suggestions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-cowc-sand overflow-hidden"
    >
      {suggesting && suggestions.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-cowc-gray">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cowc-gold" />
          Searching…
        </div>
      ) : (
        suggestions.map((s) => (
          <button
            key={s.placeId}
            type="button"
            onClick={() => onSelect(s)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-cowc-cream transition-colors text-left border-b border-cowc-sand/30 last:border-0"
          >
            <MapPin className="w-3.5 h-3.5 text-cowc-gold mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-cowc-dark leading-tight">{s.name}</p>
              {s.address && <p className="text-xs text-cowc-gray mt-0.5">{s.address}</p>}
            </div>
          </button>
        ))
      )}
    </motion.div>
  )
}

// ── VenueNameField — name input with live suggestions ─────────────────────────
function VenueNameField({ value, onChange, onFill, placeholder = 'Venue name *', className = '' }) {
  const { suggestions, suggesting, suggest, fetchDetails, clear } = useVenueAutocomplete()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (val) => {
    onChange(val)
    suggest(val)
    setOpen(true)
  }

  const handleSelect = async (suggestion) => {
    setOpen(false)
    clear()
    // Immediately fill the name
    onChange(suggestion.name)
    // Fetch full details and fill other fields
    try {
      const details = await fetchDetails(suggestion.placeId)
      onFill({
        name:    details.name    || suggestion.name,
        address: details.address || '',
        city:    details.city    || '',
        state:   details.state   || '',
        website: details.website || '',
      })
    } catch {
      onFill({ name: suggestion.name })
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => value.trim().length >= 2 && setOpen(true)}
        className={className}
        autoComplete="off"
      />
      <AnimatePresence>
        {open && (
          <SuggestionsDropdown
            suggestions={suggestions}
            suggesting={suggesting}
            query={value}
            onSelect={handleSelect}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VenuesScreen() {
  const navigate = useNavigate()
  const toast = useToast()

  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [lookingUpId, setLookingUpId] = useState(null)

  // New venue form state
  const [newVenue, setNewVenue] = useState({ name: '', address: '', city: '', state: '', website: '', notes: '' })

  // Edit form state per venue
  const [editForm, setEditForm] = useState({})

  useEffect(() => { loadVenues() }, [])

  const loadVenues = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setVenues(data || [])
    } catch {
      toast.error('Failed to load venues')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newVenue.name.trim()) { toast.error('Venue name is required'); return }
    try {
      const { data, error } = await supabase
        .from('venues')
        .insert({
          name: newVenue.name.trim(),
          address: newVenue.address.trim() || null,
          city: newVenue.city.trim() || null,
          state: newVenue.state.trim() || null,
          website: newVenue.website.trim() || null,
          notes: newVenue.notes.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setVenues(v => [...v, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewVenue({ name: '', address: '', city: '', state: '', website: '', notes: '' })
      setShowAddForm(false)
      toast.success('Venue added!')
    } catch {
      toast.error('Failed to add venue')
    }
  }

  const handleStartEdit = (venue) => {
    setEditingId(venue.id)
    setEditForm({
      name: venue.name || '',
      address: venue.address || '',
      city: venue.city || '',
      state: venue.state || '',
      website: venue.website || '',
      notes: venue.notes || '',
    })
  }

  const handleSaveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          name: editForm.name.trim(),
          address: editForm.address.trim() || null,
          city: editForm.city.trim() || null,
          state: editForm.state.trim() || null,
          website: editForm.website.trim() || null,
          notes: editForm.notes.trim() || null,
        })
        .eq('id', id)
      if (error) throw error
      setVenues(v => v.map(venue => venue.id === id ? { ...venue, ...editForm } : venue))
      setEditingId(null)
      toast.success('Venue updated!')
    } catch {
      toast.error('Failed to update venue')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this venue?')) return
    try {
      const { error } = await supabase.from('venues').delete().eq('id', id)
      if (error) throw error
      setVenues(v => v.filter(venue => venue.id !== id))
      toast.success('Venue deleted')
    } catch {
      toast.error('Failed to delete venue')
    }
  }

  const handleLookupAddress = async (id, name) => {
    setLookingUpId(id)
    try {
      const { lookupVenueByName } = await import('../lib/googleMaps')
      const currentVenue = venues.find(v => v.id === id)
      const hintCity  = (editingId === id ? editForm.city  : currentVenue?.city)  || ''
      const hintState = (editingId === id ? editForm.state : currentVenue?.state) || 'Oregon'

      const data = await lookupVenueByName(name, hintCity, hintState)

      if (data?.address || data?.city) {
        if (editingId === id) {
          setEditForm(f => ({
            ...f,
            ...(data.address && { address: data.address }),
            ...(data.city    && { city: data.city }),
            ...(data.state   && { state: data.state }),
            ...(data.website && !f.website && { website: data.website }),
          }))
          toast.success(`Found: ${[data.address, data.city, data.state].filter(Boolean).join(', ')}`)
        } else {
          const updates = {
            ...(data.address && { address: data.address }),
            ...(data.city    && { city: data.city }),
            ...(data.state   && { state: data.state }),
          }
          const { error } = await supabase.from('venues').update(updates).eq('id', id)
          if (!error) {
            setVenues(v => v.map(venue => venue.id === id ? { ...venue, ...updates } : venue))
            toast.success(`Saved: ${[data.address, data.city, data.state].filter(Boolean).join(', ')}`)
          }
        }
      } else {
        toast.error('No address found — try editing and adding a city first, then retry')
      }
    } catch {
      toast.error('Address lookup failed')
    } finally {
      setLookingUpId(null)
    }
  }

  const filteredVenues = venues.filter(v =>
    !searchQuery.trim() ||
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.state?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-5xl font-serif font-light">Venues</h1>
              <p className="text-white/70 mt-2">{venues.length} venue{venues.length !== 1 ? 's' : ''} in your directory</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-cowc-gold text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Venue
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search by name, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cowc-gold"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8">

        {/* Add Venue Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium p-6 mb-6"
          >
            <h3 className="text-xl font-serif text-cowc-dark mb-4">Add New Venue</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Name with autocomplete */}
              <VenueNameField
                value={newVenue.name}
                onChange={val => setNewVenue(v => ({ ...v, name: val }))}
                onFill={fields => setNewVenue(v => ({ ...v, ...fields }))}
                className="input-premium"
              />
              <input type="text" placeholder="Address" value={newVenue.address} onChange={e => setNewVenue(v => ({ ...v, address: e.target.value }))} className="input-premium" />
              <input type="text" placeholder="City" value={newVenue.city} onChange={e => setNewVenue(v => ({ ...v, city: e.target.value }))} className="input-premium" />
              <input type="text" placeholder="State" value={newVenue.state} onChange={e => setNewVenue(v => ({ ...v, state: e.target.value }))} className="input-premium" />
              <input type="url" placeholder="Website (https://...)" value={newVenue.website} onChange={e => setNewVenue(v => ({ ...v, website: e.target.value }))} className="input-premium md:col-span-2" />
              <textarea placeholder="Notes" value={newVenue.notes} onChange={e => setNewVenue(v => ({ ...v, notes: e.target.value }))} className="input-premium min-h-[72px] md:col-span-2" rows={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cowc-gold text-white font-semibold hover:bg-opacity-90">
                <Save className="w-4 h-4" /> Save Venue
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-5 py-2.5 rounded-xl bg-gray-200 text-cowc-dark font-semibold hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Venues List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-cowc-gold" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVenues.length === 0 && (
              <div className="card-premium p-16 text-center">
                <Building2 className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                <p className="text-xl text-cowc-gray mb-2">{searchQuery ? 'No venues match your search' : 'No venues yet'}</p>
                {!searchQuery && <button onClick={() => setShowAddForm(true)} className="text-cowc-gold font-semibold hover:underline">Add your first venue</button>}
              </div>
            )}

            {filteredVenues.map(venue => (
              <motion.div key={venue.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-premium p-5">
                {editingId === venue.id ? (
                  // Edit mode
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* Name with autocomplete in edit mode */}
                      <VenueNameField
                        value={editForm.name}
                        onChange={val => setEditForm(f => ({ ...f, name: val }))}
                        onFill={fields => setEditForm(f => ({ ...f, ...fields }))}
                        className="input-premium font-semibold"
                        placeholder="Venue name"
                      />
                      <div className="flex gap-2">
                        <input type="text" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="input-premium flex-1" placeholder="Address" />
                        <button
                          onClick={() => handleLookupAddress(venue.id, editForm.name)}
                          disabled={lookingUpId === venue.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cowc-gold/10 text-cowc-gold font-semibold text-xs hover:bg-cowc-gold/20 transition-colors flex-shrink-0"
                          title="Look up address via Google Maps"
                        >
                          {lookingUpId === venue.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                          Lookup
                        </button>
                      </div>
                      <input type="text" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="input-premium" placeholder="City" />
                      <input type="text" value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} className="input-premium" placeholder="State" />
                      <input type="url" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="input-premium md:col-span-2" placeholder="Website" />
                      <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="input-premium min-h-[60px] md:col-span-2" placeholder="Notes" rows={2} />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleSaveEdit(venue.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600">
                        <Save className="w-4 h-4" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl bg-gray-200 text-cowc-dark font-semibold hover:bg-gray-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-cowc-gold/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5 text-cowc-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-cowc-dark text-lg">{venue.name}</p>
                      {(venue.address || venue.city) && (
                        <p className="text-cowc-gray text-sm flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {venue.website && (
                        <a href={venue.website} target="_blank" rel="noopener noreferrer"
                          className="text-cowc-gold text-sm flex items-center gap-1 mt-1 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" />
                          {venue.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                      {venue.notes && <p className="text-xs text-cowc-light-gray mt-1 italic">{venue.notes}</p>}
                      {!venue.address && (
                        <button
                          onClick={() => handleLookupAddress(venue.id, venue.name)}
                          disabled={lookingUpId === venue.id}
                          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-cowc-gold hover:opacity-70 transition-opacity"
                        >
                          {lookingUpId === venue.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                          {lookingUpId === venue.id ? 'Looking up…' : 'Lookup address'}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleStartEdit(venue)} className="p-2 hover:bg-cowc-cream rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-cowc-dark" />
                      </button>
                      <button onClick={() => handleDelete(venue.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
