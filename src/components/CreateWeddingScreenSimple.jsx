import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Save, Heart, MapPin, Plus, Loader2,
  Calendar, Users, DollarSign, Palette, Mail, Package, CheckCircle2, Check,
} from 'lucide-react'
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

  useEffect(() => {
    const timer = setTimeout(() => searchVenues(query), 200)
    return () => clearTimeout(timer)
  }, [query])

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
      let resolvedAddress = ''
      setLookingUp(true)
      try {
        const res = await supabase.functions.invoke('lookup-venue-address', {
          body: { venueName: name },
        })
        if (res.data?.address) resolvedAddress = res.data.address
      } catch {}
      setLookingUp(false)

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

// ── Step config ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'couple',  label: 'The Couple',     icon: Heart },
  { id: 'details', label: 'Wedding Details', icon: Calendar },
  { id: 'style',   label: 'Style & Vibe',   icon: Palette },
  { id: 'review',  label: 'Review',         icon: CheckCircle2 },
]

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateWeddingScreenSimple() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [direction, setDirection] = useState(1) // 1=forward, -1=back

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
    'Romantic Garden', 'Modern Bohemian', 'Classic Elegant', 'Rustic Charm',
    'Mountain Elegant', 'Beach Chic', 'Urban Modern', 'Vintage Glam',
    'Desert Luxe', 'Autumn Romance',
  ]

  const set = (key) => (e) => setFormData(f => ({ ...f, [key]: e.target.value }))

  // ── Validation per step ───────────────────────────────────────────────────
  const validateStep = (s) => {
    if (s === 0) {
      if (!formData.brideFirstName.trim() && !formData.groomFirstName.trim()) {
        toast.error('Please enter at least one name')
        return false
      }
    }
    if (s === 1) {
      if (!formData.weddingDate) {
        toast.error('Please select a wedding date')
        return false
      }
      if (!formData.venueName.trim()) {
        toast.error('Please enter a venue name')
        return false
      }
    }
    return true
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setDirection(1)
    setStep(s => s + 1)
  }

  const goBack = () => {
    setDirection(-1)
    setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const weddingDate = new Date(formData.weddingDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (weddingDate < today) toast.warning('Wedding date is in the past')

      await weddingsAPI.create({
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
      })
      toast.success(`Wedding created for ${coupleName || 'new couple'}!`)
      navigate('/admin')
    } catch (error) {
      console.error('Error creating wedding:', error)
      toast.error('Failed to create wedding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Slide variants ────────────────────────────────────────────────────────
  const variants = {
    enter:  (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit:   (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
  }

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    if (step === 0) return (
      <StepCard title="The Couple" icon={Heart}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Bride's First Name">
            <input type="text" placeholder="Jessica" value={formData.brideFirstName} onChange={set('brideFirstName')} className="input-premium" />
          </Field>
          <Field label="Groom's First Name">
            <input type="text" placeholder="Mark" value={formData.groomFirstName} onChange={set('groomFirstName')} className="input-premium" />
          </Field>

          {coupleName && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 px-4 py-3 bg-cowc-cream rounded-xl border border-cowc-sand">
                <Heart className="w-4 h-4 text-cowc-gold fill-cowc-gold flex-shrink-0" />
                <span className="font-serif text-cowc-dark text-lg">{coupleName}</span>
              </div>
            </div>
          )}

          <Field label="Couple's Email" hint="For portal invite">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
              <input type="email" placeholder="jessica@example.com" value={formData.coupleEmail} onChange={set('coupleEmail')} className="input-premium pl-9" />
            </div>
          </Field>
          <Field label="Package">
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray pointer-events-none" />
              <select value={formData.packageType} onChange={set('packageType')} className="input-premium pl-9">
                {packageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </Field>
        </div>
      </StepCard>
    )

    if (step === 1) return (
      <StepCard title="Wedding Details" icon={Calendar}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Wedding Date *">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray pointer-events-none" />
              <input type="date" value={formData.weddingDate} onChange={set('weddingDate')} className="input-premium pl-9" required />
            </div>
          </Field>
          <Field label="Guest Count">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray pointer-events-none" />
              <input type="number" placeholder="100" value={formData.guestCount} onChange={set('guestCount')} className="input-premium pl-9" />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="Venue *">
              <VenueSelector
                value={formData.venueName}
                onChange={(name) => setFormData(f => ({ ...f, venueName: name }))}
                onAddressResolved={(addr) => setFormData(f => ({ ...f, venueAddress: addr }))}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Venue Address" hint="Auto-filled when venue is found">
              <textarea placeholder="Address" value={formData.venueAddress} onChange={set('venueAddress')} className="input-premium min-h-[72px]" rows={2} />
            </Field>
          </div>

          <Field label="Budget">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray pointer-events-none" />
              <input type="number" placeholder="35000" value={formData.budget} onChange={set('budget')} className="input-premium pl-9" />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea placeholder="Special requests, preferences, important details..." value={formData.notes} onChange={set('notes')} className="input-premium min-h-[96px]" rows={3} />
            </Field>
          </div>
        </div>
      </StepCard>
    )

    if (step === 2) return (
      <StepCard title="Style & Vibe" icon={Palette}>
        <div className="space-y-6">
          <Field label="Wedding Vibe">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {vibeOptions.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, vibe: v }))}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    formData.vibe === v
                      ? 'border-cowc-gold bg-cowc-gold text-white'
                      : 'border-cowc-sand bg-white text-cowc-dark hover:border-cowc-gold/40'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <div>
            <p className="text-sm font-semibold text-cowc-dark mb-3">Theme Colors</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Primary',   key: 'primaryColor' },
                { label: 'Secondary', key: 'secondaryColor' },
                { label: 'Accent',    key: 'accentColor' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData[key]}
                    onChange={(e) => setFormData(f => ({ ...f, [key]: e.target.value }))}
                    className="w-12 h-12 rounded-lg border-2 border-cowc-sand cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-xs text-cowc-gray mb-1">{label}</p>
                    <input
                      type="text"
                      value={formData[key]}
                      onChange={(e) => setFormData(f => ({ ...f, [key]: e.target.value }))}
                      className="input-premium text-sm py-2"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Live preview */}
            <div
              className="mt-5 p-6 rounded-xl text-white text-center"
              style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}
            >
              <p className="text-xl font-serif">{coupleName || 'Color Preview'}</p>
              <p className="text-sm opacity-75 mt-1">Couple's dashboard gradient</p>
            </div>
          </div>
        </div>
      </StepCard>
    )

    if (step === 3) return (
      <StepCard title="Review & Create" icon={CheckCircle2}>
        <div className="space-y-4">
          <ReviewSection title="The Couple">
            <ReviewRow label="Names" value={coupleName || '—'} />
            <ReviewRow label="Email" value={formData.coupleEmail || '—'} />
            <ReviewRow label="Package" value={formData.packageType || '—'} />
          </ReviewSection>
          <ReviewSection title="Wedding Details">
            <ReviewRow label="Date" value={formData.weddingDate || '—'} />
            <ReviewRow label="Venue" value={formData.venueName || '—'} />
            {formData.venueAddress && <ReviewRow label="Address" value={formData.venueAddress} />}
            <ReviewRow label="Guest Count" value={formData.guestCount} />
            <ReviewRow label="Budget" value={`$${Number(formData.budget).toLocaleString()}`} />
            {formData.notes && <ReviewRow label="Notes" value={formData.notes} />}
          </ReviewSection>
          <ReviewSection title="Style">
            <ReviewRow label="Vibe" value={formData.vibe} />
            <div className="flex items-center gap-2 mt-2">
              {[formData.primaryColor, formData.secondaryColor, formData.accentColor].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ background: c }} />
              ))}
              <span className="text-sm text-cowc-gray ml-1">Theme colors</span>
            </div>
          </ReviewSection>
        </div>
      </StepCard>
    )
  }

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-5xl font-serif font-light">New Wedding</h1>
              {coupleName && <p className="text-white/80 mt-1 text-lg font-serif">{coupleName}</p>}
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done = i < step
              const active = i === step
              const Icon = s.icon
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => { if (i < step) { setDirection(-1); setStep(i) } }}
                    className={`flex flex-col items-center gap-1 group ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      done ? 'bg-green-500' : active ? 'bg-cowc-gold' : 'bg-white/10'
                    }`}>
                      {done
                        ? <Check className="w-5 h-5 text-white" />
                        : <Icon className="w-5 h-5 text-white" />
                      }
                    </div>
                    <span className={`text-xs hidden sm:block transition-colors ${active ? 'text-white' : 'text-white/50'}`}>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${i < step ? 'bg-green-500' : 'bg-white/20'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-cowc-dark bg-white border border-cowc-sand hover:bg-cowc-cream transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-6 py-3 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
            >
              Cancel
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? 'Creating...' : `Create Wedding${coupleName ? ` for ${coupleName}` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function StepCard({ title, icon: Icon, children }) {
  return (
    <div className="card-premium p-8">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-full bg-cowc-gold/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-cowc-gold" />
        </div>
        <h2 className="text-2xl font-serif text-cowc-dark">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-cowc-dark mb-1.5">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-cowc-gray">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function ReviewSection({ title, children }) {
  return (
    <div className="bg-cowc-cream rounded-xl p-5">
      <p className="text-xs font-semibold text-cowc-gray uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-cowc-gray w-28 flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-cowc-dark flex-1">{String(value)}</span>
    </div>
  )
}
