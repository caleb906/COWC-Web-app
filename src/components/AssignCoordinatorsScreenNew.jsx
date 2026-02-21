import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Check, Star, Save, Search, X, UserPlus, User, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { weddingsAPI, usersAPI, coordinatorAssignmentsAPI } from '../services/unifiedAPI'
import { formatDate } from '../utils/dates'
import { useToast } from './Toast'

export default function AssignCoordinatorsScreenNew() {
  const navigate = useNavigate()
  const toast = useToast()
  const [weddings, setWeddings] = useState([])
  const [coordinators, setCoordinators] = useState([])
  const [selectedWedding, setSelectedWedding] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [staffCounts, setStaffCounts] = useState({
    coordinator_count: '',
    support_staff_count: '',
    cleaning_crew_count: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [allWeddings, allCoordinators] = await Promise.all([
        weddingsAPI.getAll(),
        usersAPI.getCoordinators(),
      ])

      // Bug 16: Filter out past weddings
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcomingWeddings = allWeddings.filter((w) => {
        if (!w.wedding_date) return true // keep undated weddings
        return new Date(w.wedding_date) >= today
      })

      setWeddings(upcomingWeddings)
      setCoordinators(allCoordinators)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleWeddingSelect = (wedding) => {
    setSelectedWedding(wedding)
    const currentAssignments = wedding.coordinators || []
    setAssignments(currentAssignments.map(a => ({
      coordinatorId: a.coordinator?.id || a.id,
      isLead: a.is_lead || false,
    })))
    // Bug 15: Pre-fill staff counts from saved values
    setStaffCounts({
      coordinator_count: wedding.coordinator_count ?? '',
      support_staff_count: wedding.support_staff_count ?? '',
      cleaning_crew_count: wedding.cleaning_crew_count ?? '',
    })
  }

  const toggleCoordinator = (coordinatorId) => {
    const existing = assignments.find(a => a.coordinatorId === coordinatorId)
    if (existing) {
      setAssignments(assignments.filter(a => a.coordinatorId !== coordinatorId))
    } else {
      setAssignments([...assignments, { coordinatorId, isLead: false }])
    }
  }

  const toggleLead = (coordinatorId) => {
    setAssignments(assignments.map(a =>
      a.coordinatorId === coordinatorId
        ? { ...a, isLead: !a.isLead }
        : a
    ))
  }

  const handleSave = async () => {
    if (!selectedWedding) return

    setSaving(true)
    try {
      // Get current assignments for this wedding
      const existingAssignments = await coordinatorAssignmentsAPI.getByWedding(selectedWedding.id)

      // Remove coordinators no longer in the list
      const newCoordinatorIds = assignments.map(a => a.coordinatorId)
      for (const existing of existingAssignments) {
        const coordinatorId = existing.coordinator?.id || existing.coordinator_id
        if (!newCoordinatorIds.includes(coordinatorId)) {
          await coordinatorAssignmentsAPI.unassign(selectedWedding.id, coordinatorId)
        }
      }

      // Add or update coordinators
      const existingCoordinatorIds = existingAssignments.map(a => a.coordinator?.id || a.coordinator_id)
      for (const assignment of assignments) {
        if (!existingCoordinatorIds.includes(assignment.coordinatorId)) {
          await coordinatorAssignmentsAPI.assign(selectedWedding.id, assignment.coordinatorId, assignment.isLead)
        } else if (assignment.isLead) {
          await coordinatorAssignmentsAPI.setLead(selectedWedding.id, assignment.coordinatorId)
        }
      }

      // Bug 15: Save staff counts to the wedding record
      await weddingsAPI.update(selectedWedding.id, {
        coordinator_count: staffCounts.coordinator_count !== '' ? parseInt(staffCounts.coordinator_count) : null,
        support_staff_count: staffCounts.support_staff_count !== '' ? parseInt(staffCounts.support_staff_count) : null,
        cleaning_crew_count: staffCounts.cleaning_crew_count !== '' ? parseInt(staffCounts.cleaning_crew_count) : null,
      })

      toast.success('Coordinator assignments saved!')
      await loadData()
      setSelectedWedding(null)
      setAssignments([])
      setStaffCounts({ coordinator_count: '', support_staff_count: '', cleaning_crew_count: '' })
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast.error('Failed to save assignments: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const filteredWeddings = weddings.filter(w => {
    const matchesSearch = w.couple_name.toLowerCase().includes(searchQuery.toLowerCase())
    const hasCoordinators = w.coordinators && w.coordinators.length > 0

    if (showUnassignedOnly) {
      return matchesSearch && !hasCoordinators
    }
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading...</p>
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

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-cowc-gold rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-serif font-light">Assign Coordinators</h1>
              <p className="text-white/70 mt-2">Match coordinators to upcoming weddings</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search weddings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cowc-gold"
              />
            </div>
            <button
              onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                showUnassignedOnly
                  ? 'bg-cowc-gold text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {showUnassignedOnly ? 'Show All' : 'Unassigned Only'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weddings List */}
          <div className="card-premium p-6">
            <h2 className="text-2xl font-serif text-cowc-dark mb-6">
              Upcoming Weddings ({filteredWeddings.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredWeddings.map((wedding) => {
                const hasCoordinators = wedding.coordinators && wedding.coordinators.length > 0
                const hasStaffCounts = wedding.coordinator_count != null || wedding.support_staff_count != null || wedding.cleaning_crew_count != null
                return (
                  <button
                    key={wedding.id}
                    onClick={() => handleWeddingSelect(wedding)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedWedding?.id === wedding.id
                        ? 'bg-cowc-gold text-white'
                        : hasCoordinators
                        ? 'bg-green-50 hover:bg-green-100 border-2 border-green-200'
                        : 'bg-cowc-cream hover:bg-cowc-sand'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold mb-1 ${
                          selectedWedding?.id === wedding.id ? 'text-white' : 'text-cowc-dark'
                        }`}>
                          {wedding.couple_name}
                        </p>
                        <p className={`text-sm ${
                          selectedWedding?.id === wedding.id ? 'text-white/70' : 'text-cowc-gray'
                        }`}>
                          {formatDate(wedding.wedding_date, 'MMM d, yyyy')}
                        </p>
                        {hasCoordinators && (
                          <p className={`text-xs mt-1 ${
                            selectedWedding?.id === wedding.id ? 'text-white/60' : 'text-green-600'
                          }`}>
                            {wedding.coordinators.length} coordinator{wedding.coordinators.length !== 1 ? 's' : ''} assigned
                            {hasStaffCounts && ' · staff counts set'}
                          </p>
                        )}
                      </div>
                      {hasCoordinators && (
                        <Check className={`w-5 h-5 flex-shrink-0 ${
                          selectedWedding?.id === wedding.id ? 'text-white' : 'text-green-500'
                        }`} />
                      )}
                    </div>
                  </button>
                )
              })}

              {filteredWeddings.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                  <p className="text-cowc-gray">
                    {showUnassignedOnly ? 'All weddings have coordinators!' : 'No upcoming weddings found'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Coordinators + Staff Counts Panel */}
          <div className="card-premium p-6">
            <h2 className="text-2xl font-serif text-cowc-dark mb-6">
              {selectedWedding ? `Assign to ${selectedWedding.couple_name}` : 'Select a Wedding'}
            </h2>

            {!selectedWedding ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <Users className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                  <p className="text-cowc-gray">Select a wedding to assign coordinators</p>
                </div>
              </div>
            ) : (
              <>
                {/* Bug 15: Staff Count Inputs */}
                <div className="mb-6 p-4 bg-cowc-cream rounded-xl border border-cowc-sand">
                  <p className="text-sm font-semibold text-cowc-dark uppercase tracking-wider mb-4">
                    Staff Requirements
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="flex items-center gap-1.5 text-xs text-cowc-gray mb-1.5">
                        <Star className="w-3.5 h-3.5 text-cowc-gold" />
                        Coordinators
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={staffCounts.coordinator_count}
                        onChange={(e) => setStaffCounts(s => ({ ...s, coordinator_count: e.target.value }))}
                        placeholder="—"
                        className="w-full px-3 py-2 rounded-lg border border-cowc-sand bg-white text-cowc-dark text-sm focus:outline-none focus:ring-2 focus:ring-cowc-gold text-center"
                      />
                    </label>
                    <label className="block">
                      <span className="flex items-center gap-1.5 text-xs text-cowc-gray mb-1.5">
                        <User className="w-3.5 h-3.5 text-cowc-gold" />
                        Support Staff
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={staffCounts.support_staff_count}
                        onChange={(e) => setStaffCounts(s => ({ ...s, support_staff_count: e.target.value }))}
                        placeholder="—"
                        className="w-full px-3 py-2 rounded-lg border border-cowc-sand bg-white text-cowc-dark text-sm focus:outline-none focus:ring-2 focus:ring-cowc-gold text-center"
                      />
                    </label>
                    <label className="block">
                      <span className="flex items-center gap-1.5 text-xs text-cowc-gray mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cowc-gold" />
                        Cleaning Crew
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={staffCounts.cleaning_crew_count}
                        onChange={(e) => setStaffCounts(s => ({ ...s, cleaning_crew_count: e.target.value }))}
                        placeholder="—"
                        className="w-full px-3 py-2 rounded-lg border border-cowc-sand bg-white text-cowc-dark text-sm focus:outline-none focus:ring-2 focus:ring-cowc-gold text-center"
                      />
                    </label>
                  </div>
                </div>

                {/* Coordinator List */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto mb-6">
                  {coordinators.map((coordinator) => {
                    const isAssigned = assignments.some(a => a.coordinatorId === coordinator.id)
                    const isLead = assignments.find(a => a.coordinatorId === coordinator.id)?.isLead
                    const initials = coordinator.full_name
                      ? coordinator.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : '?'

                    return (
                      <motion.div
                        key={coordinator.id}
                        layout
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isAssigned
                            ? 'border-cowc-gold bg-cowc-gold/5'
                            : 'border-cowc-sand bg-white hover:border-cowc-gold/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                            isAssigned ? 'bg-cowc-gold text-white' : 'bg-cowc-sand text-cowc-dark'
                          }`}>
                            {initials}
                          </div>

                          {/* Name + email */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-cowc-dark leading-tight truncate">
                              {coordinator.full_name}
                            </p>
                            <p className="text-xs text-cowc-gray truncate">{coordinator.email}</p>
                          </div>

                          {/* Right side: role pill (when assigned) or assign button */}
                          {isAssigned ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Role toggle pill */}
                              <button
                                onClick={() => toggleLead(coordinator.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                                  isLead
                                    ? 'bg-yellow-400 text-white shadow-sm'
                                    : 'bg-gray-100 text-cowc-gray hover:bg-gray-200'
                                }`}
                                title={isLead ? 'Click to make Coordinator' : 'Click to make Lead'}
                              >
                                <Star className={`w-3.5 h-3.5 flex-shrink-0 ${isLead ? 'fill-white' : ''}`} />
                                {isLead ? 'Lead' : 'Coordinator'}
                              </button>

                              {/* Remove button */}
                              <button
                                onClick={() => toggleCoordinator(coordinator.id)}
                                className="p-1.5 rounded-full text-cowc-light-gray hover:text-red-400 hover:bg-red-50 transition-colors"
                                title="Remove from wedding"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleCoordinator(coordinator.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cowc-cream text-cowc-gray hover:bg-cowc-gold hover:text-white transition-all active:scale-95 flex-shrink-0"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Assign
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}

                  {coordinators.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
                      <p className="text-cowc-gray">No coordinators found</p>
                      <p className="text-sm text-cowc-light-gray mt-2">
                        Add coordinators in the Users Management screen
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setSelectedWedding(null)
                      setAssignments([])
                      setStaffCounts({ coordinator_count: '', support_staff_count: '', cleaning_crew_count: '' })
                    }}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
