import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Mail, Phone, Edit2, Save, X, Trash2, Search,
  ShieldOff, ShieldCheck, KeyRound, Loader2, Copy, Check, UserCircle2,
  UserPlus, Send, CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

export default function UsersManagementScreenNew() {
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('coordinators')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [recoveryLink, setRecoveryLink] = useState(null)
  const [copied, setCopied] = useState(false)

  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ fullName: '', email: '', phone: '', role: 'coordinator' })
  const [addSending, setAddSending] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)

  useEffect(() => { loadUsers() }, [activeTab])

  // Pre-fill role when opening modal based on active tab
  useEffect(() => {
    if (showAddModal) {
      const roleMap = { coordinators: 'coordinator', couples: 'couple', admins: 'admin' }
      setAddForm(f => ({ ...f, role: roleMap[activeTab] || 'coordinator' }))
      setCreatedUser(null)
    }
  }, [showAddModal, activeTab])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const role = activeTab === 'coordinators' ? 'coordinator' : activeTab === 'admins' ? 'admin' : 'couple'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('full_name', { ascending: true })
      if (error) throw error
      setUsers(data || [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Call admin-user-ops edge function
  const adminOp = async (body) => {
    await supabase.auth.refreshSession()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated — please log in again')
    const res = await supabase.functions.invoke('admin-user-ops', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body,
    })
    if (res.error) throw new Error(res.data?.error || res.error.message)
    if (res.data?.error) throw new Error(res.data.error)
    return res.data
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.full_name || user.email}? This cannot be undone.`)) return
    setBusyId(user.id)
    try {
      await adminOp({ action: 'delete', userId: user.id })
      setUsers(u => u.filter(x => x.id !== user.id))
      toast.success('User deleted')
    } catch (e) {
      toast.error(e.message || 'Failed to delete user')
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleActive = async (user) => {
    const isActive = (user.status || 'Active').toLowerCase() !== 'inactive'
    setBusyId(user.id)
    try {
      await adminOp({ action: isActive ? 'deactivate' : 'reactivate', userId: user.id })
      setUsers(u => u.map(x => x.id === user.id
        ? { ...x, status: isActive ? 'Inactive' : 'Active' }
        : x
      ))
      toast.success(isActive ? 'User deactivated' : 'User reactivated')
    } catch (e) {
      toast.error(e.message || 'Failed to update user')
    } finally {
      setBusyId(null)
    }
  }

  const handleRecovery = async (user) => {
    setBusyId(user.id)
    try {
      const result = await adminOp({ action: 'send_recovery', email: user.email })
      setRecoveryLink({ userId: user.id, link: result.recoveryLink })
      toast.success('Recovery link generated')
    } catch (e) {
      toast.error(e.message || 'Failed to generate recovery link')
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveEdit = async (user) => {
    setBusyId(user.id)
    try {
      await adminOp({
        action: 'update_profile',
        userId: user.id,
        updates: { full_name: editForm.full_name, phone: editForm.phone },
      })
      setUsers(u => u.map(x => x.id === user.id
        ? { ...x, full_name: editForm.full_name, phone: editForm.phone }
        : x
      ))
      setEditingId(null)
      toast.success('User updated')
    } catch (e) {
      toast.error(e.message || 'Failed to update user')
    } finally {
      setBusyId(null)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!addForm.fullName || !addForm.email) {
      toast.error('Name and email are required')
      return
    }
    setAddSending(true)
    try {
      await supabase.auth.refreshSession()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await supabase.functions.invoke('create-user', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          fullName: addForm.fullName,
          email: addForm.email,
          phone: addForm.phone || '',
          role: addForm.role,
        },
      })
      if (response.error) throw response.error
      const result = response.data
      if (result?.error) throw new Error(result.error)

      toast.success(`${addForm.fullName} created successfully!`)
      setCreatedUser(result.user)
      setAddForm(f => ({ ...f, fullName: '', email: '', phone: '' }))

      // Reload if the new user's role matches the active tab
      const roleMap = { coordinators: 'coordinator', couples: 'couple', admins: 'admin' }
      if (roleMap[activeTab] === addForm.role) await loadUsers()
    } catch (error) {
      toast.error('Failed to create user: ' + (error.message || 'Unknown error'))
    } finally {
      setAddSending(false)
    }
  }

  const handleCopyLink = () => {
    if (!recoveryLink?.link) return
    navigator.clipboard.writeText(recoveryLink.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredUsers = users.filter(u =>
    !searchQuery.trim() ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabLabel = activeTab === 'coordinators' ? 'coordinator' : activeTab === 'admins' ? 'admin' : 'couple'

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
            <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-5xl font-serif font-light">Users</h1>
              <p className="text-white/70 mt-2">{users.length} {tabLabel}{users.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cowc-gold text-white font-semibold hover:bg-opacity-90 transition-all flex-shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {['coordinators', 'couples', 'admins'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(''); setEditingId(null); setRecoveryLink(null) }}
                className={`px-5 py-2 rounded-xl font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-cowc-gold text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cowc-gold"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8">
        {/* Recovery link banner */}
        <AnimatePresence>
          {recoveryLink && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card-premium p-4 mb-4 flex items-center gap-3 border-l-4 border-cowc-gold"
            >
              <KeyRound className="w-5 h-5 text-cowc-gold flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cowc-dark mb-1">Recovery Link</p>
                <p className="text-xs text-cowc-gray truncate font-mono">{recoveryLink.link}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cowc-gold text-white text-xs font-semibold flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => setRecoveryLink(null)} className="p-1 hover:bg-cowc-cream rounded-lg">
                <X className="w-4 h-4 text-cowc-gray" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-cowc-gold" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card-premium p-16 text-center">
            <UserCircle2 className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
            <p className="text-xl text-cowc-gray mb-6">
              {searchQuery ? 'No users match your search' : `No ${tabLabel}s yet`}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cowc-gold text-white font-semibold hover:bg-opacity-90 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Add {tabLabel}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const isActive = (user.status || 'Active').toLowerCase() !== 'inactive'
              const isBusy = busyId === user.id

              return (
                <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-premium p-5">
                  {editingId === user.id ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                          className="input-premium font-semibold"
                          placeholder="Full name"
                        />
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="input-premium opacity-50 cursor-not-allowed"
                        />
                        <input
                          type="tel"
                          value={editForm.phone || ''}
                          onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                          className="input-premium"
                          placeholder="Phone"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveEdit(user)}
                          disabled={isBusy}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl bg-gray-200 text-cowc-dark font-semibold hover:bg-gray-300">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-cowc-gold/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <UserCircle2 className="w-5 h-5 text-cowc-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-cowc-dark text-lg">{user.full_name || '(no name)'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {user.email && (
                          <p className="text-sm text-cowc-gray flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            {user.email}
                          </p>
                        )}
                        {user.phone && (
                          <p className="text-sm text-cowc-gray flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            {user.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRecovery(user)}
                          disabled={isBusy}
                          title="Generate password recovery link"
                          className="p-2 hover:bg-cowc-cream rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isBusy && recoveryLink?.userId !== user.id
                            ? <Loader2 className="w-4 h-4 text-cowc-gold animate-spin" />
                            : <KeyRound className="w-4 h-4 text-cowc-gold" />
                          }
                        </button>

                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={isBusy}
                          title={isActive ? 'Deactivate user' : 'Reactivate user'}
                          className="p-2 hover:bg-cowc-cream rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isBusy
                            ? <Loader2 className="w-4 h-4 animate-spin text-cowc-gray" />
                            : isActive
                              ? <ShieldOff className="w-4 h-4 text-amber-500" />
                              : <ShieldCheck className="w-4 h-4 text-green-500" />
                          }
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(user.id)
                            setEditForm({ full_name: user.full_name || '', phone: user.phone || '' })
                          }}
                          className="p-2 hover:bg-cowc-cream rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4 text-cowc-dark" />
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          disabled={isBusy}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Delete user"
                        >
                          {isBusy
                            ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                            : <Trash2 className="w-4 h-4 text-red-500" />
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add User Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setCreatedUser(null) }}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cowc-gold/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-cowc-gold" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl text-cowc-dark">Add User</h2>
                    <p className="text-xs text-cowc-gray">Create account & send invite</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddModal(false); setCreatedUser(null) }}
                  className="p-2 hover:bg-cowc-cream rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-cowc-gray" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-cowc-dark mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={addForm.fullName}
                      onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                      className="input-premium"
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cowc-dark mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      className="input-premium"
                      placeholder="jane@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cowc-dark mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={addForm.phone}
                      onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                      className="input-premium"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-cowc-dark mb-1.5">Role *</label>
                    <select
                      value={addForm.role}
                      onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                      className="input-premium"
                    >
                      <option value="coordinator">Coordinator</option>
                      <option value="couple">Couple</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Success confirmation */}
                {createdUser && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 mb-1">Account Created!</p>
                        <p className="text-sm text-green-800 mb-2">
                          Login info sent to <strong>{createdUser.email}</strong>.
                        </p>
                        {createdUser.tempPassword && (
                          <div className="bg-white rounded-lg p-2.5 border border-green-200">
                            <p className="text-xs font-semibold text-amber-700 mb-1">Temporary Password:</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-sm font-mono text-amber-900 select-all">
                                {createdUser.tempPassword}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(createdUser.tempPassword)
                                  toast.success('Copied!')
                                }}
                                className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setCreatedUser(null) }}
                    className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all border border-gray-200"
                  >
                    {createdUser ? 'Done' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={addSending}
                    className="flex-1 py-2.5 px-4 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addSending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                      : <><Send className="w-4 h-4" /> Create & Invite</>
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
