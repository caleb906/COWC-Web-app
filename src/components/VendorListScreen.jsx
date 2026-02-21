import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Plus, X, Save, ExternalLink,
  Phone, Mail, Globe, Building2, User, Users,
  ChevronDown, ChevronUp, Pencil, Trash2, AlertTriangle, UserPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { vendorsAPI } from '../services/unifiedAPI'
import { useToast } from './Toast'

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'photographer',   label: 'Photographer',    emoji: '📷' },
  { value: 'videographer',   label: 'Videographer',    emoji: '🎥' },
  { value: 'photo_video',    label: 'Photo & Video',   emoji: '📷' },
  { value: 'florist',        label: 'Florist',         emoji: '💐' },
  { value: 'dj',             label: 'DJ',              emoji: '🎧' },
  { value: 'band',           label: 'Band',            emoji: '🎶' },
  { value: 'caterer',        label: 'Catering',        emoji: '🍽️' },
  { value: 'baker',          label: 'Wedding Cake',    emoji: '🎂' },
  { value: 'hair_makeup',    label: 'Hair & Makeup',   emoji: '💄' },
  { value: 'officiant',      label: 'Officiant',       emoji: '💍' },
  { value: 'venue',          label: 'Venue',           emoji: '🏛️' },
  { value: 'transportation', label: 'Transportation',  emoji: '🚗' },
  { value: 'planner',        label: 'Planner',         emoji: '📋' },
  { value: 'rentals',        label: 'Rentals',         emoji: '🪑' },
  { value: 'stationery',     label: 'Stationery',      emoji: '✉️' },
  { value: 'bar',            label: 'Bar / Beverages', emoji: '🍾' },
  { value: 'other',          label: 'Other',           emoji: '⭐' },
]

const getCat = (val) =>
  CATEGORIES.find((c) => c.value === val) || { label: val || 'Other', emoji: '⭐' }

const BLANK_FORM = {
  name: '', category: '', contact_email: '', phone: '', website: '', notes: '',
}

const ROLES = [
  'Owner', 'Lead Photographer', 'Second Shooter', 'Videographer',
  'Lead Coordinator', 'Day-of Coordinator', 'Assistant Coordinator',
  'Lead Florist', 'Assistant', 'DJ', 'Band Lead', 'Baker', 'Hair Stylist',
  'Makeup Artist', 'Officiant', 'Driver', 'Other',
]

// ─── Individual member row inside a company card ─────────────────────────────
function MemberRow({ member, onEditMember, onDeleteMember }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b last:border-b-0 border-cowc-sand/40 bg-cowc-cream/30">
      <div className="w-8 h-8 rounded-full bg-white border border-cowc-sand flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-cowc-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-cowc-dark truncate">{member.name}</p>
          {member.role && (
            <span className="text-xs bg-cowc-gold/10 text-cowc-gold font-medium px-2 py-0.5 rounded-full">
              {member.role}
            </span>
          )}
        </div>
        {member.notes && (
          <p className="text-xs text-cowc-gray italic truncate mt-0.5">{member.notes}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {member.contact_email && (
            <a href={`mailto:${member.contact_email}`}
              className="text-xs text-cowc-gold hover:underline flex items-center gap-1">
              <Mail className="w-3 h-3" />{member.contact_email}
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`}
              className="text-xs text-cowc-gray hover:text-cowc-dark flex items-center gap-1">
              <Phone className="w-3 h-3" />{member.phone}
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEditMember(member)}
          className="p-1.5 hover:bg-blue-50 rounded-lg text-cowc-gray hover:text-blue-600 transition-colors"
          title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDeleteMember(member)}
          className="p-1.5 hover:bg-red-50 rounded-lg text-cowc-gray hover:text-red-500 transition-colors"
          title="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Vendor card ──────────────────────────────────────────────────────────────
function VendorCard({ vendor, index, onEdit, onDelete, onEditMember, onDeleteMember, onAddMember }) {
  const [expanded, setExpanded] = useState(false)
  const cat = getCat(vendor.category)
  const hasMembers = vendor.members?.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="card-premium overflow-hidden"
    >
      {/* Card body */}
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Category emoji */}
          <div className="w-11 h-11 rounded-xl bg-cowc-cream flex items-center justify-center text-xl flex-shrink-0">
            {cat.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-cowc-dark text-base leading-snug truncate">
                  {vendor.name}
                </h3>
                <p className="text-xs text-cowc-gray mt-0.5 font-medium">{cat.label}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onEdit(vendor)}
                  className="p-1.5 hover:bg-blue-50 rounded-lg text-cowc-gray hover:text-blue-600 transition-colors"
                  title="Edit vendor">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(vendor)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-cowc-gray hover:text-red-500 transition-colors"
                  title="Delete vendor">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contact links */}
            <div className="mt-2.5 space-y-1.5">
              {vendor.contact_email && (
                <a href={`mailto:${vendor.contact_email}`}
                  className="flex items-center gap-2 text-xs text-cowc-gray hover:text-cowc-gold transition-colors">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0 text-cowc-gold/70" />
                  <span className="truncate">{vendor.contact_email}</span>
                </a>
              )}
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`}
                  className="flex items-center gap-2 text-xs text-cowc-gray hover:text-cowc-dark transition-colors">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0 text-cowc-gold/70" />
                  <span>{vendor.phone}</span>
                </a>
              )}
              {vendor.website && (
                <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-cowc-gray hover:text-cowc-dark transition-colors">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0 text-cowc-gold/70" />
                  <span className="truncate">{vendor.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>

            {vendor.notes && (
              <p className="mt-2.5 text-xs text-cowc-gray italic line-clamp-2 leading-relaxed">
                {vendor.notes}
              </p>
            )}
          </div>
        </div>

        {/* Footer: add person + expand members */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cowc-sand/50">
          <button
            onClick={() => onAddMember(vendor)}
            className="flex items-center gap-1.5 text-xs text-cowc-gray hover:text-cowc-gold transition-colors font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add person
          </button>

          {hasMembers && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1.5 text-xs text-cowc-gray hover:text-cowc-dark transition-colors font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              {vendor.members.length} {vendor.members.length === 1 ? 'person' : 'people'}
              {expanded
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable members */}
      <AnimatePresence>
        {hasMembers && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-cowc-sand/50 overflow-hidden"
          >
            {vendor.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onEditMember={onEditMember}
                onDeleteMember={onDeleteMember}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function VendorListScreen() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [vendors, setVendors]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [catFilter, setCatFilter]     = useState('all')

  // Add / edit vendor modal
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(BLANK_FORM)
  const [saving, setSaving]         = useState(false)

  // Delete vendor
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Add / edit member modal
  const [addMemberFor, setAddMemberFor]           = useState(null)
  const [editMemberTarget, setEditMemberTarget]   = useState(null)
  const [memberForm, setMemberForm]               = useState({ name: '', role: '', contact_email: '', phone: '', notes: '' })
  const [savingMember, setSavingMember]           = useState(false)
  const [deleteMemberTarget, setDeleteMemberTarget] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      setVendors(await vendorsAPI.getAll())
    } catch {
      toast.error('Failed to load vendor directory')
    } finally {
      setLoading(false)
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = vendors
    .filter((v) => catFilter === 'all' || v.category === catFilter)
    .filter((v) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        v.name?.toLowerCase().includes(q) ||
        v.contact_email?.toLowerCase().includes(q) ||
        v.phone?.includes(q) ||
        v.notes?.toLowerCase().includes(q) ||
        v.members?.some((m) => m.name?.toLowerCase().includes(q))
      )
    })

  const usedCats = [...new Set(vendors.map((v) => v.category).filter(Boolean))]

  // ── Vendor add / edit ──────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(BLANK_FORM)
    setEditTarget(null)
    setShowModal(true)
  }

  const openEdit = (vendor) => {
    setForm({
      name:          vendor.name || '',
      category:      vendor.category || '',
      contact_email: vendor.contact_email || '',
      phone:         vendor.phone || '',
      website:       vendor.website || '',
      notes:         vendor.notes || '',
    })
    setEditTarget(vendor)
    setShowModal(true)
  }

  const handleSaveVendor = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await vendorsAPI.update(editTarget.id, {
          name:          form.name.trim(),
          category:      form.category || 'other',
          contact_email: form.contact_email.trim(),
          phone:         form.phone.trim(),
          website:       form.website.trim(),
          notes:         form.notes.trim(),
        })
        toast.success('Vendor updated')
      } else {
        await vendorsAPI.create({
          name:          form.name.trim(),
          category:      form.category || 'other',
          contact_email: form.contact_email.trim(),
          phone:         form.phone.trim(),
          website:       form.website.trim(),
          notes:         form.notes.trim(),
          status:        'confirmed',
          vendor_role:   'company',
        })
        toast.success(`${form.name.trim()} added to directory`)
      }
      setShowModal(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error(editTarget ? 'Failed to update' : 'Failed to add vendor')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete vendor ──────────────────────────────────────────────────────────
  const handleDeleteVendor = async () => {
    if (!deleteTarget) return
    try {
      await vendorsAPI.delete(deleteTarget.id)
      toast.success(`${deleteTarget.name} removed from directory`)
      setDeleteTarget(null)
      await load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  // ── Member add / edit ──────────────────────────────────────────────────────
  const openAddMember = (parentVendor) => {
    setAddMemberFor(parentVendor)
    setEditMemberTarget(null)
    setMemberForm({ name: '', role: '', contact_email: '', phone: '', notes: '' })
  }

  const openEditMember = (member) => {
    setEditMemberTarget(member)
    setAddMemberFor(null)
    setMemberForm({
      name:          member.name || '',
      role:          member.role || '',
      contact_email: member.contact_email || '',
      phone:         member.phone || '',
      notes:         member.notes || '',
    })
  }

  const handleSaveMember = async (e) => {
    e.preventDefault()
    if (!memberForm.name.trim()) { toast.error('Name is required'); return }
    setSavingMember(true)
    try {
      if (editMemberTarget) {
        await vendorsAPI.update(editMemberTarget.id, {
          name:          memberForm.name.trim(),
          role:          memberForm.role.trim(),
          contact_email: memberForm.contact_email.trim(),
          phone:         memberForm.phone.trim(),
          notes:         memberForm.notes.trim(),
        })
        toast.success('Updated')
      } else {
        await vendorsAPI.addMember(addMemberFor.id, {
          wedding_id:    addMemberFor.wedding_id || null,
          name:          memberForm.name.trim(),
          role:          memberForm.role.trim(),
          contact_email: memberForm.contact_email.trim(),
          phone:         memberForm.phone.trim(),
          notes:         memberForm.notes.trim(),
          status:        'confirmed',
        })
        toast.success(`${memberForm.name.trim()} added to ${addMemberFor.name}`)
      }
      setAddMemberFor(null)
      setEditMemberTarget(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save')
    } finally {
      setSavingMember(false)
    }
  }

  // ── Delete member ──────────────────────────────────────────────────────────
  const handleDeleteMember = async () => {
    if (!deleteMemberTarget) return
    try {
      await vendorsAPI.delete(deleteMemberTarget.id)
      toast.success(`${deleteMemberTarget.name} removed`)
      setDeleteMemberTarget(null)
      await load()
    } catch {
      toast.error('Failed to remove')
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalPeople = vendors.reduce((n, v) => n + 1 + (v.members?.length || 0), 0)
  const totalCats   = new Set(vendors.map((v) => v.category).filter(Boolean)).size

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading directory…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-serif font-light">Vendor Directory</h1>
              <p className="text-white/60 mt-1.5 text-sm">
                Master contact database — companies &amp; individuals
              </p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-3 bg-cowc-gold hover:bg-cowc-gold/90 text-white font-semibold rounded-xl transition-all shadow-lg flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Vendor</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Companies',    value: vendors.length },
              { label: 'Total People', value: totalPeople },
              { label: 'Categories',   value: totalCats },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-3xl font-serif font-light">{value}</div>
                <div className="text-xs text-white/60 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-20">

        {/* ── Search + Category pills ───────────────────────────── */}
        <div className="card-premium p-5 mb-8">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
            <input
              type="text"
              placeholder="Search by name, email, phone, notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCatFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                catFilter === 'all'
                  ? 'bg-cowc-dark text-white'
                  : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'
              }`}
            >
              All
            </button>
            {usedCats.map((val) => {
              const c = getCat(val)
              return (
                <button
                  key={val}
                  onClick={() => setCatFilter(catFilter === val ? 'all' : val)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    catFilter === val
                      ? 'bg-cowc-gold text-white'
                      : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'
                  }`}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Card grid ─────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <Building2 className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
            <p className="text-xl text-cowc-gray font-serif mb-2">
              {vendors.length === 0 ? 'No vendors yet' : 'No results'}
            </p>
            {vendors.length === 0 && (
              <>
                <p className="text-sm text-cowc-gray mb-6">
                  Start building your vendor database — add companies and individuals you work with.
                </p>
                <button onClick={openAdd}
                  className="px-6 py-3 bg-cowc-gold text-white font-semibold rounded-xl hover:bg-cowc-gold/90 transition-all">
                  Add your first vendor
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vendor, i) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                index={i}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onEditMember={openEditMember}
                onDeleteMember={setDeleteMemberTarget}
                onAddMember={openAddMember}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Vendor Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-serif text-cowc-dark">
                  {editTarget ? 'Edit Vendor' : 'Add Vendor'}
                </h2>
                <button onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-cowc-cream rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-premium" placeholder="Company or person name" required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Category</label>
                  <select value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-premium">
                    <option value="">Select a category…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Email</label>
                    <input type="email" value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      className="input-premium" placeholder="contact@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Phone</label>
                    <input type="tel" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="input-premium" placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Website</label>
                  <input type="url" value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="input-premium" placeholder="https://…" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Notes</label>
                  <textarea value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="input-premium min-h-[80px] resize-none"
                    placeholder="Pricing range, style notes, anything useful…" rows={3} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 px-5 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 px-5 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add to Directory'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Member Modal ──────────────────────────────── */}
      <AnimatePresence>
        {(addMemberFor || editMemberTarget) && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setAddMemberFor(null)
                setEditMemberTarget(null)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-serif text-cowc-dark">
                    {editMemberTarget ? 'Edit Person' : 'Add Person'}
                  </h2>
                  {addMemberFor && (
                    <p className="text-sm text-cowc-gray mt-0.5">
                      Adding to <span className="font-semibold text-cowc-dark">{addMemberFor.name}</span>
                    </p>
                  )}
                </div>
                <button onClick={() => { setAddMemberFor(null); setEditMemberTarget(null) }}
                  className="p-2 hover:bg-cowc-cream rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    className="input-premium" placeholder="Full name" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Email</label>
                    <input type="email" value={memberForm.contact_email}
                      onChange={(e) => setMemberForm({ ...memberForm, contact_email: e.target.value })}
                      className="input-premium" placeholder="email@…" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Phone</label>
                    <input type="tel" value={memberForm.phone}
                      onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                      className="input-premium" placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Role</label>
                  <select value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="input-premium">
                    <option value="">Select a role…</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Notes</label>
                  <input type="text" value={memberForm.notes}
                    onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                    className="input-premium" placeholder="Anything useful to know about this person…" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button"
                    onClick={() => { setAddMemberFor(null); setEditMemberTarget(null) }}
                    className="flex-1 py-3 px-5 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingMember}
                    className="flex-1 py-3 px-5 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {savingMember ? 'Saving…' : editMemberTarget ? 'Save' : 'Add Person'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Vendor Confirm ────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif text-cowc-dark mb-1">Remove from Directory?</h2>
                  <p className="text-cowc-gray text-sm">
                    <span className="font-semibold text-cowc-dark">{deleteTarget.name}</span>
                    {deleteTarget.members?.length > 0 && (
                      <> and their {deleteTarget.members.length} team member{deleteTarget.members.length !== 1 ? 's' : ''}</>
                    )} will be permanently deleted. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all">
                  Cancel
                </button>
                <button onClick={handleDeleteVendor}
                  className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Member Confirm ────────────────────────────────── */}
      <AnimatePresence>
        {deleteMemberTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7"
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-serif text-cowc-dark mb-1">Remove person?</h3>
                  <p className="text-sm text-cowc-gray">
                    <span className="font-semibold text-cowc-dark">{deleteMemberTarget.name}</span> will be removed.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteMemberTarget(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all text-sm">
                  Cancel
                </button>
                <button onClick={handleDeleteMember}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all text-sm">
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
