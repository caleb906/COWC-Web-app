import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, UserPlus, Key, CheckCircle2, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

export default function InviteUsersScreenNew() {
  const navigate = useNavigate()
  const toast = useToast()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'couple',
  })
  const [sending, setSending] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.fullName || !formData.email) {
      toast.error('Please fill in the required fields')
      return
    }

    setSending(true)
    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || '',
          role: formData.role,
        },
      })

      if (response.error) throw response.error
      const result = response.data
      if (result?.error) throw new Error(result.error)

      toast.success(`${formData.fullName} created successfully!`)
      setCreatedUser(result.user)

      // Reset form
      setFormData({ fullName: '', email: '', phone: '', role: 'couple' })
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Failed to create user: ' + (error.message || 'Unknown error'))
    } finally {
      setSending(false)
    }
  }

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
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-serif font-light">Invite Users</h1>
              <p className="text-white/70 mt-2">Add new couples or coordinators</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <form onSubmit={handleSubmit} className="card-premium p-8 space-y-6">
          <div>
            <h3 className="text-2xl font-serif text-cowc-dark mb-6">User Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="input-premium"
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-premium"
                placeholder="john@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-premium"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-cowc-dark mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-premium"
              >
                <option value="couple">Couple</option>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-sm text-cowc-gray mt-2">
                {formData.role === 'couple' && 'Couples can view and manage their own wedding'}
                {formData.role === 'coordinator' && 'Coordinators can manage assigned weddings'}
                {formData.role === 'admin' && 'Admins have full access to all features'}
              </p>
            </div>
          </div>

          {createdUser && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-1">Account Created!</p>
                  <p className="text-sm text-green-800 mb-3">
                    A welcome email with login instructions has been sent to <strong>{createdUser.email}</strong>.
                    They'll be prompted to set a new password on first login.
                  </p>
                  <div className="bg-white rounded-lg p-3 space-y-1 border border-green-200">
                    <p className="text-sm"><span className="font-semibold text-gray-600">Name:</span> {createdUser.full_name}</p>
                    <p className="text-sm"><span className="font-semibold text-gray-600">Email:</span> {createdUser.email}</p>
                    <p className="text-sm"><span className="font-semibold text-gray-600">Role:</span> {createdUser.role}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Send className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">Welcome Email</p>
                <p className="text-sm text-blue-700">
                  An account will be created for <strong>{formData.email || 'the user'}</strong> and a welcome email with their temporary login credentials will be sent automatically. They'll be prompted to set a new password on first login.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {sending ? 'Creating & Sending...' : 'Create & Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
