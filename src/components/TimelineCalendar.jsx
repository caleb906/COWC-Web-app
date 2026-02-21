import { useState, useRef, useCallback, useEffect } from 'react'
import { Clock, GripVertical, Plus, Edit2, Trash2, Save, X } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const START_HOUR      = 6    // 6 AM
const END_HOUR        = 24   // midnight
const TOTAL_HOURS     = END_HOUR - START_HOUR
const HOUR_HEIGHT     = 80   // px per hour
const SNAP_TO         = 0.25 // snap to 15-minute intervals
const DEFAULT_DUR     = 30   // default event duration in minutes
const MIN_DUR         = 15   // minimum duration in minutes
const RESIZE_ZONE     = 10   // px from top/bottom edge that triggers resize
const MIN_EVENT_PX    = 28   // minimum rendered event height

// ── Time helpers ─────────────────────────────────────────────────────────────
function parseTime(str) {
  if (!str) return null
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
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${meridiem}`
}

function snapHours(raw) {
  const snapped = Math.round(raw / SNAP_TO) * SNAP_TO
  return Math.max(START_HOUR, Math.min(END_HOUR - SNAP_TO, snapped))
}

function snapDuration(minutes) {
  const snapped = Math.round(minutes / (SNAP_TO * 60)) * (SNAP_TO * 60)
  return Math.max(MIN_DUR, snapped)
}

function hoursToTop(hours24) {
  return (hours24 - START_HOUR) * HOUR_HEIGHT
}

function hourLabel(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function eventHeightPx(durationMin) {
  return Math.max(MIN_EVENT_PX, (durationMin / 60) * HOUR_HEIGHT)
}

// ── Ripple cascade ───────────────────────────────────────────────────────────
// After moving/resizing an event, push any subsequent overlapping events forward
function rippleCascade(allItems, changedId, newStartHours, newDurationMin) {
  const scheduled = allItems.filter(i => parseTime(i.time) !== null)
  const working = scheduled.map(i => ({
    id: i.id,
    start: i.id === changedId ? newStartHours : parseTime(i.time),
    dur: (i.id === changedId ? newDurationMin : (i.duration_minutes ?? DEFAULT_DUR)) / 60,
    isChanged: i.id === changedId,
  })).sort((a, b) => a.start - b.start)

  const changedIdx = working.findIndex(i => i.isChanged)
  if (changedIdx === -1) return []

  const updates = []
  let prevEnd = working[changedIdx].start + working[changedIdx].dur

  for (let i = changedIdx + 1; i < working.length; i++) {
    const item = working[i]
    let newStart = item.start
    if (newStart < prevEnd) {
      newStart = snapHours(prevEnd)
      updates.push({ id: item.id, time: formatTime(newStart), duration_minutes: item.dur * 60 })
    }
    prevEnd = newStart + item.dur
  }
  return updates
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
  const calendarRef  = useRef(null)   // click-to-add overlay
  const scrollRef    = useRef(null)   // scrollable container
  const [editingId, setEditingId] = useState(null)
  const [hoverHour,  setHoverHour]  = useState(null)

  // drag state: { id, mode: 'move'|'top'|'bottom', ghostTop, ghostDur, startY, initialTop, initialDur }
  const [dragging, setDragging] = useState(null)

  // ripple animation: set of ids that just shifted
  const [rippledIds, setRippledIds] = useState(new Set())

  // Sort items by time; unscheduled at bottom
  const sorted = [...items].sort((a, b) => {
    const ta = parseTime(a.time)
    const tb = parseTime(b.time)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    return ta - tb
  })

  // ── Auto-scroll to first event on mount ────────────────────────────────────
  useEffect(() => {
    const scheduled = sorted.filter(i => parseTime(i.time) !== null)
    if (!scrollRef.current || scheduled.length === 0) return
    const firstHour = parseTime(scheduled[0].time)
    const targetTop = Math.max(0, hoursToTop(firstHour) - HOUR_HEIGHT * 1.5)
    scrollRef.current.scrollTop = targetTop
  // Only run on mount / when items first arrive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty'])

  // ── Determine drag mode from pointer position within an event ───────────────
  function getDragMode(e, eventEl) {
    const rect = eventEl.getBoundingClientRect()
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top
    if (y <= RESIZE_ZONE) return 'top'
    if (y >= rect.height - RESIZE_ZONE) return 'bottom'
    return 'move'
  }

  // ── Mouse drag handlers ─────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, item) => {
    if (!canEdit) return
    e.preventDefault()
    const mode = getDragMode(e, e.currentTarget.closest('[data-event]') || e.currentTarget)
    const parsedHours = parseTime(item.time) ?? START_HOUR + 8
    const dur = item.duration_minutes ?? DEFAULT_DUR
    const initialTop = hoursToTop(parsedHours)
    setDragging({
      id: item.id,
      mode,
      ghostTop: initialTop,
      ghostDur: dur,
      startY: e.clientY,
      initialTop,
      initialDur: dur,
    })
  }, [canEdit])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const dy = e.clientY - dragging.startY

    if (dragging.mode === 'move') {
      const rawTop = dragging.initialTop + dy
      const clampedTop = Math.max(0, Math.min(TOTAL_HOURS * HOUR_HEIGHT - MIN_EVENT_PX, rawTop))
      setDragging(d => ({ ...d, ghostTop: clampedTop }))

    } else if (dragging.mode === 'bottom') {
      // Stretch bottom: keep start fixed, change duration
      const newDurMin = snapDuration((dragging.initialDur / 60 + dy / HOUR_HEIGHT) * 60)
      setDragging(d => ({ ...d, ghostDur: newDurMin }))

    } else if (dragging.mode === 'top') {
      // Stretch top: keep end fixed, move start up/down
      const endHours = dragging.initialTop / HOUR_HEIGHT + START_HOUR + dragging.initialDur / 60
      const rawNewTop = dragging.initialTop + dy
      const clampedTop = Math.max(0, Math.min(hoursToTop(endHours) - MIN_EVENT_PX, rawNewTop))
      const newStartHours = snapHours(clampedTop / HOUR_HEIGHT + START_HOUR)
      const newDurMin = snapDuration((endHours - newStartHours) * 60)
      setDragging(d => ({ ...d, ghostTop: hoursToTop(newStartHours), ghostDur: newDurMin }))
    }
  }, [dragging])

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return
    const { id, ghostTop, ghostDur } = dragging
    const newHours = snapHours(ghostTop / HOUR_HEIGHT + START_HOUR)
    const newTime  = formatTime(newHours)
    const newDur   = ghostDur
    setDragging(null)

    // Compute ripple updates
    const rippleUpdates = rippleCascade(items, id, newHours, newDur)
    const rippledSet = new Set(rippleUpdates.map(u => u.id))

    if (rippledSet.size > 0) {
      setRippledIds(rippledSet)
      setTimeout(() => setRippledIds(new Set()), 600)
    }

    // Apply main update
    await onUpdate(id, { time: newTime, duration_minutes: newDur })

    // Apply ripple updates
    for (const u of rippleUpdates) {
      await onUpdate(u.id, { time: u.time })
    }
  }, [dragging, items, onUpdate])

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e, item) => {
    if (!canEdit) return
    const touch = e.touches[0]
    const mode = getDragMode({ clientY: touch.clientY }, e.currentTarget.closest('[data-event]') || e.currentTarget)
    const parsedHours = parseTime(item.time) ?? START_HOUR + 8
    const dur = item.duration_minutes ?? DEFAULT_DUR
    const initialTop = hoursToTop(parsedHours)
    setDragging({
      id: item.id,
      mode,
      ghostTop: initialTop,
      ghostDur: dur,
      startY: touch.clientY,
      initialTop,
      initialDur: dur,
    })
  }, [canEdit])

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return
    e.preventDefault()
    const touch = e.touches[0]
    const dy = touch.clientY - dragging.startY

    if (dragging.mode === 'move') {
      const rawTop = dragging.initialTop + dy
      const clampedTop = Math.max(0, Math.min(TOTAL_HOURS * HOUR_HEIGHT - MIN_EVENT_PX, rawTop))
      setDragging(d => ({ ...d, ghostTop: clampedTop }))

    } else if (dragging.mode === 'bottom') {
      const newDurMin = snapDuration((dragging.initialDur / 60 + dy / HOUR_HEIGHT) * 60)
      setDragging(d => ({ ...d, ghostDur: newDurMin }))

    } else if (dragging.mode === 'top') {
      const endHours = dragging.initialTop / HOUR_HEIGHT + START_HOUR + dragging.initialDur / 60
      const rawNewTop = dragging.initialTop + dy
      const clampedTop = Math.max(0, Math.min(hoursToTop(endHours) - MIN_EVENT_PX, rawNewTop))
      const newStartHours = snapHours(clampedTop / HOUR_HEIGHT + START_HOUR)
      const newDurMin = snapDuration((endHours - newStartHours) * 60)
      setDragging(d => ({ ...d, ghostTop: hoursToTop(newStartHours), ghostDur: newDurMin }))
    }
  }, [dragging])

  const handleTouchEnd = useCallback(async () => {
    if (!dragging) return
    const { id, ghostTop, ghostDur } = dragging
    const newHours = snapHours(ghostTop / HOUR_HEIGHT + START_HOUR)
    const newTime  = formatTime(newHours)
    const newDur   = ghostDur
    setDragging(null)

    const rippleUpdates = rippleCascade(items, id, newHours, newDur)
    const rippledSet = new Set(rippleUpdates.map(u => u.id))
    if (rippledSet.size > 0) {
      setRippledIds(rippledSet)
      setTimeout(() => setRippledIds(new Set()), 600)
    }

    await onUpdate(id, { time: newTime, duration_minutes: newDur })
    for (const u of rippleUpdates) {
      await onUpdate(u.id, { time: u.time })
    }
  }, [dragging, items, onUpdate])

  // Global listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup',   handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend',  handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup',   handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend',  handleTouchEnd)
    }
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // ── Click-to-add ─────────────────────────────────────────────────────────────
  const handleCalendarClick = (e) => {
    if (!canEdit || dragging) return
    if (e.target !== e.currentTarget) return
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    const y = e.clientY - rect.top
    const hours = snapHours(y / HOUR_HEIGHT + START_HOUR)
    onAddAt(formatTime(hours))
  }

  // ── Cursor style for resize zones ────────────────────────────────────────────
  const getEventCursor = (e, item) => {
    if (!canEdit) return 'default'
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const y = e.clientY - rect.top
    if (y <= RESIZE_ZONE || y >= rect.height - RESIZE_ZONE) return 'ns-resize'
    return 'grab'
  }

  const scheduled   = sorted.filter(item => parseTime(item.time) !== null)
  const unscheduled = sorted.filter(item => parseTime(item.time) === null)

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="card-premium overflow-hidden">
        {canEdit && (
          <div className="px-4 py-3 border-b border-cowc-sand/50 flex items-center gap-2 text-xs text-cowc-gray">
            <GripVertical className="w-3.5 h-3.5 text-cowc-light-gray" />
            Drag to move · Grab top/bottom edge to resize · Click empty space to add
          </div>
        )}

        {/* Scrollable calendar */}
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex">
            {/* Time labels */}
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

            {/* Grid + events */}
            <div className="flex-1 relative border-l border-cowc-sand/50" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {/* Hour lines */}
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-cowc-sand' : 'border-cowc-sand/40'}`}
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {/* Half-hour lines */}
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
                {/* Hover indicator */}
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
                  className="absolute left-3 right-3 z-30 pointer-events-none rounded-xl bg-cowc-gold/90 shadow-2xl border-2 border-cowc-gold"
                  style={{
                    top: dragging.ghostTop,
                    height: eventHeightPx(dragging.ghostDur),
                    opacity: 0.85,
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-2 text-white text-sm font-semibold h-full">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{formatTime(snapHours(dragging.ghostTop / HOUR_HEIGHT + START_HOUR))}</span>
                    <span className="text-white/70 text-xs ml-auto">{dragging.ghostDur}m</span>
                  </div>
                </div>
              )}

              {/* Scheduled events */}
              {scheduled.map((item) => {
                const hours      = parseTime(item.time)
                const top        = hoursToTop(hours)
                const dur        = item.duration_minutes ?? DEFAULT_DUR
                const heightPx   = eventHeightPx(dur)
                const isDragging = dragging?.id === item.id
                const isEditing  = editingId === item.id
                const isRippled  = rippledIds.has(item.id)
                const isShort    = heightPx < 48

                return (
                  <div
                    key={item.id}
                    data-event={item.id}
                    className={`absolute left-3 right-3 z-10 ${isDragging ? 'opacity-25' : 'opacity-100'} ${isRippled ? 'animate-pulse' : ''}`}
                    style={{
                      top: top + 1,
                      height: heightPx,
                      transition: isDragging ? 'none' : 'top 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    onMouseMove={(e) => {
                      if (!canEdit || dragging) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const cursor = (y <= RESIZE_ZONE || y >= rect.height - RESIZE_ZONE) ? 'ns-resize' : 'grab'
                      e.currentTarget.style.cursor = cursor
                    }}
                  >
                    {isEditing ? (
                      <ItemEditForm
                        item={item}
                        onSave={async (updates) => { await onUpdate(item.id, updates); setEditingId(null) }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div
                        className={`relative flex items-start gap-2 px-3 rounded-xl border-2 shadow-sm group transition-all h-full overflow-hidden ${
                          isDragging
                            ? 'bg-cowc-gold/10 border-cowc-gold'
                            : isRippled
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                            : 'bg-white border-cowc-sand hover:border-cowc-gold/40'
                        }`}
                        onMouseDown={canEdit ? (e) => handleDragStart(e, item) : undefined}
                        onTouchStart={canEdit ? (e) => handleTouchStart(e, item) : undefined}
                        style={{ cursor: canEdit ? 'grab' : 'default', paddingTop: isShort ? '4px' : '8px', paddingBottom: isShort ? '4px' : '8px' }}
                      >
                        {/* Top resize handle */}
                        {canEdit && (
                          <div
                            className="absolute top-0 left-0 right-0 h-2.5 cursor-ns-resize z-20 group/top"
                            title="Drag to move start time"
                          >
                            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-cowc-light-gray/40 group-hover/top:bg-cowc-gold/60 transition-colors" />
                          </div>
                        )}

                        {/* Event content */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-5 h-5 bg-cowc-gold/10 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 text-cowc-gold" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {isShort ? (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-cowc-dark text-xs truncate">{item.title}</p>
                              <span className="text-xs text-cowc-gold font-medium flex-shrink-0">{item.time}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-2">
                                <p className="font-semibold text-cowc-dark text-sm truncate">{item.title}</p>
                                <span className="text-xs text-cowc-gold font-medium flex-shrink-0">{item.time}</span>
                              </div>
                              {item.description && !isShort && (
                                <p className="text-xs text-cowc-gray mt-0.5 truncate">{item.description}</p>
                              )}
                              <p className="text-xs text-cowc-light-gray mt-0.5">{dur}m</p>
                            </>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-0.5">
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); setEditingId(item.id) }}
                              className="p-1 hover:bg-cowc-cream rounded"
                            >
                              <Edit2 className="w-3 h-3 text-cowc-dark" />
                            </button>
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                              className="p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        )}

                        {/* Bottom resize handle */}
                        {canEdit && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize z-20 group/bottom"
                            title="Drag to change duration"
                          >
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-cowc-light-gray/40 group-hover/bottom:bg-cowc-gold/60 transition-colors" />
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

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div className="card-premium p-5">
          <h3 className="text-sm font-semibold text-cowc-gray mb-3 uppercase tracking-wide">No Time Set</h3>
          <div className="space-y-2">
            {unscheduled.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-cowc-cream rounded-xl group relative">
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
                  <div className="absolute left-0 right-0 top-full z-20 mt-1">
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
