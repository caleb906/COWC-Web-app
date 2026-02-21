import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  ArrowLeft, Calendar, MapPin, Users, Phone, Mail,
  Edit, Save, X, Plus, Trash2, Clock, Heart,
  CheckCircle2, Circle, AlertCircle, DollarSign, Edit2,
  Palette, ExternalLink, Link, Sparkles, Loader2, RefreshCw,
  Eye, ClipboardList, ShoppingBag, ListMusic, UserPlus, ChevronDown, ChevronUp, GripVertical,
  Send, Package, Tag, Check
} from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/appStore'
import { useWeddingTheme } from '../contexts/WeddingThemeContext'
import { weddingsAPI, tasksAPI, vendorsAPI, timelineAPI } from '../services/unifiedAPI'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { formatDate, daysUntil, isPastDue } from '../utils/dates'
import { primaryGradient, primaryAccent, primaryAlpha, primaryPageBg, primaryCardBg } from '../utils/colorUtils'
import { AddTaskModal, AddVendorModal, AddTimelineModal } from './AddModals'

// Default timeline templates
const DEFAULT_TIMELINE = [
  { title: 'Rehearsal Dinner', time: '6:00 PM', description: 'Night before wedding', order: 1 },
  { title: 'Ceremony Begins', time: '4:00 PM', description: '', order: 2 },
  { title: 'Cocktail Hour', time: '5:00 PM', description: '', order: 3 },
  { title: 'Reception Begins', time: '6:00 PM', description: '', order: 4 },
  { title: 'First Dance', time: '7:00 PM', description: '', order: 5 },
  { title: 'Dinner Service', time: '7:30 PM', description: '', order: 6 },
  { title: 'Cake Cutting', time: '8:30 PM', description: '', order: 7 },
  { title: 'Last Dance', time: '10:00 PM', description: '', order: 8 },
]

export default function WeddingDetailPageFull() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { theme, setWeddingTheme, resetTheme } = useWeddingTheme()
  const toast = useToast()
  
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [wedding, setWedding] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    const valid = ['overview', 'tasks', 'vendors', 'timeline', 'style', 'rentals']
    return valid.includes(tabParam) ? tabParam : 'overview'
  })

  // Invite couple state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)

  // Rentals state (admin view)
  const [rentals, setRentals] = useState([])
  const [rentalsLoading, setRentalsLoading] = useState(false)
  const [inventoryItems, setInventoryItems] = useState([])
  const [showAddRental, setShowAddRental] = useState(false)
  const [addRentalItem, setAddRentalItem] = useState(null)
  const [addRentalQty, setAddRentalQty] = useState(1)
  const [addRentalNotes, setAddRentalNotes] = useState('')
  const [addRentalSaving, setAddRentalSaving] = useState(false)
  const [inventorySearch, setInventorySearch] = useState('')
  const [editing, setEditing] = useState(false)
  const [editedWedding, setEditedWedding] = useState(null)
  
  // Modal states
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [showAddTimeline, setShowAddTimeline] = useState(false)
  const [showFABTray, setShowFABTray] = useState(false)

  // Edit states for items
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingVendorId, setEditingVendorId] = useState(null)
  const [editingTimelineId, setEditingTimelineId] = useState(null)
  const [editForms, setEditForms] = useState({})

  // Vendor team member add state
  const [addMemberForVendorId, setAddMemberForVendorId] = useState(null)
  const [memberForm, setMemberForm] = useState({ name: '', contact_email: '', phone: '', notes: '' })
  const [savingMember, setSavingMember] = useState(false)

  const handleAddMember = async (parentVendorId) => {
    if (!memberForm.name.trim()) return
    setSavingMember(true)
    try {
      await vendorsAPI.addMember(parentVendorId, {
        wedding_id: wedding.id,
        name: memberForm.name.trim(),
        contact_email: memberForm.contact_email,
        phone: memberForm.phone,
        notes: memberForm.notes,
        status: 'confirmed',
      })
      setAddMemberForVendorId(null)
      setMemberForm({ name: '', contact_email: '', phone: '', notes: '' })
      await loadWedding()
      toast.success('Team member added!')
    } catch (e) {
      toast.error('Failed to add member')
    } finally {
      setSavingMember(false)
    }
  }

  useEffect(() => {
    loadWedding()
    return () => resetTheme()
  }, [id])

  useEffect(() => {
    if (activeTab === 'rentals') loadRentals()
  }, [activeTab, id])

  const loadWedding = async () => {
    try {
      setLoading(true)
      const weddingData = await weddingsAPI.getById(id)
      
      if (!weddingData) {
        navigate('/')
        return
      }
      
      // Add default timeline if empty and user can edit
      if ((!weddingData.timeline_items || weddingData.timeline_items.length === 0) && canEdit) {
        await addDefaultTimeline(id)
        const refreshed = await weddingsAPI.getById(id)
        setWedding(refreshed)
        setEditedWedding(refreshed)
      } else {
        setWedding(weddingData)
        setEditedWedding(weddingData)
      }
      
      // Apply wedding theme for all roles (drives header gradient)
      const finalData = weddingData
      if (finalData?.theme) {
        setWeddingTheme(finalData.theme)
      }
    } catch (error) {
      console.error('Error loading wedding:', error)
      console.log
    } finally {
      setLoading(false)
    }
  }

  const addDefaultTimeline = async (weddingId) => {
    try {
      await Promise.all(
        DEFAULT_TIMELINE.map(item =>
          timelineAPI.create({
            wedding_id: weddingId,
            title: item.title,
            time: item.time,
            description: item.description,
            sort_order: item.order,
          })
        )
      )
    } catch (error) {
      console.error('Error adding default timeline:', error)
    }
  }

  const canEdit = user.role === 'admin' || user.role === 'coordinator'
  const isCouple = user.role === 'couple'

  const handleDelete = async () => {
    const doubleCheck = window.prompt(
      `This will permanently delete ${wedding.couple_name}'s wedding, including all tasks, vendors, timeline items, and coordinator assignments.\n\nType DELETE to confirm:`
    )

    if (doubleCheck !== 'DELETE') {
      if (doubleCheck !== null) toast.error('Deletion cancelled — you must type DELETE to confirm.')
      return
    }

    try {
      await weddingsAPI.delete(id)
      navigate('/admin')
    } catch (error) {
      console.error('Error deleting wedding:', error)
      toast.error('Failed to delete wedding')
    }
  }

  const handleSave = async () => {
    try {
      await weddingsAPI.update(id, {
        couple_name: editedWedding.couple_name,
        wedding_date: editedWedding.wedding_date,
        venue_name: editedWedding.venue_name,
        venue_address: editedWedding.venue_address,
        guest_count: editedWedding.guest_count,
        budget: editedWedding.budget,
        notes: editedWedding.notes,
        status: editedWedding.status,
        package_type: editedWedding.package_type ?? null,
      })

      setWedding(editedWedding)
      setEditing(false)
      toast.success('Wedding details saved!')
      await loadWedding()
    } catch (error) {
      console.error('Error saving wedding:', error)
      toast.error('Failed to save changes: ' + (error.message || 'Unknown error'))
    }
  }

  // ── Invite couple ──────────────────────────────────────────────────────────
  const handleInviteCouple = async () => {
    if (!inviteEmail.trim()) { toast.error('Please enter an email address'); return }
    setInviteSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-couple-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            weddingId: id,
            email: inviteEmail.trim(),
            coupleName: wedding.couple_name,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send invite')
      toast.success(`Invite sent to ${inviteEmail}!`)
      setShowInviteModal(false)
      setInviteEmail('')
      await loadWedding()
    } catch (err) {
      toast.error('Failed to send invite: ' + err.message)
    } finally {
      setInviteSending(false)
    }
  }

  // ── Rentals (admin assigns inventory to wedding) ────────────────────────────
  const loadRentals = async () => {
    if (!id) return
    setRentalsLoading(true)
    try {
      const [{ data: res }, { data: inv }] = await Promise.all([
        supabase
          .from('inventory_reservations')
          .select('*, inventory_items(*)')
          .eq('wedding_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory_items')
          .select('*')
          .eq('active', true)
          .order('sort_order')
          .order('created_at'),
      ])
      setRentals(res || [])
      setInventoryItems(inv || [])
    } finally {
      setRentalsLoading(false)
    }
  }

  const handleAddRentalItem = async () => {
    if (!addRentalItem) return
    setAddRentalSaving(true)
    try {
      const { error } = await supabase.from('inventory_reservations').insert({
        item_id: addRentalItem.id,
        wedding_id: id,
        quantity: addRentalQty,
        notes: addRentalNotes,
        status: 'confirmed', // admin-assigned items are auto-confirmed
      })
      if (error) throw error
      toast.success(`${addRentalItem.name} added!`)
      setShowAddRental(false)
      setAddRentalItem(null)
      setAddRentalQty(1)
      setAddRentalNotes('')
      await loadRentals()
    } catch (err) {
      toast.error('Failed to add item: ' + err.message)
    } finally {
      setAddRentalSaving(false)
    }
  }

  const handleRentalStatusChange = async (rentalId, newStatus) => {
    try {
      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: newStatus })
        .eq('id', rentalId)
      if (error) throw error
      setRentals(rentals.map(r => r.id === rentalId ? { ...r, status: newStatus } : r))
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleRemoveRental = async (rentalId) => {
    if (!window.confirm('Remove this item from the wedding?')) return
    try {
      const { error } = await supabase.from('inventory_reservations').delete().eq('id', rentalId)
      if (error) throw error
      toast.success('Item removed')
      setRentals(rentals.filter(r => r.id !== rentalId))
    } catch (err) {
      toast.error('Failed to remove item')
    }
  }

  const handleTaskToggle = async (task) => {
    try {
      if (task.completed) {
        await tasksAPI.uncomplete(task.id)
      } else {
        await tasksAPI.complete(task.id)
      }
      await loadWedding()
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return

    try {
      await tasksAPI.delete(taskId)
      toast.success('Task deleted')
      await loadWedding()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await tasksAPI.update(taskId, {
        title: updates.title,
        description: updates.description || '',
        due_date: updates.due_date,
        assigned_to: updates.assigned_to,
      })
      setEditingTaskId(null)
      toast.success('Task updated')
      await loadWedding()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleConfirmCoupleVendor = async (vendorId) => {
    try {
      await vendorsAPI.update(vendorId, { status: 'confirmed' })
      toast.success('Vendor confirmed!')
      await loadWedding()
    } catch (error) {
      console.error('Error confirming vendor:', error)
      toast.error('Failed to confirm vendor')
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Delete this vendor?')) return

    try {
      await vendorsAPI.delete(vendorId)
      toast.success('Vendor deleted')
      await loadWedding()
    } catch (error) {
      console.error('Error deleting vendor:', error)
      toast.error('Failed to delete vendor')
    }
  }

  const handleUpdateVendor = async (vendorId, updates) => {
    try {
      await vendorsAPI.update(vendorId, {
        name: updates.name,
        category: updates.category,
        contact_email: updates.contact || updates.contact_email || '',
        phone: updates.phone || '',
        website: updates.website || '',
        notes: updates.notes || '',
        cost: updates.cost ? parseFloat(updates.cost) : null,
        status: updates.status || 'pending',
      })
      setEditingVendorId(null)
      toast.success('Vendor updated')
      await loadWedding()
    } catch (error) {
      console.error('Error updating vendor:', error)
      toast.error('Failed to update vendor')
    }
  }

  const handleDeleteTimeline = async (itemId) => {
    if (!window.confirm('Delete this timeline item?')) return

    try {
      await timelineAPI.delete(itemId)
      toast.success('Timeline item deleted')
      await loadWedding()
    } catch (error) {
      console.error('Error deleting timeline item:', error)
      toast.error('Failed to delete timeline item')
    }
  }

  const handleUpdateTimeline = async (itemId, updates) => {
    try {
      await timelineAPI.update(itemId, {
        title: updates.title,
        time: updates.time || '',
        description: updates.description || '',
        sort_order: Number(updates.order) || 0,
      })
      setEditingTimelineId(null)
      toast.success('Timeline item updated')
      await loadWedding()
    } catch (error) {
      console.error('Error updating timeline item:', error)
      toast.error('Failed to update timeline item')
    }
  }

  const handleTimelineReorder = async (reorderedItems) => {
    try {
      await timelineAPI.reorder(id, reorderedItems.map(item => item.id))
      await loadWedding()
    } catch (error) {
      console.error('Error reordering timeline:', error)
      toast.error('Failed to reorder timeline')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading wedding details...</p>
        </div>
      </div>
    )
  }

  if (!wedding) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif text-cowc-dark mb-2">Wedding Not Found</h2>
          <button onClick={() => navigate('/')} className="btn-premium mt-4">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const days = daysUntil(wedding.wedding_date)
  const completedTasks = wedding.tasks?.filter(t => t.completed).length || 0
  const totalTasks = wedding.tasks?.length || 0

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-white pt-12 pb-16 px-6 relative overflow-hidden"
        style={{
          background: primaryGradient(theme.gradientBase || theme.primary)
        }}
      >
        <div className="max-w-6xl mx-auto relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex-1">
              {editing && canEdit ? (
                <input
                  type="text"
                  value={editedWedding.couple_name}
                  onChange={(e) => setEditedWedding({ ...editedWedding, couple_name: e.target.value })}
                  className="text-3xl md:text-5xl font-serif font-light mb-2 bg-white/10 border-2 border-white/30 rounded-lg px-4 py-2 w-full"
                />
              ) : (
                <h1 className="text-3xl md:text-5xl font-serif font-light mb-2">
                  {wedding.couple_name}
                </h1>
              )}
              <p className="text-white/70 text-lg">
                {wedding.theme?.vibe || 'Wedding Details'}
              </p>
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-3">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-4 md:px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 transition-all flex items-center gap-2 font-semibold text-sm md:text-base"
                    >
                      <Save className="w-5 h-5" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setEditedWedding(wedding)
                      }}
                      className="px-4 md:px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2 font-semibold text-sm md:text-base"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 md:px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 font-semibold text-sm md:text-base"
                    >
                      <Edit className="w-5 h-5" />
                      Edit
                    </button>
                    {/* Invite Couple button — visible to all editors when couple hasn't signed up yet */}
                    {!wedding.couple_user_id && (
                      <button
                        onClick={() => {
                          setInviteEmail(wedding.couple_email || '')
                          setShowInviteModal(true)
                        }}
                        className={`px-4 md:px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-semibold text-sm md:text-base ${
                          wedding.couple_invite_sent_at
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-100'
                            : 'bg-cowc-gold hover:bg-cowc-gold/80 text-white'
                        }`}
                        title={wedding.couple_invite_sent_at ? `Invite sent — resend?` : 'Send portal invite to couple'}
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {wedding.couple_invite_sent_at ? 'Resend Invite' : 'Invite Couple'}
                        </span>
                      </button>
                    )}
                    {wedding.couple_user_id && (
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
                        <Check className="w-4 h-4" /> Portal Active
                      </span>
                    )}
                    {user.role === 'admin' && (
                      <>
                        <button
                          onClick={() => window.open(`/admin/preview/couple/${id}`, '_blank')}
                          className="px-4 md:px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 font-semibold text-white/80 hover:text-white text-sm md:text-base"
                          title="Preview what this couple sees (opens new tab)"
                        >
                          <Eye className="w-5 h-5" />
                          <span className="hidden sm:inline">Preview as Couple</span>
                        </button>
                        <button
                          onClick={handleDelete}
                          className="px-4 md:px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-all flex items-center gap-2 font-semibold text-red-300 hover:text-red-100 text-sm md:text-base"
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Key Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6">
              <Calendar className="w-6 md:w-8 h-6 md:h-8 mb-2 md:mb-3" style={{ color: theme.primary || '#d4a574' }} />
              {editing && canEdit ? (
                <input
                  type="date"
                  value={editedWedding.wedding_date}
                  onChange={(e) => setEditedWedding({ ...editedWedding, wedding_date: e.target.value })}
                  className="text-sm md:text-lg font-serif text-cowc-dark border-2 border-cowc-sand rounded px-2 py-1 w-full"
                />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-serif font-light mb-1 text-cowc-dark">
                    {formatDate(wedding.wedding_date, 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs md:text-sm text-cowc-gray">
                    {days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'Today!' : `${days} days away`}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6">
              <Users className="w-6 md:w-8 h-6 md:h-8 mb-2 md:mb-3" style={{ color: theme.primary || '#d4a574' }} />
              {editing && canEdit ? (
                <input
                  type="number"
                  value={editedWedding.guest_count}
                  onChange={(e) => setEditedWedding({ ...editedWedding, guest_count: parseInt(e.target.value) || 0 })}
                  className="text-lg md:text-2xl font-serif text-cowc-dark border-2 border-cowc-sand rounded px-2 py-1 w-full"
                />
              ) : (
                <div className="text-lg md:text-2xl font-serif font-light mb-1 text-cowc-dark">
                  {wedding.guest_count || 0}
                </div>
              )}
              <div className="text-xs md:text-sm text-cowc-gray">Guests</div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6">
              <CheckCircle2 className="w-6 md:w-8 h-6 md:h-8 mb-2 md:mb-3" style={{ color: theme.primary || '#d4a574' }} />
              <div className="text-lg md:text-2xl font-serif font-light mb-1 text-cowc-dark">
                {completedTasks}/{totalTasks}
              </div>
              <div className="text-xs md:text-sm text-cowc-gray">Tasks</div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6">
              <DollarSign className="w-6 md:w-8 h-6 md:h-8 mb-2 md:mb-3" style={{ color: theme.primary || '#d4a574' }} />
              {editing && canEdit ? (
                <input
                  type="number"
                  value={editedWedding.budget}
                  onChange={(e) => setEditedWedding({ ...editedWedding, budget: parseInt(e.target.value) || 0 })}
                  className="text-base md:text-xl font-serif text-cowc-dark border-2 border-cowc-sand rounded px-2 py-1 w-full"
                />
              ) : (
                <div className="text-lg md:text-2xl font-serif font-light mb-1 text-cowc-dark">
                  ${(wedding.budget || 0).toLocaleString()}
                </div>
              )}
              <div className="text-xs md:text-sm text-cowc-gray">Budget</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 relative z-20">
        {/* Tabs */}
        <div className="card-premium p-2 mb-8 flex flex-wrap gap-2">
          {[
            { id: 'overview',  label: 'Overview' },
            { id: 'tasks',     label: `Tasks (${totalTasks})` },
            { id: 'vendors',   label: `Vendors (${wedding.vendors?.length || 0})` },
            { id: 'timeline',  label: `Timeline (${wedding.timeline_items?.length || 0})` },
            { id: 'style',     label: 'Style' },
            ...(canEdit ? [{ id: 'rentals', label: `Rentals${rentals.length > 0 ? ` (${rentals.length})` : ''}` }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[100px] py-2 md:py-3 px-3 md:px-6 rounded-xl font-semibold transition-all text-sm md:text-base ${
                activeTab === tab.id
                  ? 'bg-cowc-gold text-white shadow-lg'
                  : 'text-cowc-gray hover:bg-cowc-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="card-premium p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-serif text-cowc-dark mb-6 flex items-center gap-3">
                  <MapPin className="w-5 md:w-6 h-5 md:h-6 text-cowc-gold" />
                  Venue Details
                </h3>
                {editing && canEdit ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">Venue Name</label>
                      <input
                        type="text"
                        value={editedWedding.venue_name}
                        onChange={(e) => setEditedWedding({ ...editedWedding, venue_name: e.target.value })}
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-cowc-dark mb-2">Venue Address</label>
                      <textarea
                        value={editedWedding.venue_address}
                        onChange={(e) => setEditedWedding({ ...editedWedding, venue_address: e.target.value })}
                        className="input-premium min-h-[80px]"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-cowc-dark text-lg">{wedding.venue_name}</p>
                      <p className="text-cowc-gray">{wedding.venue_address}</p>
                    </div>
                  </div>
                )}
              </div>

              {(canEdit || wedding.notes) && (
                <div className="card-premium p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-serif text-cowc-dark mb-6">Notes</h3>
                  {editing && canEdit ? (
                    <textarea
                      value={editedWedding.notes || ''}
                      onChange={(e) => setEditedWedding({ ...editedWedding, notes: e.target.value })}
                      className="input-premium min-h-[150px]"
                      rows={6}
                      placeholder="Add notes about the wedding..."
                    />
                  ) : (
                    <p className="text-cowc-gray whitespace-pre-wrap">
                      {wedding.notes || 'No notes yet'}
                    </p>
                  )}
                </div>
              )}

              {canEdit && (
                <div className="card-premium p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-serif text-cowc-dark mb-6">Wedding Status</h3>
                  {editing ? (
                    <select
                      value={editedWedding.status}
                      onChange={(e) => setEditedWedding({ ...editedWedding, status: e.target.value })}
                      className="input-premium"
                    >
                      <option value="Inquiry">Inquiry</option>
                      <option value="In Talks">In Talks</option>
                      <option value="Signed">Signed</option>
                      <option value="Planning">Planning</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className="px-4 py-2 rounded-lg font-semibold bg-amber-100 text-amber-700">
                      {wedding.status || 'Planning'}
                    </span>
                  )}
                </div>
              )}

              {canEdit && (
                <div className="card-premium p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-serif text-cowc-dark mb-4">
                    Service Package
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'Full Coordination',   label: 'Full Coordination',   color: 'bg-amber-100 text-amber-800 border-amber-300' },
                      { value: 'Partial Planning',    label: 'Partial Planning',    color: 'bg-purple-100 text-purple-800 border-purple-300' },
                      { value: 'Day of Coordination', label: 'Day of Coordination', color: 'bg-sky-100 text-sky-800 border-sky-300' },
                    ].map(pkg => {
                      const current = editing ? editedWedding.package_type : wedding.package_type
                      const isActive = current === pkg.value
                      const handleClick = () => {
                        if (!editing) return
                        const next = isActive ? null : pkg.value
                        setEditedWedding({ ...editedWedding, package_type: next })
                      }
                      return (
                        <button
                          key={pkg.value}
                          onClick={handleClick}
                          disabled={!editing}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                            isActive
                              ? `${pkg.color} border-current shadow-sm scale-105`
                              : editing
                                ? 'border-cowc-sand text-cowc-gray hover:border-gray-300'
                                : 'border-cowc-sand text-cowc-gray opacity-60 cursor-default'
                          }`}
                        >
                          {pkg.label}
                        </button>
                      )
                    })}
                    {!editing && !wedding.package_type && (
                      <span className="text-sm text-cowc-light-gray italic">Not set — click Edit to assign a package</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Style Tab */}
          {activeTab === 'style' && (
            <StyleTab
              wedding={wedding}
              canEdit={canEdit}
              onSaved={loadWedding}
              setWeddingTheme={setWeddingTheme}
            />
          )}

          {/* Rentals Tab — admin assigns inventory items to this wedding */}
          {activeTab === 'rentals' && canEdit && (
            <div className="space-y-6">
              {/* Add item button */}
              <button
                onClick={() => { setShowAddRental(true); setInventorySearch('') }}
                className="w-full py-4 rounded-xl border-2 border-dashed border-cowc-gold text-cowc-gold hover:bg-cowc-gold/5 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Assign Inventory Item
              </button>

              {rentalsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-cowc-gold animate-spin" />
                </div>
              ) : rentals.length === 0 ? (
                <div className="text-center py-16 card-premium">
                  <Package className="w-12 h-12 text-cowc-light-gray mx-auto mb-3" />
                  <p className="text-cowc-gray font-serif text-lg">No items assigned yet</p>
                  <p className="text-sm text-cowc-light-gray mt-1">Assign inventory items to this wedding above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rentals.map(rental => {
                    const item = rental.inventory_items
                    const STATUS_COLORS = {
                      requested:  'bg-amber-100 text-amber-700',
                      confirmed:  'bg-emerald-100 text-emerald-700',
                      declined:   'bg-red-100 text-red-600',
                      returned:   'bg-gray-100 text-gray-600',
                    }
                    return (
                      <div key={rental.id} className="card-premium p-4 flex items-center gap-4">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-cowc-cream flex-shrink-0">
                          {item?.photo_url
                            ? <img src={item.photo_url} alt={item?.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-cowc-light-gray" /></div>
                          }
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-cowc-dark truncate">{item?.name || 'Unknown item'}</p>
                          <p className="text-xs text-cowc-gray capitalize">{item?.category} · qty {rental.quantity}</p>
                          {rental.notes && <p className="text-xs text-cowc-gray italic mt-0.5">"{rental.notes}"</p>}
                        </div>
                        {/* Status selector */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={rental.status}
                            onChange={e => handleRentalStatusChange(rental.id, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[rental.status]}`}
                          >
                            <option value="requested">Requested</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="declined">Declined</option>
                            <option value="returned">Returned</option>
                          </select>
                          <button
                            onClick={() => handleRemoveRental(rental.id)}
                            className="p-1.5 rounded-full text-cowc-light-gray hover:text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab with Inline Edit */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {canEdit && (
                <button
                  onClick={() => setShowAddTask(true)}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-cowc-gold text-cowc-gold hover:bg-cowc-gold/5 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Task
                </button>
              )}
              
              {wedding.tasks && wedding.tasks.length > 0 ? (
                wedding.tasks.map((task) => (
                  <div key={task.id} className="card-premium p-6">
                    {editingTaskId === task.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          defaultValue={task.title}
                          onChange={(e) => setEditForms({...editForms, [`task-${task.id}-title`]: e.target.value})}
                          className="input-premium"
                          placeholder="Task title"
                        />
                        <textarea
                          defaultValue={task.description}
                          onChange={(e) => setEditForms({...editForms, [`task-${task.id}-description`]: e.target.value})}
                          className="input-premium min-h-[80px]"
                          placeholder="Description"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="date"
                            defaultValue={task.due_date}
                            onChange={(e) => setEditForms({...editForms, [`task-${task.id}-due_date`]: e.target.value})}
                            className="input-premium"
                          />
                          <select
                            defaultValue={task.assigned_to}
                            onChange={(e) => setEditForms({...editForms, [`task-${task.id}-assigned_to`]: e.target.value})}
                            className="input-premium"
                          >
                            <option value="couple">Couple</option>
                            <option value="coordinator">Coordinator</option>
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleUpdateTask(task.id, {
                              title: editForms[`task-${task.id}-title`] || task.title,
                              description: editForms[`task-${task.id}-description`] || task.description,
                              due_date: editForms[`task-${task.id}-due_date`] || task.due_date,
                              assigned_to: editForms[`task-${task.id}-assigned_to`] || task.assigned_to,
                            })}
                            className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="px-4 py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleTaskToggle(task)}
                          className="flex-shrink-0 mt-1"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-cowc-light-gray hover:text-cowc-gold transition-colors" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h4 className={`text-lg font-semibold mb-1 ${task.completed ? 'text-cowc-light-gray line-through' : 'text-cowc-dark'}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-cowc-gray mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-cowc-gray">
                            {task.due_date && (
                              <span className={isPastDue(task.due_date) && !task.completed ? 'text-red-500 font-semibold' : ''}>
                                Due: {formatDate(task.due_date, 'MMM d, yyyy')}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              task.assigned_to === 'couple' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {task.assigned_to === 'couple' ? 'Couple' : 'Coordinator'}
                            </span>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingTaskId(task.id)}
                              className="p-2 hover:bg-cowc-cream rounded-lg"
                            >
                              <Edit2 className="w-4 h-4 text-cowc-dark" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                !canEdit && (
                  <div className="card-premium p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                    <p className="text-xl text-cowc-gray mb-2">No tasks yet</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Vendors Tab with Inline Edit */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              {/* Couple suggestions banner */}
              {canEdit && wedding.vendors?.some(v => v.submitted_by_couple && v.status === 'pending') && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-600 text-sm font-bold">
                      {wedding.vendors.filter(v => v.submitted_by_couple && v.status === 'pending').length}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Couple has suggested vendors</p>
                    <p className="text-xs text-amber-600">Review below — confirm or edit to add them to the team</p>
                  </div>
                </div>
              )}

              {canEdit && (
                <button
                  onClick={() => setShowAddVendor(true)}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-cowc-gold text-cowc-gold hover:bg-cowc-gold/5 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Vendor
                </button>
              )}

              {wedding.vendors && wedding.vendors.length > 0 ? (
                wedding.vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    canEdit={canEdit}
                    editingVendorId={editingVendorId}
                    setEditingVendorId={setEditingVendorId}
                    editForms={editForms}
                    setEditForms={setEditForms}
                    handleUpdateVendor={handleUpdateVendor}
                    handleDeleteVendor={handleDeleteVendor}
                    handleConfirmCoupleVendor={handleConfirmCoupleVendor}
                    addMemberForVendorId={addMemberForVendorId}
                    setAddMemberForVendorId={setAddMemberForVendorId}
                    memberForm={memberForm}
                    setMemberForm={setMemberForm}
                    savingMember={savingMember}
                    handleAddMember={handleAddMember}
                  />
                ))
              ) : (
                !canEdit && (
                  <div className="card-premium p-12 text-center">
                    <Users className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                    <p className="text-xl text-cowc-gray mb-2">No vendors yet</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Timeline Tab with Inline Edit */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {canEdit && (
                <button
                  onClick={() => setShowAddTimeline(true)}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-cowc-gold text-cowc-gold hover:bg-cowc-gold/5 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Timeline Item
                </button>
              )}

              {wedding.timeline_items && wedding.timeline_items.length > 0 ? (
                wedding.timeline_items.map((item) => (
                  <div key={item.id} className="card-premium p-6">
                    {editingTimelineId === item.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          defaultValue={item.title}
                          onChange={(e) => setEditForms({...editForms, [`timeline-${item.id}-title`]: e.target.value})}
                          className="input-premium"
                          placeholder="Event title"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            defaultValue={item.time}
                            onChange={(e) => setEditForms({...editForms, [`timeline-${item.id}-time`]: e.target.value})}
                            className="input-premium"
                            placeholder="Time (e.g., 4:00 PM)"
                          />
                          <input
                            type="number"
                            defaultValue={item.order}
                            onChange={(e) => setEditForms({...editForms, [`timeline-${item.id}-order`]: e.target.value})}
                            className="input-premium"
                            placeholder="Order"
                          />
                        </div>
                        <textarea
                          defaultValue={item.description}
                          onChange={(e) => setEditForms({...editForms, [`timeline-${item.id}-description`]: e.target.value})}
                          className="input-premium min-h-[80px]"
                          placeholder="Description"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleUpdateTimeline(item.id, {
                              title: editForms[`timeline-${item.id}-title`] || item.title,
                              time: editForms[`timeline-${item.id}-time`] || item.time,
                              description: editForms[`timeline-${item.id}-description`] || item.description,
                              order: editForms[`timeline-${item.id}-order`] || item.order,
                            })}
                            className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTimelineId(null)}
                            className="px-4 py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 md:w-16 h-12 md:h-16 bg-cowc-gold/10 rounded-full flex items-center justify-center">
                            <Clock className="w-6 md:w-8 h-6 md:h-8 text-cowc-gold" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-lg font-semibold text-cowc-dark">{item.title}</h4>
                            <span className="text-cowc-gold font-semibold text-sm md:text-base">{item.time}</span>
                          </div>
                          {item.description && (
                            <p className="text-cowc-gray text-sm md:text-base">{item.description}</p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingTimelineId(item.id)}
                              className="p-2 hover:bg-cowc-cream rounded-lg"
                            >
                              <Edit2 className="w-4 h-4 text-cowc-dark" />
                            </button>
                            <button
                              onClick={() => handleDeleteTimeline(item.id)}
                              className="p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                !canEdit && (
                  <div className="card-premium p-12 text-center">
                    <Clock className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                    <p className="text-xl text-cowc-gray mb-2">No timeline items yet</p>
                  </div>
                )
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Invite Couple Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowInviteModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cowc-gold/10 flex items-center justify-center">
                    <Send className="w-5 h-5 text-cowc-gold" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif text-cowc-dark">Invite Couple to Portal</h2>
                    <p className="text-xs text-cowc-gray">{wedding.couple_name}</p>
                  </div>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-cowc-cream rounded-full">
                  <X className="w-5 h-5 text-cowc-gray" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {wedding.couple_invite_sent_at && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Invite previously sent on {formatDate(wedding.couple_invite_sent_at, 'MMM d, yyyy')}. Sending again will generate a new link.
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">
                    Couple's Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="jessica@example.com"
                    className="input-premium"
                    autoFocus
                  />
                  <p className="text-xs text-cowc-gray mt-2">
                    They'll receive an email with a link to create their account and access their wedding portal.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-cowc-sand text-cowc-gray font-semibold hover:bg-cowc-cream transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteCouple}
                    disabled={inviteSending || !inviteEmail.trim()}
                    className="flex-1 py-3 rounded-xl bg-cowc-gold text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Invite
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Rental Item Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddRental && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) { setShowAddRental(false); setAddRentalItem(null) } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                <h2 className="text-lg font-serif text-cowc-dark">
                  {addRentalItem ? `Add: ${addRentalItem.name}` : 'Browse Inventory'}
                </h2>
                <button onClick={() => { setShowAddRental(false); setAddRentalItem(null) }} className="p-2 hover:bg-cowc-cream rounded-full">
                  <X className="w-5 h-5 text-cowc-gray" />
                </button>
              </div>

              {!addRentalItem ? (
                /* Browse inventory */
                <div className="flex flex-col flex-1 min-h-0 p-6">
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={inventorySearch}
                      onChange={e => setInventorySearch(e.target.value)}
                      className="input-premium pl-10"
                      autoFocus
                    />
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cowc-gray" />
                  </div>
                  <div className="overflow-y-auto space-y-2 flex-1">
                    {inventoryItems
                      .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()))
                      .map(item => {
                        const alreadyAdded = rentals.some(r => r.item_id === item.id && r.status !== 'declined' && r.status !== 'returned')
                        return (
                          <button
                            key={item.id}
                            disabled={alreadyAdded}
                            onClick={() => { setAddRentalItem(item); setAddRentalQty(1); setAddRentalNotes('') }}
                            className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                              alreadyAdded
                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                : 'hover:bg-cowc-cream active:scale-99'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-cowc-cream flex-shrink-0">
                              {item.photo_url
                                ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-cowc-light-gray" /></div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-cowc-dark text-sm truncate">{item.name}</p>
                              <p className="text-xs text-cowc-gray capitalize">{item.category} · {item.quantity_total} total</p>
                            </div>
                            {alreadyAdded && (
                              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 flex-shrink-0">
                                <Check className="w-3.5 h-3.5" /> Added
                              </span>
                            )}
                          </button>
                        )
                      })
                    }
                    {inventoryItems.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-cowc-gray py-8">No items found</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Quantity & notes for selected item */
                <div className="p-6 space-y-4">
                  <div className="flex gap-3 p-3 bg-cowc-cream rounded-xl items-center">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex-shrink-0">
                      {addRentalItem.photo_url
                        ? <img src={addRentalItem.photo_url} alt={addRentalItem.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-cowc-light-gray" /></div>
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-cowc-dark">{addRentalItem.name}</p>
                      <p className="text-xs text-cowc-gray capitalize">{addRentalItem.category}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={addRentalItem.quantity_total}
                      value={addRentalQty}
                      onChange={e => setAddRentalQty(Number(e.target.value))}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Notes (optional)</label>
                    <textarea
                      value={addRentalNotes}
                      onChange={e => setAddRentalNotes(e.target.value)}
                      className="input-premium resize-none"
                      rows={2}
                      placeholder="Any details..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setAddRentalItem(null)} className="flex-1 py-3 rounded-xl border-2 border-cowc-sand text-cowc-gray font-semibold hover:bg-cowc-cream">
                      Back
                    </button>
                    <button
                      onClick={handleAddRentalItem}
                      disabled={addRentalSaving}
                      className="flex-1 py-3 rounded-xl bg-cowc-gold text-white font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addRentalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Add to Wedding
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modals */}
      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        weddingId={id}
        onTaskAdded={loadWedding}
      />
      <AddVendorModal 
        isOpen={showAddVendor} 
        onClose={() => setShowAddVendor(false)}
        weddingId={id}
        onVendorAdded={loadWedding}
      />
      <AddTimelineModal
        isOpen={showAddTimeline}
        onClose={() => setShowAddTimeline(false)}
        weddingId={id}
        onTimelineAdded={loadWedding}
      />

      {/* ── FAB (admin/coordinator only) ───────────────────── */}
      {canEdit && (
        <>
          <AnimatePresence>
            {showFABTray && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-2"
              >
                {[
                  { icon: ClipboardList, label: 'Add Task',         action: () => { setActiveTab('tasks');    setShowAddTask(true) } },
                  { icon: ShoppingBag,   label: 'Add Vendor',       action: () => { setActiveTab('vendors');  setShowAddVendor(true) } },
                  { icon: ListMusic,     label: 'Add Timeline Item', action: () => { setActiveTab('timeline'); setShowAddTimeline(true) } },
                ].map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={() => { action(); setShowFABTray(false) }}
                    className="flex items-center gap-3 bg-white text-cowc-dark rounded-2xl px-4 py-3 shadow-xl text-sm font-semibold hover:shadow-2xl transition-all active:scale-95"
                  >
                    <span>{label}</span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: primaryAlpha(theme.primary, 0.15) }}>
                      <Icon className="w-4 h-4" style={{ color: primaryAccent(theme.primary) }} />
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowFABTray(!showFABTray)}
            className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors"
            style={{ background: showFABTray ? '#2d3748' : (theme.primary || '#d4a574') }}
          >
            <Plus className={`w-7 h-7 text-white transition-transform duration-200 ${showFABTray ? 'rotate-45' : ''}`} />
          </motion.button>

          {showFABTray && (
            <div className="fixed inset-0 z-40" onClick={() => setShowFABTray(false)} />
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// AI Palette Widget — natural language → hex
// ─────────────────────────────────────────────
function AIPaletteWidget({ onApply }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setSuggestion(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-palette', {
        body: { description: prompt },
      })
      if (fnErr) throw new Error(fnErr.message || 'Function error')
      if (data?.error) throw new Error(data.error)
      setSuggestion(data)
    } catch (e) {
      setError(e.message || 'Could not generate palette — try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
  }

  return (
    <div className="card-premium p-6 md:p-8"
      style={{ border: '2px dashed rgba(212,165,116,0.45)' }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-cowc-gold/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-cowc-gold" />
        </div>
        <div>
          <h3 className="text-lg font-serif text-cowc-dark leading-tight">AI Color Assistant</h3>
          <p className="text-xs text-cowc-gray">Describe the vibe — get a full palette instantly</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "olive green, black and warm brown, rustic outdoor feel"'
          rows={2}
          className="flex-1 resize-none text-sm border border-cowc-sand rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cowc-gold/50 text-cowc-dark placeholder-cowc-light-gray font-sans"
        />
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="sm:w-28 flex items-center justify-center gap-2 bg-cowc-gold hover:bg-cowc-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl px-5 py-3 transition-all active:scale-95 flex-shrink-0"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Sparkles className="w-4 h-4" /> Generate</>
          }
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-3 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </p>
      )}

      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl overflow-hidden border border-cowc-sand"
        >
          {/* Mini gradient preview */}
          <div
            className="h-14 w-full"
            style={{ background: primaryGradient(suggestion.primary, '135deg') }}
          />

          <div className="bg-white p-4">
            {/* Swatches */}
            <div className="flex items-center gap-3 mb-3">
              {['primary', 'secondary', 'accent', 'color4', 'color5'].map((k, i) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <div
                    className="w-9 h-9 rounded-full border-2 border-white shadow-md"
                    style={{ background: suggestion[k] }}
                    title={['Primary','Secondary','Accent','Highlight','Background'][i]}
                  />
                  <span className="text-[9px] text-cowc-gray font-mono">{suggestion[k]}</span>
                </div>
              ))}
            </div>

            {/* Vibe + reasoning */}
            <p className="font-semibold text-cowc-dark text-sm">{suggestion.vibe}</p>
            <p className="text-xs text-cowc-gray italic mt-0.5 mb-4">{suggestion.reasoning}</p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onApply(suggestion)}
                className="flex-1 bg-cowc-dark text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-cowc-dark/90 transition-all active:scale-95"
              >
                Apply Palette
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="px-4 border border-cowc-sand rounded-xl text-cowc-gray hover:border-cowc-gold hover:text-cowc-gold transition-all"
                title="Regenerate"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <p className="text-[10px] text-cowc-light-gray mt-3 text-right">Powered by Claude AI</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Reusable Vendor Category Select
// ─────────────────────────────────────────────
const VENDOR_CATEGORIES = [
  { value: 'photo_video',    label: '📷🎥 Photo & Video (combined)' },
  { value: 'photographer',  label: '📷 Photographer' },
  { value: 'videographer',  label: '🎥 Videographer' },
  { value: 'florist',       label: '💐 Florist' },
  { value: 'caterer',       label: '🍽️ Caterer' },
  { value: 'band',          label: '🎸 Band' },
  { value: 'dj',            label: '🎧 DJ' },
  { value: 'baker',         label: '🎂 Baker' },
  { value: 'hair_makeup',   label: '💄 Hair & Makeup' },
  { value: 'officiant',     label: '💍 Officiant' },
  { value: 'planner',       label: '📋 Planner' },
  { value: 'venue',         label: '🏛️ Venue' },
  { value: 'transportation',label: '🚗 Transportation' },
  { value: 'rentals',       label: '🪑 Rentals' },
  { value: 'stationery',    label: '✉️ Stationery' },
  { value: 'bar',           label: '🍾 Bar' },
  { value: 'other',         label: '✨ Other' },
]

function formatVendorCategory(cat) {
  if (!cat) return ''
  const found = VENDOR_CATEGORIES.find(c => c.value === cat)
  if (found) return found.label.replace(/^[\p{Emoji}\s]+/u, '').trim()
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─────────────────────────────────────────────
// VendorCard — company card with nested team members
// ─────────────────────────────────────────────
function VendorCard({
  vendor, canEdit,
  editingVendorId, setEditingVendorId,
  editForms, setEditForms,
  handleUpdateVendor, handleDeleteVendor, handleConfirmCoupleVendor,
  addMemberForVendorId, setAddMemberForVendorId,
  memberForm, setMemberForm,
  savingMember, handleAddMember,
  isMember = false,
}) {
  const [membersExpanded, setMembersExpanded] = useState(true)
  const isEditing = editingVendorId === vendor.id
  const isAddingMember = addMemberForVendorId === vendor.id

  const statusStyle = (s) => {
    if (s === 'paid')      return 'bg-green-100 text-green-700'
    if (s === 'confirmed') return 'bg-blue-100 text-blue-700'
    if (s === 'cancelled') return 'bg-red-100 text-red-500'
    return 'bg-cowc-cream text-cowc-gray'
  }

  return (
    <div className={isMember
      ? 'ml-6 border-l-2 border-cowc-sand pl-4'
      : 'card-premium p-6'
    }>
      {isEditing ? (
        <div className="space-y-4">
          <input
            type="text"
            defaultValue={vendor.name}
            onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-name`]: e.target.value})}
            className="input-premium"
            placeholder="Vendor name"
          />
          {!isMember && (
            <select
              defaultValue={vendor.category}
              onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-category`]: e.target.value})}
              className="input-premium"
            >
              {VENDOR_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-4">
            <input type="email" defaultValue={vendor.contact}
              onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-contact`]: e.target.value})}
              className="input-premium" placeholder="Email" />
            <input type="tel" defaultValue={vendor.phone}
              onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-phone`]: e.target.value})}
              className="input-premium" placeholder="Phone" />
          </div>
          {!isMember && (
            <div className="grid grid-cols-2 gap-4">
              <input type="number" defaultValue={vendor.cost || ''}
                onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-cost`]: e.target.value})}
                className="input-premium" placeholder="Cost ($)" />
              <select defaultValue={vendor.status || 'pending'}
                onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-status`]: e.target.value})}
                className="input-premium">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          {!isMember && (
            <input type="url" defaultValue={vendor.website}
              onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-website`]: e.target.value})}
              className="input-premium" placeholder="Website" />
          )}
          <textarea defaultValue={vendor.notes}
            onChange={(e) => setEditForms({...editForms, [`vendor-${vendor.id}-notes`]: e.target.value})}
            className="input-premium min-h-[80px]" placeholder="Notes" />
          <div className="flex gap-3">
            <button
              onClick={() => handleUpdateVendor(vendor.id, {
                name: editForms[`vendor-${vendor.id}-name`] || vendor.name,
                category: editForms[`vendor-${vendor.id}-category`] || vendor.category,
                contact_email: editForms[`vendor-${vendor.id}-contact`] || vendor.contact,
                phone: editForms[`vendor-${vendor.id}-phone`] || vendor.phone,
                website: editForms[`vendor-${vendor.id}-website`] || vendor.website,
                notes: editForms[`vendor-${vendor.id}-notes`] || vendor.notes,
                cost: editForms[`vendor-${vendor.id}-cost`] ?? vendor.cost,
                status: editForms[`vendor-${vendor.id}-status`] || vendor.status,
              })}
              className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"
            >Save</button>
            <button onClick={() => setEditingVendorId(null)}
              className="px-4 py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Main vendor row */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h4 className={`font-semibold text-cowc-dark ${isMember ? 'text-base' : 'text-lg'}`}>
                  {vendor.name}
                </h4>
                {!isMember && vendor.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(vendor.status)}`}>
                    {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                  </span>
                )}
                {vendor.submitted_by_couple && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                    💡 Suggested by couple
                  </span>
                )}
              </div>

              {!isMember && (
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm text-cowc-gray">{formatVendorCategory(vendor.category)}</p>
                  {vendor.cost && (
                    <p className="text-sm font-semibold text-cowc-gold">${Number(vendor.cost).toLocaleString()}</p>
                  )}
                </div>
              )}

              {(vendor.contact || vendor.phone) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {vendor.contact && (
                    <a href={`mailto:${vendor.contact}`} className="text-sm text-cowc-gold hover:underline flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />{vendor.contact}
                    </a>
                  )}
                  {vendor.phone && (
                    <a href={`tel:${vendor.phone}`} className="text-sm text-cowc-gold hover:underline flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />{vendor.phone}
                    </a>
                  )}
                </div>
              )}
              {vendor.notes && (
                <p className="text-sm text-cowc-gray mt-1.5 italic">{vendor.notes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              {!isMember && canEdit && vendor.members?.length > 0 && (
                <button
                  onClick={() => setMembersExpanded(prev => !prev)}
                  className="p-1.5 hover:bg-cowc-cream rounded-lg text-cowc-gray"
                  title={membersExpanded ? 'Collapse team' : 'Expand team'}
                >
                  {membersExpanded
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                </button>
              )}
              {canEdit && vendor.submitted_by_couple && vendor.status === 'pending' && (
                <button onClick={() => handleConfirmCoupleVendor(vendor.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" />Confirm
                </button>
              )}
              {canEdit && (
                <>
                  <button onClick={() => setEditingVendorId(vendor.id)}
                    className="p-2 hover:bg-cowc-cream rounded-lg">
                    <Edit2 className="w-4 h-4 text-cowc-dark" />
                  </button>
                  <button onClick={() => handleDeleteVendor(vendor.id)}
                    className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Team members */}
          {!isMember && vendor.members?.length > 0 && membersExpanded && (
            <div className="mt-4 space-y-3">
              {vendor.members.map(member => (
                <VendorCard
                  key={member.id}
                  vendor={member}
                  isMember
                  canEdit={canEdit}
                  editingVendorId={editingVendorId}
                  setEditingVendorId={setEditingVendorId}
                  editForms={editForms}
                  setEditForms={setEditForms}
                  handleUpdateVendor={handleUpdateVendor}
                  handleDeleteVendor={handleDeleteVendor}
                  handleConfirmCoupleVendor={handleConfirmCoupleVendor}
                  addMemberForVendorId={addMemberForVendorId}
                  setAddMemberForVendorId={setAddMemberForVendorId}
                  memberForm={memberForm}
                  setMemberForm={setMemberForm}
                  savingMember={savingMember}
                  handleAddMember={handleAddMember}
                />
              ))}
            </div>
          )}

          {/* Add team member inline form */}
          {!isMember && canEdit && (
            <div className="mt-3">
              {isAddingMember ? (
                <div className="mt-3 p-4 rounded-xl bg-cowc-cream/60 border border-cowc-sand space-y-3">
                  <p className="text-xs font-semibold text-cowc-gray uppercase tracking-wide">Add Team Member</p>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={e => setMemberForm(f => ({...f, name: e.target.value}))}
                    className="input-premium text-sm"
                    placeholder="Name (e.g. Second Shooter, Lead Stylist)"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="email" value={memberForm.contact_email}
                      onChange={e => setMemberForm(f => ({...f, contact_email: e.target.value}))}
                      className="input-premium text-sm" placeholder="Email (optional)" />
                    <input type="tel" value={memberForm.phone}
                      onChange={e => setMemberForm(f => ({...f, phone: e.target.value}))}
                      className="input-premium text-sm" placeholder="Phone (optional)" />
                  </div>
                  <input type="text" value={memberForm.notes}
                    onChange={e => setMemberForm(f => ({...f, notes: e.target.value}))}
                    className="input-premium text-sm" placeholder="Role / notes (optional)" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddMember(vendor.id)}
                      disabled={savingMember || !memberForm.name.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-cowc-dark text-white text-sm rounded-xl hover:bg-cowc-dark/90 disabled:opacity-50"
                    >
                      {savingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add
                    </button>
                    <button onClick={() => { setAddMemberForVendorId(null); setMemberForm({ name: '', contact_email: '', phone: '', notes: '' }) }}
                      className="px-4 py-2 border border-cowc-sand rounded-xl text-cowc-gray hover:bg-cowc-cream text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddMemberForVendorId(vendor.id)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-cowc-gray hover:text-cowc-gold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add team member
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// AI Palette Widget — natural language → hex
// ─────────────────────────────────────────────

// Style Tab — 5-color palette + Pinterest boards
// ─────────────────────────────────────────────
// Base label names for the first 5 palette slots
const BASE_COLOR_LABELS = ['Primary', 'Secondary', 'Accent', 'Highlight', 'Background']

// Map a colorList array → named theme keys for saving
// gradientColorId (optional) sets which color drives the gradient
function colorListToTheme(list, gradientColorId = null) {
  const keys = ['primary', 'secondary', 'accent', 'color4', 'color5']
  const theme = {}
  keys.forEach((key, i) => {
    theme[key] = list[i]?.hex || '#ffffff'
  })
  theme.extraColors = list.slice(5).map(c => c.hex)
  if (gradientColorId !== null) {
    const idx = list.findIndex(c => c.id === gradientColorId)
    theme.gradientColorIndex = Math.max(0, idx)
    theme.gradientBase = list[Math.max(0, idx)]?.hex || list[0]?.hex || '#d4a574'
  }
  return theme
}

// Build an initial colorList from wedding.theme
function buildColorList(theme) {
  const base = [
    { id: 'primary',   hex: theme?.primary   || '#d4a574', label: 'Primary' },
    { id: 'secondary', hex: theme?.secondary || '#2d3748', label: 'Secondary' },
    { id: 'accent',    hex: theme?.accent    || '#faf9f7', label: 'Accent' },
    { id: 'color4',    hex: theme?.color4    || '#f0e6d3', label: 'Highlight' },
    { id: 'color5',    hex: theme?.color5    || '#ffffff', label: 'Background' },
  ]
  const extra = (theme?.extraColors || []).map((hex, i) => ({
    id: `extra_${i}_${Date.now() + i}`,
    hex,
    label: `Color ${6 + i}`,
  }))
  return [...base, ...extra]
}

const VIBE_OPTIONS = [
  'Romantic Garden', 'Modern Bohemian', 'Classic Elegant', 'Rustic Charm',
  'Mountain Elegant', 'Beach Chic', 'Urban Modern', 'Vintage Glam',
  'Desert Luxe', 'Autumn Romance',
]

function StyleTab({ wedding, canEdit, onSaved, setWeddingTheme }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  // colorList: ordered array of { id, hex, label }
  const [colorList, setColorList] = useState(() => buildColorList(wedding.theme))
  // Which color drives the gradient (track by id so drag-reorder keeps it correct)
  const [gradientColorId, setGradientColorId] = useState(() => {
    const idx = wedding.theme?.gradientColorIndex ?? 0
    const list = buildColorList(wedding.theme)
    return list[idx]?.id || list[0]?.id || 'primary'
  })
  const [vibe, setVibe] = useState(wedding.theme?.vibe || 'Classic Elegant')
  const [boards, setBoards] = useState(wedding.theme?.pinterest_boards || [])
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardUrl,  setNewBoardUrl]  = useState('')

  // Refs so async callbacks always see latest values when auto-saving
  const colorListRef = useRef(colorList)
  const vibeRef      = useRef(vibe)
  useEffect(() => { colorListRef.current = colorList }, [colorList])
  useEffect(() => { vibeRef.current = vibe }, [vibe])

  // Gradient preview — uses whichever color is selected as the gradient source
  const gradientHex = (() => {
    const idx = colorList.findIndex(c => c.id === gradientColorId)
    return colorList[Math.max(0, idx)]?.hex || colorList[0]?.hex || '#d4a574'
  })()
  const gradientStyle = {
    background: primaryGradient(gradientHex, '135deg'),
  }

  // ── Color list handlers ──────────────────────────────────────────────────────
  const handleColorChange = (id, val) => {
    setColorList(prev => prev.map(c => c.id === id ? { ...c, hex: val } : c))
  }

  const handleColorDragEnd = (result) => {
    if (!result.destination) return
    const newList = Array.from(colorList)
    const [moved] = newList.splice(result.source.index, 1)
    newList.splice(result.destination.index, 0, moved)
    // Relabel the first 5 slots to their canonical names
    const relabeled = newList.map((c, i) => ({
      ...c,
      label: i < BASE_COLOR_LABELS.length ? BASE_COLOR_LABELS[i] : `Color ${i + 1}`,
    }))
    setColorList(relabeled)
  }

  const handleAddColor = () => {
    const idx = colorList.length
    setColorList(prev => [
      ...prev,
      {
        id: `color_${Date.now()}`,
        hex: '#e8d5c4',
        label: idx < BASE_COLOR_LABELS.length ? BASE_COLOR_LABELS[idx] : `Color ${idx + 1}`,
      },
    ])
  }

  const handleRemoveColor = (id) => {
    if (colorList.length <= 2) return // keep at least 2
    setColorList(prev => {
      const next = prev.filter(c => c.id !== id)
      return next.map((c, i) => ({
        ...c,
        label: i < BASE_COLOR_LABELS.length ? BASE_COLOR_LABELS[i] : `Color ${i + 1}`,
      }))
    })
  }

  const fetchBoardCover = async (boardId, url) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-pinterest-board', {
        body: { url },
      })
      if (error || data?.error) throw new Error(data?.error || error?.message)
      const coverUrl = data.cover_url || null
      setBoards(prev => {
        const updated = prev.map(b =>
          b.id === boardId ? { ...b, cover_url: coverUrl, fetching: false } : b
        )
        // Auto-save to DB so the couple dashboard shows the cover without a manual save
        weddingsAPI.update(wedding.id, {
          theme: { ...colorListToTheme(colorListRef.current), vibe: vibeRef.current, pinterest_boards: updated },
        }).catch(err => console.error('Board cover auto-save failed:', err))
        return updated
      })
    } catch {
      setBoards(prev => prev.map(b =>
        b.id === boardId ? { ...b, fetching: false } : b
      ))
    }
  }

  const handleAddBoard = async () => {
    const name = newBoardName.trim()
    const url  = newBoardUrl.trim()
    if (!name || !url) return
    const newBoard = { id: crypto.randomUUID(), name, url, cover_url: null, fetching: true }
    setBoards(prev => [...prev, newBoard])
    setNewBoardName('')
    setNewBoardUrl('')
    // Fetch cover in the background — non-blocking
    fetchBoardCover(newBoard.id, url)
  }

  const handleRefreshBoardCover = (boardId, url) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, fetching: true } : b))
    fetchBoardCover(boardId, url)
  }

  const handleRemoveBoard = (boardId) => {
    setBoards(prev => prev.filter(b => b.id !== boardId))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const themeData = colorListToTheme(colorList, gradientColorId)
      await weddingsAPI.update(wedding.id, {
        theme: { ...themeData, vibe, pinterest_boards: boards },
      })
      setWeddingTheme({ ...themeData, vibe, pinterest_boards: boards })
      toast.success('Style saved!')
      await onSaved()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save style')
    } finally {
      setSaving(false)
    }
  }

  const handleAIApply = async (palette) => {
    // Build a new colorList from the AI palette (always 5 base colors)
    const newList = [
      { id: 'primary',   hex: palette.primary,   label: 'Primary' },
      { id: 'secondary', hex: palette.secondary,  label: 'Secondary' },
      { id: 'accent',    hex: palette.accent,     label: 'Accent' },
      { id: 'color4',    hex: palette.color4,     label: 'Highlight' },
      { id: 'color5',    hex: palette.color5,     label: 'Background' },
    ]
    const newVibe = palette.vibe || vibe
    setColorList(newList)
    setGradientColorId('primary') // AI palette always starts with primary as gradient source
    if (palette.vibe) setVibe(newVibe)

    // Auto-save immediately
    setSaving(true)
    try {
      const themeData = colorListToTheme(newList, 'primary')
      await weddingsAPI.update(wedding.id, {
        theme: { ...themeData, vibe: newVibe, pinterest_boards: boards },
      })
      setWeddingTheme({ ...themeData, vibe: newVibe, pinterest_boards: boards })
      toast.success('Palette applied & saved!')
      await onSaved()
    } catch (err) {
      console.error(err)
      toast.error('Palette applied but failed to save — click Save to retry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* AI Palette Generator — only shown to editors */}
      {canEdit && <AIPaletteWidget onApply={handleAIApply} />}

      {/* Gradient Preview strip */}
      <div className="card-premium overflow-hidden">
        <div className="h-16 w-full transition-all duration-500" style={gradientStyle} />
        <div className="p-4 flex items-center gap-3 flex-wrap">
          {colorList.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-md flex-shrink-0"
                style={{ background: c.hex }}
                title={c.label}
              />
              <span className="text-xs text-cowc-gray font-medium hidden sm:inline">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Color Palette — coolors.co style */}
      <div className="card-premium overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-xl font-serif text-cowc-dark flex items-center gap-3">
            <Palette className="w-5 h-5 text-cowc-gold" />
            Wedding Color Palette
          </h3>
          {canEdit ? (
            <span className="text-xs text-cowc-gray flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-yellow-400" /> = gradient · drag to reorder · {colorList.length} colors
            </span>
          ) : (
            <span className="text-xs text-cowc-gray flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-yellow-400" /> gradient source
            </span>
          )}
        </div>

        {/* Swatch strip */}
        <DragDropContext onDragEnd={handleColorDragEnd}>
          <Droppable droppableId="color-palette" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex"
                style={{ height: 200 }}
              >
                {colorList.map((color, index) => (
                  <Draggable
                    key={color.id}
                    draggableId={color.id}
                    index={index}
                    isDragDisabled={!canEdit}
                  >
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className="relative flex-1 group select-none"
                        style={{
                          background: color.hex,
                          minWidth: 60,
                          ...drag.draggableProps.style,
                        }}
                      >
                        {/* Gradient source picker — top left */}
                        <div
                          onClick={(e) => { e.stopPropagation(); if (canEdit) setGradientColorId(color.id) }}
                          className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 ${
                            gradientColorId === color.id
                              ? 'opacity-100 bg-white/30'
                              : canEdit
                                ? 'opacity-0 group-hover:opacity-100 cursor-pointer bg-black/20 hover:bg-black/50'
                                : 'hidden'
                          }`}
                          title={gradientColorId === color.id ? 'Gradient source' : 'Use as gradient base'}
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${gradientColorId === color.id ? 'text-yellow-300' : 'text-white/70'}`} />
                        </div>

                        {/* Drag handle — top centre, visible on hover */}
                        {canEdit && (
                          <div
                            {...drag.dragHandleProps}
                            className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10 p-1"
                          >
                            <GripVertical className="w-4 h-4 drop-shadow" style={{ color: 'rgba(255,255,255,0.85)' }} />
                          </div>
                        )}

                        {/* Delete button — top right, visible on hover (only if >2 colors) */}
                        {canEdit && colorList.length > 2 && (
                          <button
                            onClick={() => handleRemoveColor(color.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/60 transition-all z-10"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        )}

                        {/* Hidden color input overlaid on entire swatch */}
                        {canEdit && (
                          <input
                            type="color"
                            value={color.hex}
                            onChange={(e) => handleColorChange(color.id, e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                            title={`Pick ${color.label} color`}
                          />
                        )}

                        {/* Bottom label + hex — always visible */}
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-3 bg-gradient-to-t from-black/40 to-transparent flex flex-col items-center gap-1">
                          <p className="text-white text-xs font-semibold drop-shadow truncate w-full text-center">
                            {color.label}
                          </p>
                          {canEdit ? (
                            <input
                              type="text"
                              value={color.hex.toUpperCase()}
                              onChange={(e) => {
                                const v = e.target.value
                                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleColorChange(color.id, v)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-center text-xs font-mono bg-white/20 backdrop-blur-sm border border-white/30 rounded px-1 py-0.5 text-white placeholder-white/60 focus:outline-none focus:bg-white/30 focus:border-white/60"
                              maxLength={7}
                            />
                          ) : (
                            <p className="text-white/80 text-xs font-mono drop-shadow">{color.hex.toUpperCase()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                {/* Add color button */}
                {canEdit && (
                  <button
                    onClick={handleAddColor}
                    className="w-14 flex-shrink-0 flex flex-col items-center justify-center gap-1 bg-cowc-cream hover:bg-cowc-sand transition-colors border-l border-gray-100"
                    title="Add color"
                  >
                    <Plus className="w-5 h-5 text-cowc-gray" />
                    <span className="text-xs text-cowc-light-gray font-medium">Add</span>
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Vibe / Style */}
      <div className="card-premium p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-serif text-cowc-dark mb-6">Wedding Vibe</h3>
        {canEdit ? (
          <div className="flex flex-wrap gap-3">
            {VIBE_OPTIONS.map(v => (
              <button
                key={v}
                onClick={() => setVibe(v)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  vibe === v
                    ? 'border-cowc-gold bg-cowc-gold text-white'
                    : 'border-cowc-sand text-cowc-gray hover:border-cowc-gold/50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-4 py-2 rounded-xl bg-cowc-cream text-cowc-dark font-semibold">
            {vibe || 'Not set'}
          </span>
        )}
      </div>

      {/* Pinterest Boards */}
      <div className="card-premium p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-serif text-cowc-dark mb-2 flex items-center gap-3">
          {/* Pinterest P logo */}
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
            style={{ background: '#E60023' }}>P</span>
          Pinterest Inspiration
        </h3>
        <p className="text-sm text-cowc-gray mb-6">
          Add public board links — cover images are pulled in automatically.
        </p>

        {/* Visual board cards grid */}
        {boards.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-cowc-sand flex flex-col items-center justify-center py-12 mb-6 text-center">
            <span className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black mb-3"
              style={{ background: '#E60023' }}>P</span>
            <p className="text-cowc-gray font-medium mb-1">No boards yet</p>
            <p className="text-xs text-cowc-light-gray">Add a Pinterest board URL below to pull in their cover image</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {boards.map(board => (
              <div key={board.id} className="group relative rounded-2xl overflow-hidden bg-cowc-sand shadow-sm">
                {/* Cover image area */}
                <div className="aspect-square relative overflow-hidden">
                  {board.fetching ? (
                    <div className="w-full h-full flex items-center justify-center bg-cowc-cream">
                      <Loader2 className="w-6 h-6 text-cowc-gold animate-spin" />
                    </div>
                  ) : board.cover_url ? (
                    <img
                      src={board.cover_url}
                      alt={board.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-cowc-cream">
                      <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-black"
                        style={{ background: '#E60023' }}>P</span>
                      <p className="text-xs text-cowc-light-gray text-center px-2">No preview</p>
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a
                      href={board.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-full bg-white text-cowc-dark text-xs font-semibold flex items-center gap-1 hover:bg-cowc-cream transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                    {canEdit && !board.fetching && (
                      <button
                        onClick={() => handleRefreshBoardCover(board.id, board.url)}
                        className="p-1.5 rounded-full bg-white text-cowc-gray hover:text-cowc-gold transition-colors"
                        title="Refresh cover image"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Board name bar */}
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-cowc-dark truncate flex-1">{board.name}</p>
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveBoard(board.id)}
                      className="p-1 rounded-full hover:bg-red-50 flex-shrink-0 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add board form */}
        {canEdit && (
          <div className={boards.length > 0 ? 'border-t border-cowc-sand pt-5' : ''}>
            <p className="text-sm font-semibold text-cowc-dark mb-3">Add a board</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                placeholder="Board name  (e.g. Florals)"
                className="input-premium flex-1"
              />
              <input
                type="url"
                value={newBoardUrl}
                onChange={e => setNewBoardUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBoard()}
                placeholder="https://pinterest.com/username/board/"
                className="input-premium flex-1"
              />
              <button
                onClick={handleAddBoard}
                disabled={!newBoardName.trim() || !newBoardUrl.trim()}
                className="px-5 py-2 rounded-xl bg-cowc-gold text-white font-semibold hover:bg-opacity-90 disabled:opacity-40 flex items-center gap-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-cowc-gold text-white font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving…' : 'Save Style'}
          </button>
        </div>
      )}
    </div>
  )
}
