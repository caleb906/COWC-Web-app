import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Mail, Phone, Edit2, Save, X, Trash2, Search,
  ShieldOff, ShieldCheck, KeyRound, Loader2, Copy, Check, UserCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

export default function UsersManagementScreenNew() {
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('coordinators')  // 'coordinators' | 'couples' | 'admins'
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [busyId, setBusyId] = useState(null)   // userId currently being acted on
  const [recoveryLink, setRecoveryLink] = useState(null)  // { userId, link }
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadUsers() }, [activeTab])

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
    const res = await supabase.functions.invoke('admin-user-ops', { body })
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
    const action = isActive ? 'deactivate' : 'reactivate'
    setBusyId(user.id)
    try {
      await adminOp({ action, userId: user.id })
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
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-5xl font-serif font-light">Users</h1>
              <p className="text-white/70 mt-2">{users.length} {activeTab === 'coordinators' ? 'coordinator' : activeTab === 'admins' ? 'admin' : 'couple'}{users.length !== 1 ? 's' : ''}</p>
            </div>
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
            <p className="text-xl text-cowc-gray">{searchQuery ? 'No users match your search' : `No ${activeTab === 'admins' ? 'admins' : activeTab} yet`}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(user => {
              const isActive = (user.status || 'Active').toLowerCase() !== 'inactive'
              const isBusy = busyId === user.id

              return (
                <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-premium p-5">
                  {editingId === user.id ? (
                    // Edit mode
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
                          placeholder="Email"
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
                    // View mode
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-cowc-gold/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <UserCircle2 className="w-5 h-5 text-cowc-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-cowc-dark text-lg">{user.full_name || '(no name)'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
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

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                        {/* Recovery link */}
                        <button
                          onClick={() => handleRecovery(user)}
                          disabled={isBusy}
                          title="Generate recovery link"
                          className="p-2 hover:bg-cowc-cream rounded-lg transition-colors disabled:opacity-40"
                        >
                          {isBusy && busyId === user.id && recoveryLink?.userId !== user.id
                            ? <Loader2 className="w-4 h-4 text-cowc-gold animate-spin" />
                            : <KeyRound className="w-4 h-4 text-cowc-gold" />
                          }
                        </button>

                        {/* Deactivate / Reactivate */}
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

                        {/* Edit */}
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

                        {/* Delete */}
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
    </div>
  )
}
