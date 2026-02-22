import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Clock, GripVertical, Plus, Edit2, Trash2, Save } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const START_HOUR      = 6
const END_HOUR        = 24
const TOTAL_HOURS     = END_HOUR - START_HOUR
const HOUR_HEIGHT     = 80
const SNAP_TO         = 0.25
const DEFAULT_DUR     = 30
const MIN_DUR         = 15
const RESIZE_ZONE     = 10
const MIN_EVENT_PX    = 28

// ── Time helpers ─────────────────────────────────────────────────────────────
function parseTime(str) {
  if (!str) return null
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) return parseInt(m24[1]) + parseInt(m24[2]) / 60
  const m12 = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m12) return null
  let h = parseInt(m12[1])
  const min = parseInt(m12[2])
  const mer = m12[3].toUpperCase()
  if (mer === 'PM' && h !== 12) h += 12
  if (mer === 'AM' && h === 12) h = 0
  return h + min / 60
}

function formatTime(hours24) {
  const h = Math.floor(hours24)
  const m = Math.round((hours24 - h) * 60)
  const mer = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${mer}`
}

function snapHours(raw) {
  return Math.max(START_HOUR, Math.min(END_HOUR - SNAP_TO,
    Math.round(raw / SNAP_TO) * SNAP_TO))
}

function snapDuration(minutes) {
  return Math.max(MIN_DUR, Math.round(minutes / (SNAP_TO * 60)) * (SNAP_TO * 60))
}

function hoursToTop(h) { return (h - START_HOUR) * HOUR_HEIGHT }

function eventHeightPx(dur) { return Math.max(MIN_EVENT_PX, (dur / 60) * HOUR_HEIGHT) }

function endTimeLabel(startHours, durMin) {
  return formatTime(Math.min(startHours + durMin / 60, END_HOUR))
}

function hourLabel(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// ── Ripple cascade ────────────────────────────────────────────────────────────
function rippleCascade(allItems, changedId, newStartHours, newDurMin) {
  const scheduled = allItems.filter(i => parseTime(i.time) !== null)
  const working = scheduled.map(i => ({
    id: i.id,
    start: i.id === changedId ? newStartHours : parseTime(i.time),
    dur:   (i.id === changedId ? newDurMin : (i.duration_minutes ?? DEFAULT_DUR)) / 60,
    isChanged: i.id === changedId,
  })).sort((a, b) => a.start - b.start)

  const idx = working.findIndex(i => i.isChanged)
  if (idx === -1) return []

  const updates = []
  let prevEnd = working[idx].start + working[idx].dur
  for (let i = idx + 1; i < working.length; i++) {
    let s = working[i].start
    if (s < prevEnd) {
      s = snapHours(prevEnd)
      updates.push({ id: working[i].id, time: formatTime(s) })
    }
    prevEnd = s + working[i].dur
  }
  return updates
}

// ── Inline edit form ──────────────────────────────────────────────────────────
function ItemEditForm({ item, onSave, onCancel }) {
  const [title, setTitle] = useState(item.title || '')
  const [description, setDescription] = useState(item.description || '')
  return (
    <div className="space-y-2 p-3 bg-white rounded-xl shadow-lg border-2 border-cowc-gold/30 z-20 relative"
      onClick={e => e.stopPropagation()}>
      <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
        className="input-premium text-sm py-2 w-full" placeholder="Event title" />
      <textarea value={description} onChange={e => setDescription(e.target.value)}
        className="input-premium text-sm py-2 w-full min-h-[60px]" rows={2}
        placeholder="Description (optional)" />
      <div className="flex gap-2">
        <button onClick={() => onSave({ title: title.trim(), description: description.trim() })}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-40">
          <Save className="w-3 h-3" /> Save
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-gray-200 text-cowc-dark text-xs font-semibold hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimelineCalendar({ items, canEdit, onUpdate, onDelete, onAddAt }) {
  const calendarRef = useRef(null)
  const scrollRef   = useRef(null)

  // Local copy — updated optimistically so the UI never reloads mid-drag
  const [localItems, setLocalItems] = useState(items)
  useEffect(() => { setLocalItems(items) }, [items])

  const [editingId,  setEditingId]  = useState(null)
  const [hoverHour,  setHoverHour]  = useState(null)
  const [rippledIds, setRippledIds] = useState(new Set())

  // drag: { id, mode:'move'|'top'|'bottom', ghostTop, ghostDur, startY, initialTop, initialDur }
  const [dragging, setDragging] = useState(null)

  // ── Sorted views ──────────────────────────────────────────────────────────
  const sorted = [...localItems].sort((a, b) => {
    const ta = parseTime(a.time), tb = parseTime(b.time)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    return ta - tb
  })
  const scheduled   = sorted.filter(i => parseTime(i.time) !== null)
  const unscheduled = sorted.filter(i => parseTime(i.time) === null)

  // ── Auto-scroll to first event ─────────────────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current || scheduled.length === 0) return
    const firstHour = parseTime(scheduled[0].time)
    scrollRef.current.scrollTop = Math.max(0, hoursToTop(firstHour) - HOUR_HEIGHT * 1.5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!scheduled.length])

  // ── Live ripple preview during drag ──────────────────────────────────────
  const livePositions = useMemo(() => {
    if (!dragging) return {}
    const newHours = snapHours(dragging.ghostTop / HOUR_HEIGHT + START_HOUR)
    const ripple   = rippleCascade(localItems, dragging.id, newHours, dragging.ghostDur)
    const map = {}
    for (const u of ripple) {
      const h = parseTime(u.time)
      if (h !== null) {
        const orig = localItems.find(i => i.id === u.id)
        map[u.id] = { top: hoursToTop(h), dur: orig?.duration_minutes ?? DEFAULT_DUR }
      }
    }
    return map
  }, [dragging?.ghostTop, dragging?.ghostDur, dragging?.id, localItems])

  // ── Drag mode from pointer position ──────────────────────────────────────
  function getDragMode(clientY, el) {
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top
    if (y <= RESIZE_ZONE) return 'top'
    if (y >= rect.height - RESIZE_ZONE) return 'bottom'
    return 'move'
  }

  // ── Drop handler (shared mouse + touch) ──────────────────────────────────
  const commitDrop = useCallback(async () => {
    if (!dragging) return
    const { id, ghostTop, ghostDur } = dragging
    const newHours = snapHours(ghostTop / HOUR_HEIGHT + START_HOUR)
    const newTime  = formatTime(newHours)
    const newDur   = ghostDur
    const ripple   = rippleCascade(localItems, id, newHours, newDur)

    // Optimistic local state — no reload needed
    const allUpdates = [{ id, time: newTime, duration_minutes: newDur }, ...ripple]
    setLocalItems(prev => prev.map(item => {
      const u = allUpdates.find(x => x.id === item.id)
      return u ? { ...item, ...u } : item
    }))

    // Ripple highlight animation
    const rSet = new Set(ripple.map(u => u.id))
    if (rSet.size > 0) {
      setRippledIds(rSet)
      setTimeout(() => setRippledIds(new Set()), 700)
    }

    setDragging(null)

    // Persist all in parallel — parent does NOT need to reload
    await Promise.all([
      onUpdate(id, { time: newTime, duration_minutes: newDur }),
      ...ripple.map(u => onUpdate(u.id, { time: u.time })),
    ])
  }, [dragging, localItems, onUpdate])

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const startDrag = useCallback((clientY, item, el) => {
    if (!canEdit) return
    const mode = getDragMode(clientY, el)
    const parsedH = parseTime(item.time) ?? START_HOUR + 8
    const dur = item.duration_minutes ?? DEFAULT_DUR
    const initialTop = hoursToTop(parsedH)
    setDragging({ id: item.id, mode, ghostTop: initialTop, ghostDur: dur,
                  startY: clientY, initialTop, initialDur: dur })
  }, [canEdit])

  const moveDrag = useCallback((clientY) => {
    if (!dragging) return
    const dy = clientY - dragging.startY
    setDragging(d => {
      if (d.mode === 'move') {
        const clamp = v => Math.max(0, Math.min(TOTAL_HOURS * HOUR_HEIGHT - MIN_EVENT_PX, v))
        return { ...d, ghostTop: clamp(d.initialTop + dy) }
      }
      if (d.mode === 'bottom') {
        return { ...d, ghostDur: snapDuration((d.initialDur / 60 + dy / HOUR_HEIGHT) * 60) }
      }
      // top resize — keep end fixed
      const endH = d.initialTop / HOUR_HEIGHT + START_HOUR + d.initialDur / 60
      const rawTop = Math.max(0, Math.min(hoursToTop(endH) - MIN_EVENT_PX, d.initialTop + dy))
      const newStart = snapHours(rawTop / HOUR_HEIGHT + START_HOUR)
      return { ...d, ghostTop: hoursToTop(newStart),
                     ghostDur: snapDuration((endH - newStart) * 60) }
    })
  }, [dragging])

  const handleMouseDown = useCallback((e, item) => {
    e.preventDefault()
    startDrag(e.clientY, item, e.currentTarget.closest('[data-event]') || e.currentTarget)
  }, [startDrag])

  const handleMouseMove = useCallback((e) => { moveDrag(e.clientY) }, [moveDrag])
  const handleMouseUp   = useCallback(async () => { await commitDrop() }, [commitDrop])

  const handleTouchStart = useCallback((e, item) => {
    const t = e.touches[0]
    startDrag(t.clientY, item, e.currentTarget.closest('[data-event]') || e.currentTarget)
  }, [startDrag])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault(); moveDrag(e.touches[0].clientY)
  }, [moveDrag])
  const handleTouchEnd = useCallback(async () => { await commitDrop() }, [commitDrop])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup',   handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend',  handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup',   handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend',  handleTouchEnd)
    }
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const handleCalendarClick = (e) => {
    if (!canEdit || dragging || e.target !== e.currentTarget) return
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    onAddAt(formatTime(snapHours((e.clientY - rect.top) / HOUR_HEIGHT + START_HOUR)))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="card-premium overflow-hidden">
        {canEdit && (
          <div className="px-4 py-3 border-b border-cowc-sand/50 flex items-center gap-2 text-xs text-cowc-gray">
            <GripVertical className="w-3.5 h-3.5 text-cowc-light-gray" />
            Drag to move · Grab top/bottom edge to resize · Click empty space to add
          </div>
        )}

        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex">
            {/* Time labels */}
            <div className="flex-shrink-0 w-16 relative select-none" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div key={i} className="absolute right-3 text-xs text-cowc-light-gray font-medium"
                  style={{ top: i * HOUR_HEIGHT - 8, lineHeight: '1' }}>
                  {hourLabel(START_HOUR + i)}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 relative border-l border-cowc-sand/50" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div key={i}
                  className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-cowc-sand' : 'border-cowc-sand/40'}`}
                  style={{ top: i * HOUR_HEIGHT }} />
              ))}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div key={`h-${i}`}
                  className="absolute left-0 right-0 border-t border-dashed border-cowc-sand/20"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              ))}

              {/* Click-to-add overlay */}
              <div ref={calendarRef} className="absolute inset-0 z-0"
                style={{ cursor: canEdit ? 'crosshair' : 'default' }}
                onClick={handleCalendarClick}
                onMouseMove={e => {
                  if (!canEdit || dragging) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHoverHour(snapHours((e.clientY - rect.top) / HOUR_HEIGHT + START_HOUR))
                }}
                onMouseLeave={() => setHoverHour(null)}>
                {canEdit && hoverHour !== null && !dragging && (
                  <div className="absolute left-2 right-2 flex items-center gap-2 pointer-events-none"
                    style={{ top: hoursToTop(hoverHour) - 1 }}>
                    <div className="h-0.5 flex-1 bg-cowc-gold/30 rounded" />
                    <span className="text-xs text-cowc-gold/60 font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" />{formatTime(hoverHour)}
                    </span>
                  </div>
                )}
              </div>

              {/* Drag ghost */}
              {dragging && (() => {
                const ghostH = snapHours(dragging.ghostTop / HOUR_HEIGHT + START_HOUR)
                return (
                  <div className="absolute left-3 right-3 z-30 pointer-events-none rounded-xl bg-cowc-gold border-2 border-cowc-gold/80 shadow-2xl"
                    style={{ top: dragging.ghostTop, height: eventHeightPx(dragging.ghostDur), opacity: 0.88 }}>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-white text-sm font-semibold">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{formatTime(ghostH)}</span>
                      <span className="text-white/70 mx-0.5">–</span>
                      <span>{endTimeLabel(ghostH, dragging.ghostDur)}</span>
                      <span className="ml-auto text-white/60 text-xs">{dragging.ghostDur}m</span>
                    </div>
                  </div>
                )
              })()}

              {/* Events */}
              {scheduled.map(item => {
                const hours      = parseTime(item.time)
                const dur        = item.duration_minutes ?? DEFAULT_DUR
                const isDragging = dragging?.id === item.id
                const live       = !isDragging ? livePositions[item.id] : null
                const displayTop = isDragging ? dragging.ghostTop   : (live?.top ?? hoursToTop(hours))
                const displayDur = isDragging ? dragging.ghostDur   : (live?.dur ?? dur)
                const isRippling = !!live
                const isRippled  = rippledIds.has(item.id)
                const heightPx   = eventHeightPx(displayDur)
                const isShort    = heightPx < 52

                return (
                  <div key={item.id} data-event={item.id}
                    className={`absolute left-3 right-3 z-10 ${isDragging ? 'opacity-20' : 'opacity-100'}`}
                    style={{
                      top:        displayTop + 1,
                      height:     heightPx,
                      transition: isDragging
                        ? 'none'
                        : dragging
                          ? 'top 0.08s linear, height 0.08s linear'   // fast live-ripple
                          : 'top 0.35s cubic-bezier(0.34,1.56,0.64,1)',  // spring on drop
                    }}>
                    {editingId === item.id ? (
                      <ItemEditForm item={item}
                        onSave={async (u) => {
                          setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, ...u } : i))
                          setEditingId(null)
                          await onUpdate(item.id, u)
                        }}
                        onCancel={() => setEditingId(null)} />
                    ) : (
                      <div
                        data-event={item.id}
                        className={`relative flex items-start gap-2 px-3 rounded-xl border-2 shadow-sm group h-full overflow-hidden select-none ${
                          isDragging  ? 'bg-cowc-gold/10 border-cowc-gold' :
                          isRippling  ? 'bg-amber-50/80 border-amber-300' :
                          isRippled   ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200' :
                          'bg-white border-cowc-sand hover:border-cowc-gold/40'
                        }`}
                        onMouseDown={canEdit ? e => handleMouseDown(e, item) : undefined}
                        onTouchStart={canEdit ? e => handleTouchStart(e, item) : undefined}
                        style={{
                          cursor: canEdit ? 'grab' : 'default',
                          paddingTop:    isShort ? 4 : 8,
                          paddingBottom: isShort ? 4 : 8,
                        }}>

                        {/* Top resize grip */}
                        {canEdit && (
                          <div className="absolute top-0 left-0 right-0 h-2.5 cursor-ns-resize z-20 group/top">
                            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-cowc-light-gray/30 group-hover/top:bg-cowc-gold/60 transition-colors" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-5 h-5 bg-cowc-gold/10 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 text-cowc-gold" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {isShort ? (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-cowc-dark text-xs truncate">{item.title}</p>
                              <span className="text-xs text-cowc-gold font-medium flex-shrink-0 whitespace-nowrap">
                                {item.time} – {endTimeLabel(hours, displayDur)}
                              </span>
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-cowc-dark text-sm truncate leading-tight">{item.title}</p>
                              <span className="text-xs text-cowc-gold font-medium whitespace-nowrap">
                                {item.time} – {endTimeLabel(hours, displayDur)}
                              </span>
                              {item.description && (
                                <p className="text-xs text-cowc-gray mt-0.5 truncate">{item.description}</p>
                              )}
                            </>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-0.5">
                            <button onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); setEditingId(item.id) }}
                              className="p-1 hover:bg-cowc-cream rounded">
                              <Edit2 className="w-3 h-3 text-cowc-dark" />
                            </button>
                            <button onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                              className="p-1 hover:bg-red-50 rounded">
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        )}

                        {/* Bottom resize grip */}
                        {canEdit && (
                          <div className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize z-20 group/bottom">
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-cowc-light-gray/30 group-hover/bottom:bg-cowc-gold/60 transition-colors" />
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
                    <ItemEditForm item={item}
                      onSave={async (u) => {
                        setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, ...u } : i))
                        setEditingId(null)
                        await onUpdate(item.id, u)
                      }}
                      onCancel={() => setEditingId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !canEdit && (
        <div className="card-premium p-12 text-center">
          <Clock className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
          <p className="text-xl text-cowc-gray">No timeline items yet</p>
        </div>
      )}
    </div>
  )
}
