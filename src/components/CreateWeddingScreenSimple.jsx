import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { weddingsAPI } from '../services/unifiedAPI'
import { useToast } from './Toast'

export default function CreateWeddingScreenSimple() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    coupleName: '',
    coupleEmail: '',
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

  const vibeOptions = [
    'Romantic Garden',
    'Modern Bohemian',
    'Classic Elegant',
    'Rustic Charm',
    'Mountain Elegant',
    'Beach Chic',
    'Urban Modern',
    'Vintage Glam',
    'Desert Luxe',
    'Autumn Romance',
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.coupleName) {
      toast.error('Please enter the couple names')
      return
    }
    if (!formData.weddingDate) {
      toast.error('Please select a wedding date')
      return
    }
    if (!formData.venueName) {
      toast.error('Please enter a venue name')
      return
    }

    // Validate wedding date is in the future
    const weddingDate = new Date(formData.weddingDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (weddingDate < today) {
      toast.warning('Wedding date should be in the future')
    }

    setLoading(true)

    try {
      const guestCountValue = formData.guestCount ? parseInt(formData.guestCount) : 0
      const budgetValue = formData.budget ? parseInt(formData.budget) : 0

      const newWedding = {
        couple_name: formData.coupleName,
        couple_user_id: null,
        couple_email: formData.coupleEmail || null,
        wedding_date: formData.weddingDate,
        venue_name: formData.venueName,
        venue_address: formData.venueAddress,
        guest_count: guestCountValue,
        budget: budgetValue,
        status: 'Planning',
        notes: formData.notes,
        theme: {
          primary: formData.primaryColor,
          secondary: formData.secondaryColor,
          accent: formData.accentColor,
          vibe: formData.vibe,
          inspiration_photos: [],
        },
      }

      await weddingsAPI.create(newWedding)
      toast.success(`Wedding created for ${formData.coupleName}!`)
      navigate('/admin')
    } catch (error) {
      console.error('Error creating wedding:', error)
      toast.error('Failed to create wedding. Please try again.')
    } finally {
      setLoading(false)
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
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-5xl font-serif font-light">Create New Wedding</h1>
              <p className="text-white/70 mt-2">Add a new couple to your portfolio</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <form onSubmit={handleSubmit} className="card-premium p-8 space-y-8">
          {/* Basic Info */}
          <div>
            <h3 className="text-2xl font-serif text-cowc-dark mb-6">Wedding Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Couple Names *
                </label>
                <input
                  type="text"
                  placeholder="Jessica & Mark"
                  value={formData.coupleName}
                  onChange={(e) => setFormData({ ...formData, coupleName: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Couple's Email
                  <span className="ml-2 text-xs font-normal text-cowc-gray">(for portal invite)</span>
                </label>
                <input
                  type="email"
                  placeholder="jessica@example.com"
                  value={formData.coupleEmail}
                  onChange={(e) => setFormData({ ...formData, coupleEmail: e.target.value })}
                  className="input-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Wedding Date *
                </label>
                <input
                  type="date"
                  value={formData.weddingDate}
                  onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Guest Count
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  className="input-premium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Venue Name *
                </label>
                <input
                  type="text"
                  placeholder="Sunriver Resort"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Venue Address
                </label>
                <textarea
                  placeholder="17600 Center Drive, Bend, OR 97707"
                  value={formData.venueAddress}
                  onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                  className="input-premium min-h-[80px]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Budget
                </label>
                <input
                  type="number"
                  placeholder="35000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="input-premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Wedding Vibe
                </label>
                <select
                  value={formData.vibe}
                  onChange={(e) => setFormData({ ...formData, vibe: e.target.value })}
                  className="input-premium"
                >
                  {vibeOptions.map((vibe) => (
                    <option key={vibe} value={vibe}>
                      {vibe}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Notes
                </label>
                <textarea
                  placeholder="Special requests, preferences, important details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-premium min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Theme Colors */}
          <div>
            <h3 className="text-2xl font-serif text-cowc-dark mb-6">Theme Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Primary Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-16 h-12 rounded-lg border-2 border-cowc-sand cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="input-premium flex-1"
                    placeholder="#d4a574"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-16 h-12 rounded-lg border-2 border-cowc-sand cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="input-premium flex-1"
                    placeholder="#2d3748"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-cowc-dark mb-2">
                  Accent Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-16 h-12 rounded-lg border-2 border-cowc-sand cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="input-premium flex-1"
                    placeholder="#faf9f7"
                  />
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div className="mt-6 p-6 rounded-xl" style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})` }}>
              <div className="text-white text-center">
                <p className="text-2xl font-serif mb-2">Color Preview</p>
                <p className="text-sm opacity-75">This is how the couple's dashboard will look</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-8 py-3 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-premium flex items-center justify-center gap-2 bg-cowc-gold text-white disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Creating...' : 'Create Wedding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
