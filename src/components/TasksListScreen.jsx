import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, Circle, AlertCircle, Calendar,
  Users, Search, ChevronDown, Plus, X, Save,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { tasksAPI, weddingsAPI } from '../services/unifiedAPI'
import { formatDate, daysUntil, isPastDue } from '../utils/dates'
import { useToast } from './Toast'

export default function TasksListScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, overdue, completed
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('due_date')
  const [togglingId, setTogglingId] = useState(null)

  // Add task modal
  const [showAddTask, setShowAddTask] = useState(false)
  const [weddings, setWeddings] = useState([])
  const [addForm, setAddForm] = useState({ wedding_id: '', title: '', description: '', due_date: '', assigned_to: 'couple' })
  const [saving, setSaving] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    loadTasks()
    loadWeddings()
  }, [])

  const loadWeddings = async () => {
    try {
      const data = await weddingsAPI.getAll()
      setWeddings(data)
    } catch (err) {
      console.error('Failed to load weddings for task modal', err)
    }
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!addForm.wedding_id) { toast.error('Please select a wedding'); return }
    if (!addForm.title.trim()) { toast.error('Please enter a task title'); return }
    setSaving(true)
    try {
      await tasksAPI.create({
        wedding_id: addForm.wedding_id,
        title: addForm.title,
        description: addForm.description || '',
        due_date: addForm.due_date || null,
        assigned_to: addForm.assigned_to,
      })
      toast.success('Task created!')
      setShowAddTask(false)
      setAddForm({ wedding_id: '', title: '', description: '', due_date: '', assigned_to: 'couple' })
      await loadTasks()
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error('Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await tasksAPI.getAll()
      setTasks(data)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const toggleComplete = async (task) => {
    setTogglingId(task.id)
    try {
      if (task.completed) {
        await tasksAPI.uncomplete(task.id)
      } else {
        await tasksAPI.complete(task.id)
      }
      await loadTasks()
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to update task')
    } finally {
      setTogglingId(null)
    }
  }

  const getFilteredTasks = () => {
    let filtered = [...tasks]

    switch (filter) {
      case 'pending':
        filtered = filtered.filter(t => !t.completed)
        break
      case 'overdue':
        filtered = filtered.filter(t => !t.completed && isPastDue(t.due_date))
        break
      case 'completed':
        filtered = filtered.filter(t => t.completed)
        break
      default:
        break
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.wedding?.couple_name?.toLowerCase().includes(q)
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          return new Date(a.due_date || '9999') - new Date(b.due_date || '9999')
        case 'wedding':
          return (a.wedding?.couple_name || '').localeCompare(b.wedding?.couple_name || '')
        case 'status':
          if (a.completed === b.completed) return 0
          return a.completed ? 1 : -1
        default:
          return 0
      }
    })

    return filtered
  }

  const filteredTasks = getFilteredTasks()

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => !t.completed && isPastDue(t.due_date)).length,
    completed: tasks.filter(t => t.completed).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cowc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cowc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cowc-gray font-serif text-xl">Loading tasks…</p>
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
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-serif font-light">All Tasks</h1>
                <p className="text-white/70 mt-2">Track tasks across all weddings</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-5 py-3 bg-cowc-gold hover:bg-cowc-gold/90 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Tasks', value: stats.total, color: '' },
              { label: 'Pending', value: stats.pending, color: '' },
              { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
              { label: 'Completed', value: stats.completed, color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className={`text-3xl font-serif font-light mb-1 ${color}`}>{value}</div>
                <div className="text-sm text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        {/* Filters & Search */}
        <div className="card-premium p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: `All (${stats.total})`, activeClass: 'bg-cowc-gold text-white' },
                { key: 'pending', label: `Pending (${stats.pending})`, activeClass: 'bg-cowc-gold text-white' },
                { key: 'overdue', label: `Overdue (${stats.overdue})`, activeClass: 'bg-red-500 text-white' },
                { key: 'completed', label: `Completed (${stats.completed})`, activeClass: 'bg-green-500 text-white' },
              ].map(({ key, label, activeClass }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    filter === key ? activeClass : 'bg-cowc-cream text-cowc-gray hover:bg-cowc-sand'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray" />
              <input
                type="text"
                placeholder="Search tasks or weddings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 rounded-lg bg-cowc-cream border-2 border-transparent focus:border-cowc-gold focus:outline-none font-semibold text-cowc-dark cursor-pointer"
              >
                <option value="due_date">Sort by Due Date</option>
                <option value="wedding">Sort by Wedding</option>
                <option value="status">Sort by Status</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cowc-gray pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.map((task, index) => {
            const overdue = !task.completed && isPastDue(task.due_date)
            const days = daysUntil(task.due_date)
            const isToggling = togglingId === task.id

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`card-premium p-6 hover:shadow-xl transition-all ${
                  overdue ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Toggle Checkbox */}
                  <button
                    onClick={() => toggleComplete(task)}
                    disabled={isToggling}
                    className="flex-shrink-0 mt-1 hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-cowc-light-gray hover:text-cowc-gold" />
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-1 ${
                          task.completed ? 'text-cowc-light-gray line-through' : 'text-cowc-dark'
                        }`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-cowc-gray mb-2">{task.description}</p>
                        )}
                        {task.wedding && (
                          <button
                            onClick={() => navigate(`/wedding/${task.wedding_id}`)}
                            className="inline-flex items-center gap-2 text-sm text-cowc-gold hover:underline"
                          >
                            <Users className="w-4 h-4" />
                            {task.wedding.couple_name}
                          </button>
                        )}
                      </div>

                      {overdue && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex-shrink-0 ml-4">
                          <AlertCircle className="w-4 h-4" />
                          Overdue
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {task.due_date && (
                        <div className={`flex items-center gap-2 ${
                          overdue ? 'text-red-500 font-semibold' : 'text-cowc-gray'
                        }`}>
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDate(task.due_date, 'MMM d, yyyy')}</span>
                          {days !== null && !task.completed && (
                            <span className="text-xs">
                              ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                            </span>
                          )}
                        </div>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        task.assigned_to === 'couple'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {task.assigned_to === 'couple' ? 'Couple' : 'Coordinator'}
                      </span>
                      {task.priority && task.priority !== 'medium' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          task.priority === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {filteredTasks.length === 0 && (
            <div className="card-premium p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
              <p className="text-xl text-cowc-gray">
                {filter === 'completed' ? 'No completed tasks yet' :
                 filter === 'overdue' ? 'No overdue tasks!' :
                 'No tasks found'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddTask && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAddTask(false)}
          >
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-serif text-cowc-dark">Add Task</h2>
                <button onClick={() => setShowAddTask(false)} className="p-2 hover:bg-cowc-cream rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Wedding *</label>
                  <select
                    value={addForm.wedding_id}
                    onChange={(e) => setAddForm({ ...addForm, wedding_id: e.target.value })}
                    className="input-premium"
                    required
                  >
                    <option value="">Select a wedding…</option>
                    {weddings.map(w => (
                      <option key={w.id} value={w.id}>{w.couple_name} — {formatDate(w.wedding_date, 'MMM d, yyyy')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Task Title *</label>
                  <input
                    type="text"
                    value={addForm.title}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    className="input-premium"
                    placeholder="e.g., Book photographer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cowc-dark mb-2">Description</label>
                  <textarea
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    className="input-premium min-h-[80px]"
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Due Date</label>
                    <input
                      type="date"
                      value={addForm.due_date}
                      onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-cowc-dark mb-2">Assigned To</label>
                    <select
                      value={addForm.assigned_to}
                      onChange={(e) => setAddForm({ ...addForm, assigned_to: e.target.value })}
                      className="input-premium"
                    >
                      <option value="couple">Couple</option>
                      <option value="coordinator">Coordinator</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddTask(false)}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold text-cowc-gray hover:bg-cowc-cream transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold bg-cowc-gold text-white hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    {saving ? 'Adding…' : 'Add Task'}
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
