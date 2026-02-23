import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Plus, X, Save, ExternalLink,
  Phone, Mail, Globe, Building2, User, Users,
  ChevronDown, ChevronUp, Pencil, Trash2, AlertTriangle, UserPlus,
  Camera, Video, Flower2, Music2, Disc3, UtensilsCrossed, Cake,
  Scissors, Heart, Landmark, Car, ClipboardList, Armchair,
  Mail as MailIcon, Wine, Star, Link2, MapPin, Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { vendorsAPI } from '../services/unifiedAPI'
import { useToast } from './Toast'

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'photographer',   label: 'Photographer',    Icon: Camera,          color: '#7c3aed' },
  { value: 'videographer',   label: 'Videographer',    Icon: Video,           color: '#db2777' },
  { value: 'photo_video',    label: 'Photo & Video',   Icon: Camera,          color: '#7c3aed' },
  { value: 'florist',        label: 'Florist',         Icon: Flower2,         color: '#16a34a' },
  { value: 'dj',             label: 'DJ',              Icon: Disc3,           color: '#0891b2' },
  { value: 'band',           label: 'Band',            Icon: Music2,          color: '#d97706' },
  { value: 'caterer',        label: 'Catering',        Icon: UtensilsCrossed, color: '#ea580c' },
  { value: 'baker',          label: 'Wedding Cake',    Icon: Cake,            color: '#e879a0' },
  { value: 'hair_makeup',    label: 'Hair & Makeup',   Icon: Scissors,        color: '#9333ea' },
  { value: 'officiant',      label: 'Officiant',       Icon: Heart,           color: '#e11d48' },
  { value: 'venue',          label: 'Venue',           Icon: Landmark,        color: '#0f766e' },
  { value: 'transportation', label: 'Transportation',  Icon: Car,             color: '#1d4ed8' },
  { value: 'planner',        label: 'Planner',         Icon: ClipboardList,   color: '#d4a574' },
  { value: 'rentals',        label: 'Rentals',         Icon: Armchair,        color: '#92400e' },
  { value: 'stationery',     label: 'Stationery',      Icon: MailIcon,        color: '#6b7280' },
  { value: 'bar',            label: 'Bar / Beverages', Icon: Wine,            color: '#7f1d1d' },
  { value: 'other',          label: 'Other',           Icon: Star,            color: '#d4a574' },
]

const getCat = (val) =>
  CATEGORIES.find((c) => c.value === val) || { label: val || 'Other', Icon: Star, color: '#d4a574' }

const BLANK_FORM = {
  name: '', category: '', contact_email: '', phone: '', website: '', notes: '',
}

const ROLES = [
  'Owner', 'Lead Photographer', 'Second Shooter', 'Videographer',
  'Lead Coordinator', 'Day-of Coordinator', 'Assistant Coordinator',
  'Lead Florist', 'Assistant', 'DJ', 'Band Lead', 'Baker', 'Hair Stylist',
  'Makeup Artist', 'Officiant', 'Driver', 'Other',
]

// ─── Normalise company name for grouping ─────────────────────────────────────
const normalise = (name) => (name || '').toLowerCase().trim()

// ─── Group vendors by company name ───────────────────────────────────────────
// Returns array of { key, name, category, contact_email, phone, website, notes,
//                    weddings: [{...}], members: [{...}], vendorIds: [id,...] }
function groupVendors(vendors) {
  const map = {}
  vendors.forEach((v) => {
    const key = normalise(v.name)
    if (!map[key]) {
      map[key] = {
        key,
        name: v.name,
        category: v.category,
        contact_email: v.contact_email,
        phone: v.phone,
        website: v.website,
        notes: v.notes,
        weddings: [],
        members: [],
        vendorIds: [],
        _firstVendor: v,
      }
    }
    // Collect weddings
    if (v.wedding) {
      const alreadyAdded = map[key].weddings.some((w) => w.id === v.wedding.id)
      if (!alreadyAdded) map[key].weddings.push(v.wedding)
    }
    // Collect members
    if (v.members?.length) {
      v.members.forEach((m) => {
        const already = map[key].members.some((x) => x.id === m.id)
        if (!already) map[key].members.push(m)
      })
    }
    map[key].vendorIds.push(v.id)
  })
  return Object.values(map)
}

// ─── Individual member row ────────────────────────────────────────────────────
function MemberRow({ member, onEditMember, onDeleteMember }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-5 border-b last:border-b-0 border-cowc-sand/40 bg-cowc-cream/30 pl-14">
      <div className="w-7 h-7 rounded-full bg-white border border-cowc-sand flex items-center justify-center flex-shrink-0">
        <User className="w-3.5 h-3.5 text-cowc-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-cowc-dark truncate">{member.name}</p>
          {member.role && (
            <span className="text-xs bg-cowc-gold/10 text-cowc-gold font-medium px-1.5 py-0.5 rounded-full">
              {member.role}
            </span>
          )}
          {member.contact_email && (
            <a href={`mailto:${member.contact_email}`}
              className="text-xs text-cowc-gray hover:text-cowc-gold transition-colors flex items-center gap-1">
              <Mail className="w-3 h-3" />{member.contact_email}
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`}
              className="text-xs text-cowc-gray hover:text-cowc-dark transition-colors flex items-center gap-1">
              <Phone className="w-3 h-3" />{member.phone}
            </a>
          )}
        </div>
        {member.notes && (
          <p className="text-xs text-cowc-gray italic truncate">{member.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEditMember(member)}
          className="p-1.5 hover:bg-blue-50 rounded-lg text-cowc-gray hover:text-blue-600 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDeleteMember(member)}
          className="p-1.5 hover:bg-red-50 rounded-lg text-cowc-gray hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Company row (grouped) ────────────────────────────────────────────────────
function CompanyRow({ group, index, onEdit, onDelete, onEditMember, onDeleteMember, onAddMember }) {
  const [expanded, setExpanded] = useState(false)
  const cat = getCat(group.category)
  const CatIcon = cat.Icon || Star
  const hasMembers = group.members.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="bg-white border-b border-cowc-sand/50 last:border-b-0"
    >
      {/* Company row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Category icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${cat.color}18` }}
        >
          <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
        </div>

        {/* Company name + wedding pills + contact */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Company name + wedding pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-cowc-dark text-sm leading-snug">{group.name}</span>
            {group.weddings.map((w) => (
              <span
                key={w.id}
                className="inline-flex items-center gap-1 text-xs bg-cowc-gold/10 text-cowc-gold font-medium px-2 py-0.5 rounded-full"
              >
                <Link2 className="w-3 h-3" />
                {w.couple_name}
              </span>
            ))}
          </div>
          {/* Line 2: contact links */}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {group.contact_email && (
              <a href={`mailto:${group.contact_email}`}
                className="text-xs text-cowc-gray hover:text-cowc-gold transition-colors flex items-center gap-1">
                <Mail className="w-3 h-3" />{group.contact_email}
              </a>
            )}
            {group.phone && (
              <a href={`tel:${group.phone}`}
                className="text-xs text-cowc-gray hover:text-cowc-dark transition-colors flex items-center gap-1">
                <Phone className="w-3 h-3" />{group.phone}
              </a>
            )}
            {group.website && (
              <a href={group.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-cowc-gray hover:text-cowc-dark transition-colors flex items-center gap-1">
                <Globe className="w-3 h-3" />{group.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {group.notes && (
              <span className="text-xs text-cowc-gray italic truncate max-w-[200px]">{group.notes}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasMembers && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-cowc-gray hover:text-cowc-dark transition-colors px-2 py-1.5 rounded-lg hover:bg-cowc-cream font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              {group.members.length}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button onClick={() => onAddMember(group._firstVendor)}
            className="p-1.5 hover:bg-cowc-cream rounded-lg text-cowc-gray hover:text-cowc-gold transition-colors"
            title="Add person">
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(group._firstVendor)}
            className="p-1.5 hover:bg-blue-50 rounded-lg text-cowc-gray hover:text-blue-600 transition-colors"
            title="Edit vendor">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(group._firstVendor)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-cowc-gray hover:text-red-500 transition-colors"
            title="Delete vendor">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable members */}
      <AnimatePresence>
        {hasMembers && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-cowc-sand/40 overflow-hidden"
          >
            {group.members.map((m) => (
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

// ─── Category section ────────────────────────────────────────────────────────
function CategorySection({ category, groups, ...rowProps }) {
  const cat = getCat(category)
  const CatIcon = cat.Icon || Star

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-cowc-cream/60 border-b border-cowc-sand/50">
        <CatIcon className="w-3.5 h-3.5" style={{ color: cat.color }} />
        <span className="text-xs font-bold uppercase tracking-wide text-cowc-gray">{cat.label}</span>
        <span className="text-xs text-cowc-light-gray">({groups.length})</span>
      </div>
      {groups.map((group, i) => (
        <CompanyRow key={group.key} group={group} index={i} {...rowProps} />
      ))}
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function VendorListScreen() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [vendors, setVendors]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  // multiselect: empty Set = All, otherwise filter to selected
  const [selectedCats, setSelectedCats] = useState(new Set())

  // Add / edit vendor modal
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(BLANK_FORM)
  const [saving, setSaving]         = useState(false)
  const [lookingUp, setLookingUp]   = useState(false)
  const [googleResult, setGoogleResult] = useState(null) // { name, address, phone, website, rating, totalRatings }

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

  // ── Toggle a category in the multiselect ──────────────────────────────────
  const toggleCat = (val) => {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(val)) { next.delete(val) } else { next.add(val) }
      return next
    })
  }

  const clearCats = () => setSelectedCats(new Set())

  // ── Filtering & grouping ──────────────────────────────────────────────────
  const filtered = vendors
    .filter((v) => selectedCats.size === 0 || selectedCats.has(v.category))
    .filter((v) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        v.name?.toLowerCase().includes(q) ||
        v.contact_email?.toLowerCase().includes(q) ||
        v.phone?.includes(q) ||
        v.notes?.toLowerCase().includes(q) ||
        v.wedding?.couple_name?.toLowerCase().includes(q) ||
        v.members?.some((m) => m.name?.toLowerCase().includes(q))
      )
    })

  // Group by company name, then by category
  const grouped = groupVendors(filtered)
  const byCategory = {}
  grouped.forEach((g) => {
    const key = g.category || 'other'
    if (!byCategory[key]) byCategory[key] = []
    byCategory[key].push(g)
  })

  // Sort categories by the CATEGORIES order
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const ai = CATEGORIES.findIndex(c => c.value === a)
    const bi = CATEGORIES.findIndex(c => c.value === b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const usedCats = [...new Set(vendors.map((v) => v.category).filter(Boolean))]
    .sort((a, b) => {
      const ai = CATEGORIES.findIndex(c => c.value === a)
      const bi = CATEGORIES.findIndex(c => c.value === b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  const totalCompanies = groupVendors(vendors).length
  const totalPeople    = vendors.reduce((n, v) => n + 1 + (v.members?.length || 0), 0)
  const totalCats      = new Set(vendors.map((v) => v.category).filter(Boolean)).size

  // ── Vendor add / edit ──────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(BLANK_FORM)
    setEditTarget(null)
    setGoogleResult(null)
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
    setGoogleResult(null)
    setShowModal(true)
  }

  const handleGoogleLookup = async () => {
    if (!form.name.trim()) { toast.error('Enter a vendor name first'); return }
    setLookingUp(true)
    setGoogleResult(null)
    try {
      const { lookupBusinessByName } = await import('../lib/googleMaps')
      const categoryLabel = form.category
        ? form.category.replace(/_/g, ' ')
        : ''
      const result = await lookupBusinessByName(form.name.trim(), categoryLabel)
      if (result) {
        setGoogleResult(result)
        // Auto-fill empty fields
        setForm(f => ({
          ...f,
          phone:   f.phone   || result.phone   || f.phone,
          website: f.website || result.website || f.website,
        }))
      } else {
        toast.error('Not found on Google — try a more specific name')
      }
    } catch {
      toast.error('Lookup failed')
    } finally {
      setLookingUp(false)
    }
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

  const rowProps = {
    onEdit: openEdit,
    onDelete: setDeleteTarget,
    onEditMember: openEditMember,
    onDeleteMember: setDeleteMemberTarget,
    onAddMember: openAddMember,
  }

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
        <div className="max-w-4xl mx-auto">
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
                All vendors across your weddings
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
              { label: 'Companies',    value: totalCompanies },
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

      <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">

        {/* ── Search + Category pills ───────────────────────────── */}
        <div className="card-premium p-4 mb-6">
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
            <input
              type="text"
              placeholder="Search by name, email, wedding…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {/* All pill — clears selection */}
            <button
              onClick={clearCats}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCats.size === 0
                  ? 'bg-cowc-dark text-white'
                  : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'
              }`}
            >
              All
            </button>
            {usedCats.map((val) => {
              const c = getCat(val)
              const PillIcon = c.Icon || Star
              const active = selectedCats.has(val)
              return (
                <button
                  key={val}
                  onClick={() => toggleCat(val)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'text-white ring-2 ring-offset-1'
                      : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'
                  }`}
                  style={active ? { backgroundColor: c.color, ringColor: c.color } : {}}
                >
                  <PillIcon className="w-3 h-3" />
                  {c.label}
                </button>
              )
            })}
          </div>
          {selectedCats.size > 1 && (
            <p className="text-xs text-cowc-gold mt-2 font-semibold">
              {selectedCats.size} categories selected
            </p>
          )}
        </div>

        {/* ── Vendor list ────────────────────────────────────────── */}
        {grouped.length === 0 ? (
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
          <div className="card-premium overflow-hidden">
            {sortedCategories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                groups={byCategory[category]}
                {...rowProps}
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
                    Company / Vendor Name <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); setGoogleResult(null) }}
                      className="input-premium flex-1" placeholder="e.g. Bleu Bite Catering" required />
                    <button
                      type="button"
                      onClick={handleGoogleLookup}
                      disabled={lookingUp || !form.name.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cowc-gold/10 text-cowc-gold font-semibold text-xs hover:bg-cowc-gold/20 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Look up on Google Business"
                    >
                      {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                      {lookingUp ? 'Searching…' : 'Find on Google'}
                    </button>
                  </div>

                  {/* Google result preview */}
                  {googleResult && (
                    <div className="mt-2 p-3 rounded-xl bg-green-50 border border-green-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-green-700">
                        <MapPin className="w-3 h-3" />
                        Found on Google
                        {googleResult.rating && (
                          <span className="ml-auto flex items-center gap-0.5 text-cowc-gold font-semibold">
                            <Star className="w-3 h-3 fill-cowc-gold" />
                            {googleResult.rating} ({googleResult.totalRatings?.toLocaleString()})
                          </span>
                        )}
                      </div>
                      {googleResult.address && <p className="text-green-600">{googleResult.address}</p>}
                      {googleResult.phone   && <p className="text-green-600">{googleResult.phone}</p>}
                      {googleResult.website && <p className="text-green-600 truncate">{googleResult.website.replace(/^https?:\/\//, '')}</p>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-1.5">Category</label>
                  <select value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-premium">
                    <option value="">Select a category…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
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
                  <h2 className="text-2xl font-serif text-cowc-dark mb-1">Remove Vendor?</h2>
                  <p className="text-cowc-gray text-sm">
                    <span className="font-semibold text-cowc-dark">{deleteTarget.name}</span>
                    {deleteTarget.wedding && (
                      <> ({deleteTarget.wedding.couple_name})</>
                    )}
                    {deleteTarget.members?.length > 0 && (
                      <> and their {deleteTarget.members.length} team member{deleteTarget.members.length !== 1 ? 's' : ''}</>
                    )} will be permanently deleted.
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
