import { useState, useRef, useCallback, useEffect } from 'react'
import { Clock, GripVertical, Plus, Edit2, Trash2, Save, X } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const START_HOUR = 6   // 6 AM
const END_HOUR   = 24  // midnight
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 80 // px per hour
const SNAP_TO    = 0.25 // snap to 15-minute intervals

// ── Time helpers ─────────────────────────────────────────────────────────────
function parseTime(str) {
  if (!str) return null
  // Handle "HH:MM" 24h or "H:MM AM/PM"
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) return parseInt(m24[1]) + parseInt(m24[2]) / 60

  const m12 = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m12) return null
  let h = parseInt(m12[1])
  const min = parseInt(m12[2])
  const meridiem = m12[3].toUpperCase()
  if (meridiem === 'PM' && h !== 12) h += 12
  if (meridiem === 'AM' && h === 12) h = 0
  return h + min / 60
}

function formatTime(hours24) {
  const h = Math.floor(hours24)
  const m = Math.round((hours24 - h) * 60)
  const meridiem = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h === 12 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${meridiem}`
}

function snapHours(raw) {
  const snapped = Math.round(raw / SNAP_TO) * SNAP_TO
  return Math.max(START_HOUR, Math.min(END_HOUR - SNAP_TO, snapped))
}

function topToHours(yPx) {
  return snapHours(yPx / HOUR_HEIGHT + START_HOUR)
}

function hoursToTop(hours24) {
  return (hours24 - START_HOUR) * HOUR_HEIGHT
}

function hourLabel(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// ── Inline edit form ──────────────────────────────────────────────────────────
function ItemEditForm({ item, onSave, onCancel }) {
  const [title, setTitle] = useState(item.title || '')
  const [description, setDescription] = useState(item.description || '')

  return (
    <div className="space-y-2 p-3 bg-white rounded-xl shadow-lg border-2 border-cowc-gold/30 z-20 relative" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="input-premium text-sm py-2 w-full"
        placeholder="Event title"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="input-premium text-sm py-2 w-full min-h-[60px]"
        placeholder="Description (optional)"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title: title.trim(), description: description.trim() })}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-40"
        >
          <Save className="w-3 h-3" /> Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-gray-200 text-cowc-dark text-xs font-semibold hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimelineCalendar({ items, canEdit, onUpdate, onDelete, onAddAt }) {
  const calendarRef = useRef(null)
  const [editingId, setEditingId] = useState(null)
  const [dragging, setDragging] = useState(null)  // { id, ghostTop }
  const [hoverHour, setHoverHour] = useState(null)

  // Sort items by parsed time; unscheduled items at bottom
  const sorted = [...items].sort((a, b) => {
    const ta = parseTime(a.time)
    const tb = parseTime(b.time)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    return ta - tb
  })

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, item) => {
    if (!canEdit) return
    e.preventDefault()
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    const parsedHours = parseTime(item.time) ?? START_HOUR + 8
    const initialTop = hoursToTop(parsedHours)
    setDragging({ id: item.id, ghostTop: initialTop, startY: e.clientY, initialTop })
  }, [canEdit])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    const dy = e.clientY - dragging.startY
    const rawTop = dragging.initialTop + dy
    const clampedTop = Math.max(0, Math.min(TOTAL_HOURS * HOUR_HEIGHT - HOUR_HEIGHT * SNAP_TO, rawTop))
    setDragging(d => ({ ...d, ghostTop: clampedTop }))
  }, [dragging])

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return
    const newHours = topToHours(dragging.ghostTop)
    const newTime = formatTime(newHours)
    const id = dragging.id
    setDragging(null)
    await onUpdate(id, { time: newTime })
  }, [dragging, onUpdate])

  // Touch support
  const handleTouchStart = useCallback((e, item) => {
    if (!canEdit) return
    const touch = e.touches[0]
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    const parsedHours = parseTime(item.time) ?? START_HOUR + 8
    const initialTop = hoursToTop(parsedHours)
    setDragging({ id: item.id, ghostTop: initialTop, startY: touch.clientY, initialTop })
  }, [canEdit])

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return
    e.preventDefault()
    const touch = e.touches[0]
    const dy = touch.clientY - dragging.startY
    const rawTop = dragging.initialTop + dy
    const clampedTop = Math.max(0, Math.min(TOTAL_HOURS * HOUR_HEIGHT - HOUR_HEIGHT * SNAP_TO, rawTop))
    setDragging(d => ({ ...d, ghostTop: clampedTop }))
  }, [dragging])

  const handleTouchEnd = useCallback(async () => {
    if (!dragging) return
    const newHours = topToHours(dragging.ghostTop)
    const newTime = formatTime(newHours)
    const id = dragging.id
    setDragging(null)
    await onUpdate(id, { time: newTime })
  }, [dragging, onUpdate])

  // Global mouse-up listener so drag works even if cursor leaves the calendar
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const handleCalendarClick = (e) => {
    if (!canEdit || dragging) return
    // Only trigger on clicks directly on the grid background
    if (e.target !== e.currentTarget) return
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = e.clientY - rect.top
    const hours = snapHours(y / HOUR_HEIGHT + START_HOUR)
    onAddAt(formatTime(hours))
  }

  // ── Unscheduled items (no parseable time) ──────────────────────────────────
  const unscheduled = sorted.filter(item => parseTime(item.time) === null)
  const scheduled   = sorted.filter(item => parseTime(item.time) !== null)

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="card-premium overflow-hidden">
        {canEdit && (
          <div className="px-4 py-3 border-b border-cowc-sand/50 flex items-center gap-2 text-xs text-cowc-gray">
            <GripVertical className="w-3.5 h-3.5 text-cowc-light-gray" />
            Drag events to reschedule · Click empty space to add
          </div>
        )}

        {/* Scrollable calendar area */}
        <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex">
            {/* Time labels column */}
            <div className="flex-shrink-0 w-16 relative select-none" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-3 text-xs text-cowc-light-gray font-medium"
                  style={{ top: i * HOUR_HEIGHT - 8, lineHeight: '1' }}
                >
                  {hourLabel(START_HOUR + i)}
                </div>
              ))}
            </div>

            {/* Grid + events column */}
            <div className="flex-1 relative border-l border-cowc-sand/50" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {/* Hour grid lines */}
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-cowc-sand' : 'border-cowc-sand/40'}`}
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}

              {/* Half-hour dotted lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={`half-${i}`}
                  className="absolute left-0 right-0 border-t border-dashed border-cowc-sand/20"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              ))}

              {/* Click-to-add overlay */}
              <div
                ref={calendarRef}
                className="absolute inset-0 z-0"
                style={{ cursor: canEdit ? 'crosshair' : 'default' }}
                onClick={handleCalendarClick}
                onMouseMove={(e) => {
                  if (!canEdit || dragging) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top
                  setHoverHour(snapHours(y / HOUR_HEIGHT + START_HOUR))
                }}
                onMouseLeave={() => setHoverHour(null)}
              >
                {/* Hover time indicator */}
                {canEdit && hoverHour !== null && !dragging && (
                  <div
                    className="absolute left-2 right-2 flex items-center gap-2 pointer-events-none"
                    style={{ top: hoursToTop(hoverHour) - 1 }}
                  >
                    <div className="h-0.5 flex-1 bg-cowc-gold/30 rounded" />
                    <span className="text-xs text-cowc-gold/60 font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      {formatTime(hoverHour)}
                    </span>
                  </div>
                )}
              </div>

              {/* Drag ghost */}
              {dragging && (
                <div
                  className="absolute left-3 right-3 z-30 pointer-events-none"
                  style={{ top: dragging.ghostTop }}
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cowc-gold text-white text-sm font-semibold shadow-2xl opacity-80">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    {formatTime(topToHours(dragging.ghostTop))}
                  </div>
                  {/* Drop line */}
                  <div className="h-0.5 bg-cowc-gold w-full mt-0.5 rounded" />
                </div>
              )}

              {/* Scheduled events */}
              {scheduled.map((item) => {
                const hours = parseTime(item.time)
                const top = hoursToTop(hours)
                const isDragging = dragging?.id === item.id
                const isEditing = editingId === item.id

                return (
                  <div
                    key={item.id}
                    className={`absolute left-3 right-3 z-10 transition-opacity ${isDragging ? 'opacity-30' : 'opacity-100'}`}
                    style={{ top: top + 2 }}
                  >
                    {isEditing ? (
                      <ItemEditForm
                        item={item}
                        onSave={async (updates) => { await onUpdate(item.id, updates); setEditingId(null) }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className={`flex items-start gap-2 px-3 py-2 rounded-xl border-2 shadow-sm group transition-all ${
                        isDragging ? 'bg-cowc-gold/10 border-cowc-gold' : 'bg-white border-cowc-sand hover:border-cowc-gold/40'
                      }`}>
                        {canEdit && (
                          <div
                            className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none"
                            onMouseDown={(e) => handleDragStart(e, item)}
                            onTouchStart={(e) => handleTouchStart(e, item)}
                          >
                            <GripVertical className="w-4 h-4 text-cowc-light-gray hover:text-cowc-gold transition-colors" />
                          </div>
                        )}
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 bg-cowc-gold/10 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 text-cowc-gold" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="font-semibold text-cowc-dark text-sm truncate">{item.title}</p>
                            <span className="text-xs text-cowc-gold font-medium flex-shrink-0">{item.time}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-cowc-gray mt-0.5 truncate">{item.description}</p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={e => { e.stopPropagation(); setEditingId(item.id) }}
                              className="p-1 hover:bg-cowc-cream rounded"
                            >
                              <Edit2 className="w-3 h-3 text-cowc-dark" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                              className="p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled items */}
      {unscheduled.length > 0 && (
        <div className="card-premium p-5">
          <h3 className="text-sm font-semibold text-cowc-gray mb-3 uppercase tracking-wide">No Time Set</h3>
          <div className="space-y-2">
            {unscheduled.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-cowc-cream rounded-xl group">
                <Clock className="w-4 h-4 text-cowc-light-gray flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cowc-dark text-sm">{item.title}</p>
                  {item.description && <p className="text-xs text-cowc-gray truncate">{item.description}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingId(item.id)} className="p-1 hover:bg-white rounded">
                      <Edit2 className="w-3 h-3 text-cowc-dark" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                )}
                {editingId === item.id && (
                  <div className="absolute z-20 w-72">
                    <ItemEditForm
                      item={item}
                      onSave={async (updates) => { await onUpdate(item.id, updates); setEditingId(null) }}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !canEdit && (
        <div className="card-premium p-12 text-center">
          <Clock className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
          <p className="text-xl text-cowc-gray">No timeline items yet</p>
        </div>
      )}
    </div>
  )
}
