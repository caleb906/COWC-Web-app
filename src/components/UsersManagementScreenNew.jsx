import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Users, Mail, Phone, Edit, Save, X, Trash2, Search, UserPlus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usersAPI } from '../services/unifiedAPI'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

export default function UsersManagementScreenNew() {
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('coordinators')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    loadUsers()
  }, [activeTab])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const role = activeTab === 'coordinators' ? 'coordinator' : 'couple'
      const data = await usersAPI.getByRole(role)
      setUsers(data.map(u => ({ ...u, status: u.status || 'active' })))
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user.id)
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      status: user.status || 'active',
    })
  }

  const handleSave = async (userId) => {
    try {
      await usersAPI.update(userId, {
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone || '',
        status: editForm.status,
      })
      toast.success('User updated successfully')
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Are you sure you want to remove ${userName}? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
      toast.success(`${userName} removed`)
      await loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to remove user')
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cowc-cream pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-cowc-dark via-cowc-dark to-gray-800 text-white pt-12 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-serif font-light">Users Management</h1>
                <p className="text-white/70 mt-2">Manage coordinators and couples</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/invite')}
              className="px-6 py-3 rounded-xl bg-cowc-gold hover:bg-opacity-90 transition-all font-semibold flex items-center gap-2 self-start md:self-auto"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('coordinators')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'coordinators'
                  ? 'bg-white text-cowc-dark'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Coordinators ({users.filter(u => u.role === 'coordinator').length})
            </button>
            <button
              onClick={() => setActiveTab('couples')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'couples'
                  ? 'bg-white text-cowc-dark'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Couples ({users.filter(u => u.role === 'couple').length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="card-premium p-6">
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cowc-gray" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium pl-12"
            />
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="card-premium p-6">
                {editingUser === user.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-cowc-dark mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="input-premium"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-cowc-dark mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input-premium"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-cowc-dark mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="input-premium"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-cowc-dark mb-2">
                          Status
                        </label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="input-premium"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSave(user.id)}
                        className="px-6 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-2 font-semibold"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-6 py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600 transition-all flex items-center gap-2 font-semibold"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-cowc-dark mb-2">{user.full_name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-cowc-gray">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${user.email}`} className="hover:text-cowc-gold transition-colors">
                            {user.email}
                          </a>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${user.phone}`} className="hover:text-cowc-gold transition-colors">
                              {user.phone}
                            </a>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'Active' ? 'bg-green-100 text-green-700' :
                          user.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-3 rounded-xl bg-cowc-cream hover:bg-cowc-sand transition-all"
                        title="Edit user"
                      >
                        <Edit className="w-5 h-5 text-cowc-dark" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.full_name)}
                        className="p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-all"
                        title="Delete user"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                <p className="text-xl text-cowc-gray mb-2">No {activeTab} found</p>
                <p className="text-sm text-cowc-light-gray">
                  {searchQuery ? 'Try a different search term' : 'Click "Add User" to create one'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
