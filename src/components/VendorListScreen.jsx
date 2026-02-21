import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ShoppingBag, Search, ChevronDown, ChevronUp,
  Plus, X, Save, ExternalLink, Phone, Mail, DollarSign, Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { vendorsAPI, weddingsAPI } from '../services/unifiedAPI'
import { formatDate } from '../utils/dates'
import { useToast } from './Toast'

const CATEGORIES = [
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

const getCategoryLabel = (val) => {
  const c = CATEGORIES.find(c => c.value === val)
  return c ? c.label.replace(/^\S+\s/, '') : (val || '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const STATUS_STYLES = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  booked:    'bg-blue-100 text-blue-700',
}

function VendorRow({ vendor, index, navigate, isMember = false }) {
  const [expanded, setExpanded] = useState(true)
  const hasMembers = !isMember && vendor.members?.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <div className={`card-premium hover:shadow-xl transition-all ${isMember ? 'ml-8 border-l-4 border-cowc-gold/30 rounded-l-none' : ''}`}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            {!isMember && (
              <div className="w-10 h-10 bg-cowc-cream rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-cowc-gold" />
              </div>
            )}
            {isMember && (
              <div className="w-8 h-8 bg-cowc-cream rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-cowc-gray" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-cowc-dark truncate ${isMember ? 'text-base' : 'text-lg'}`}>
                    {vendor.name}
                    {hasMembers && (
                      <span className="ml-2 text-xs font-normal text-cowc-gray bg-cowc-cream px-2 py-0.5 rounded-full">
                        {vendor.members.length} member{vendor.members.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  {!isMember && (
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-cowc-cream text-cowc-gray font-medium">
                        {getCategoryLabel(vendor.category)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_STYLES[vendor.status] || 'bg-gray-100 text-gray-600'}`}>
                        {vendor.status}
                      </span>
                      {vendor.submitted_by_couple && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                          💡 Couple suggestion
                        </span>
                      )}
                    </div>
                  )}
                  {isMember && vendor.notes && (
                    <p className="text-xs text-cowc-gray mt-0.5 italic">{vendor.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isMember && vendor.cost != null && (
                    <div className="flex items-center gap-1 text-cowc-dark font-semibold">
                      <DollarSign className="w-4 h-4 text-cowc-gold" />
                      {Number(vendor.cost).toLocaleString()}
                    </div>
                  )}
                  {hasMembers && (
                    <button onClick={() => setExpanded(e => !e)}
                      className="p-1.5 hover:bg-cowc-cream rounded-lg text-cowc-gray transition-colors">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap text-sm text-cowc-gray mt-1.5">
                {!isMember && vendor.wedding && (
                  <button onClick={() => navigate(`/wedding/${vendor.wedding_id}`)}
                    className="flex items-center gap-1.5 text-cowc-gold hover:underline font-medium">
                    <ExternalLink className="w-3.5 h-3.5" />
                    {vendor.wedding.couple_name}
                    {vendor.wedding.wedding_date && (
                      <span className="text-xs text-cowc-gray font-normal">
                        — {formatDate(vendor.wedding.wedding_date, 'MMM d, yyyy')}
                      </span>
                    )}
                  </button>
                )}
                {vendor.contact_email && (
                  <a href={`mailto:${vendor.contact_email}`} className="flex items-center gap-1.5 hover:text-cowc-dark transition-colors">
                    <Mail className="w-3.5 h-3.5" />{vendor.contact_email}
                  </a>
                )}
                {vendor.phone && (
                  <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 hover:text-cowc-dark transition-colors">
                    <Phone className="w-3.5 h-3.5" />{vendor.phone}
                  </a>
                )}
                {!isMember && vendor.website && (
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-cowc-dark transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />Website
                  </a>
                )}
              </div>

              {!isMember && vendor.notes && (
                <p className="mt-1.5 text-sm text-cowc-gray line-clamp-2">{vendor.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Team members */}
        {hasMembers && expanded && (
          <div className="border-t border-cowc-sand/50 divide-y divide-cowc-sand/30">
            {vendor.members.map((member, mi) => (
              <VendorRow key={member.id} vendor={member} index={mi} navigate={navigate} isMember />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function VendorListScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const modalRef = useRef(null)

  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  // Add vendor modal
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [weddings, setWeddings] = useState([])
  const [addForm, setAddForm] = useState({
    wedding_id: '', name: '', category: '', contact_email: '',
    phone: '', website: '', notes: '', cost: '', status: 'pending',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadVendors()
    weddingsAPI.getAll().then(setWeddings).catch(() => {})
  }, [])

  const loadVendors = async () => {
    try {
      setLoading(true)
      const data = await vendorsAPI.getAll()
      setVendors(data)
    } catch (error) {
      console.error('Error loading vendors:', error)
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  const handleAddVendor = async (e) => {
    e.preventDefault()
    if (!addForm.wedding_id) { toast.error('Please select a wedding'); return }
    if (!addForm.name.trim()) { toast.error('Please enter a vendor name'); return }
    if (!addForm.category) { toast.error('Please select a category'); return }
    setSaving(true)
    try {
      await vendorsAPI.create({
        wedding_id: addForm.wedding_id,
        name: addForm.name,
        category: addForm.category,
        contact_email: addForm.contact_email || '',
        phone: addForm.phone || '',
        website: addForm.website || '',
        notes: addForm.notes || '',
        cost: addForm.cost ? parseFloat(addForm.cost) : null,
        status: addForm.status,
      })
      toast.success('Vendor added!')
      setShowAddVendor(false)
      setAddForm({ wedding_id: '', name: '', category: '', contact_email: '', phone: '', website: '', notes: '', cost: '', status: 'pending' })
      await loadVendors()
    } catch (err) {
      console.error('Error adding vendor:', err)
      toast.error('Failed to add vendor')
    } finally {
      setSaving(false)
    }
  }

  const getFiltered = () => {
    let list = [...vendors]

    if (filterCategory !== 'all') list = list.filter(v => v.category === filterCategory)
    if (filterStatus !== 'all') list = list.filter(v => v.status === filterStatus)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(v =>
        v.name?.toLowerCase().includes(q) ||
        v.wedding?.couple_name?.toLowerCase().includes(q) ||
        v.contact_email?.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'wedding': return (a.wedding?.couple_name || '').localeCompare(b.wedding?.couple_name || '')
        case 'category': return (a.category || '').localeCompare(b.category || '')
        case 'status': return (a.status || '').localeCompare(b.status || '')
        default: return (a.name || '').localeCompare(b.name || '')
      }
    })

    return list
  }

  const filtered = getFiltered()

  // Count includes top-level companies; members shown separately
  const allMembers = vendors.flatMap(v => v.members || [])
  const stats = {
    total: vendors.length,
    totalPeople: vendors.length + allMembers.length,
    confirmed: vendors.filter(v => v.status === 'confirmed').length,
    pending: vendors.filter(v => v.status === 'pending').length,
    categories: new Set(vendors.map(v => v.category)).size,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading vendors…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-serif font-light">All Vendors</h1>
                <p className="text-white/70 mt-2">Manage vendors across all weddings</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddVendor(true)}
              className="flex items-center gap-2 px-5 py-3 bg-cowc-gold hover:bg-cowc-gold/90 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Vendor
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Vendors', value: stats.total },
              { label: 'Confirmed',     value: stats.confirmed, color: 'text-green-400' },
              { label: 'Pending',       value: stats.pending,   color: 'text-yellow-400' },
              { label: 'Categories',    value: stats.categories },
            ].map(({ label, value, color = '' }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className={`text-3xl font-serif font-light mb-1 ${color}`}>{value}</div>
                <div className="text-sm text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        {/* Filters */}
        <div className="card-premium p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray" />
              <input
                type="text"
                placeholder="Search vendors or weddings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none"
              />
            </div>

            {/* Category filter */}
            <div className="relative">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none font-semibold text-cowc-dark cursor-pointer">
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray pointer-events-none" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none font-semibold text-cowc-dark cursor-pointer">
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="booked">Booked</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none font-semibold text-cowc-dark cursor-pointer">
                <option value="name">Sort by Name</option>
                <option value="wedding">Sort by Wedding</option>
                <option value="category">Sort by Category</option>
                <option value="status">Sort by Status</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Vendor List */}
        <div className="space-y-3">
          {filtered.map((vendor, index) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              index={index}
              navigate={navigate}
            />
          ))}

          {filtered.length === 0 && (
            <div className="card-premium p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
              <p className="text-xl text-cowc-gray">No vendors found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      <AnimatePresence>
        {showAddVendor && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAddVendor(false)}
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-serif text-cowc-dark">Add Vendor</h2>
                <button onClick={() => setShowAddVendor(false)} className="p-2 hover:bg-cowc-cream rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Wedding *</label>
                  <select value={addForm.wedding_id} onChange={(e) => setAddForm({ ...addForm, wedding_id: e.target.value })}
                    className="input-premium" required>
                    <option value="">Select a wedding…</option>
                    {weddings.map(w => (
                      <option key={w.id} value={w.id}>{w.couple_name} — {formatDate(w.wedding_date, 'MMM d, yyyy')}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Vendor Name *</label>
                    <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      className="input-premium" placeholder="e.g., John's Photography" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Category *</label>
                    <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                      className="input-premium" required>
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Email</label>
                    <input type="email" value={addForm.contact_email} onChange={(e) => setAddForm({ ...addForm, contact_email: e.target.value })}
                      className="input-premium" placeholder="vendor@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Phone</label>
                    <input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="input-premium" placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Website</label>
                    <input type="url" value={addForm.website} onChange={(e) => setAddForm({ ...addForm, website: e.target.value })}
                      className="input-premium" placeholder="https://…" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Cost ($)</label>
                    <input type="number" value={addForm.cost} onChange={(e) => setAddForm({ ...addForm, cost: e.target.value })}
                      className="input-premium" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Status</label>
                    <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} className="input-premium">
                      <option value="pending">Pending</option>
                      <option value="booked">Booked</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Notes</label>
                  <textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    className="input-premium min-h-[80px]" placeholder="Additional details…" rows={3} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddVendor(false)}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    {saving ? 'Adding…' : 'Add Vendor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
