import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Clock, Plus, Edit2, Trash2, Save, Calendar, FileText,
  ChevronDown, X, ArrowUp, ArrowDown
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────
const START_HOUR  = 6
const END_HOUR    = 24
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 80
const DEFAULT_DUR = 30
const MIN_EVENT_PX = 52

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180]

// Type color palettes
const TYPE_STYLES = {
  wedding: {
    border: 'border-cowc-gold/60',
    activeBorder: 'border-cowc-gold ring-2 ring-cowc-gold/20',
    hoverBorder: 'hover:border-cowc-gold/40',
    dot: 'bg-cowc-gold',
    badge: 'bg-cowc-gold/10 text-cowc-gold border border-cowc-gold/20',
    icon: 'bg-cowc-gold/10',
    iconColor: 'text-cowc-gold',
    label: 'Wedding',
  },
  vendor: {
    border: 'border-indigo-300/60',
    activeBorder: 'border-indigo-400 ring-2 ring-indigo-200/30',
    hoverBorder: 'hover:border-indigo-300/50',
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
    icon: 'bg-indigo-100',
    iconColor: 'text-indigo-500',
    label: 'Vendor',
  },
}
function typeStyle(t) { return TYPE_STYLES[t] ?? TYPE_STYLES.wedding }

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

function toInputTime(timeStr) {
  const h = parseTime(timeStr)
  if (h === null) return ''
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function snapHours(raw) {
  return Math.max(START_HOUR, Math.min(END_HOUR - 0.25,
    Math.round(raw / 0.25) * 0.25))
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
function durLabel(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ── Full edit form (portal) ───────────────────────────────────────────────────
function ItemEditForm({ item, anchorRef, onSave, onCancel }) {
  const [title,       setTitle]       = useState(item.title || '')
  const [description, setDescription] = useState(item.description || '')
  const [eventDate,   setEventDate]   = useState(item.event_date || '')
  const [itemType,    setItemType]    = useState(item.timeline_type || 'wedding')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320, fixed: true })
  const formRef = useRef(null)

  useEffect(() => {
    if (!anchorRef?.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const FORM_H  = 280 // approx height
    const FORM_W  = Math.max(320, Math.min(rect.width, 380))
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    const top = spaceBelow >= FORM_H || spaceBelow >= spaceAbove
      ? Math.min(rect.bottom + 6, window.innerHeight - FORM_H - 8)
      : rect.top - FORM_H - 6

    const left = Math.max(8, Math.min(rect.left, window.innerWidth - FORM_W - 8))
    setPos({ top, left, width: FORM_W, fixed: true })
  }, [anchorRef])

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="space-y-2 p-3 bg-white rounded-xl shadow-2xl border-2 border-cowc-gold/40"
      ref={formRef}
      onClick={e => e.stopPropagation()}
    >
      <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
        className="input-premium text-sm py-2 w-full" placeholder="Event title" />
      <textarea value={description} onChange={e => setDescription(e.target.value)}
        className="input-premium text-sm py-2 w-full min-h-[60px]" rows={2}
        placeholder="Description (optional)" />
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
          className="input-premium text-sm py-1.5 flex-1" />
        {eventDate && (
          <button onClick={() => setEventDate('')} className="text-xs text-cowc-gray hover:text-red-500 flex-shrink-0">Clear</button>
        )}
      </div>
      {/* Type selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setItemType('wedding')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            itemType === 'wedding'
              ? 'bg-cowc-gold text-white border-cowc-gold'
              : 'bg-white text-cowc-gray border-cowc-sand hover:border-cowc-gold/50'
          }`}
        >Wedding</button>
        <button
          onClick={() => setItemType('vendor')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            itemType === 'vendor'
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-white text-cowc-gray border-cowc-sand hover:border-indigo-300'
          }`}
        >Vendor</button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title: title.trim(), description: description.trim(), event_date: eventDate || null, timeline_type: itemType })}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-40"
        >
          <Save className="w-3 h-3" /> Save
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-gray-200 text-cowc-dark text-xs font-semibold hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Quick time editor (portal) ───────────────────────────────────────────────
function TimeEditPopover({ item, anchorRef, onSave, onCancel }) {
  const [timeVal, setTimeVal] = useState(toInputTime(item.time))
  const [durVal,  setDurVal]  = useState(item.duration_minutes ?? DEFAULT_DUR)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRef?.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const FORM_H = 180
    const FORM_W = 260
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const top = spaceBelow >= FORM_H || spaceBelow >= spaceAbove
      ? Math.min(rect.bottom + 6, window.innerHeight - FORM_H - 8)
      : rect.top - FORM_H - 6
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - FORM_W - 8))
    setPos({ top, left })
  }, [anchorRef])

  const handleSave = () => {
    if (!timeVal) return
    const [hStr, mStr] = timeVal.split(':')
    const h = parseInt(hStr), m = parseInt(mStr)
    onSave(formatTime(h + m / 60), durVal)
  }

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: 260, zIndex: 9999 }}
      className="p-3 bg-white rounded-xl shadow-2xl border-2 border-cowc-gold/40 space-y-3"
      onClick={e => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-cowc-gray uppercase tracking-widest">Edit Time</p>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-cowc-gray block mb-1">Start time</label>
          <input autoFocus type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)}
            className="input-premium text-sm py-1.5 w-full" />
        </div>
        <div>
          <label className="text-xs text-cowc-gray block mb-1">Duration</label>
          <select value={durVal} onChange={e => setDurVal(Number(e.target.value))}
            className="input-premium text-sm py-1.5 w-full">
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>{durLabel(d)}</option>
            ))}
            {!DURATION_OPTIONS.includes(durVal) && (
              <option value={durVal}>{durLabel(durVal)}</option>
            )}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cowc-gold text-white text-xs font-semibold hover:bg-cowc-gold/90">
          <Save className="w-3 h-3" /> Save
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-gray-100 text-cowc-dark text-xs font-semibold hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimelineCalendar({
  items, canEdit, isCouple, onReorder, onUpdate, onDelete, onAddAt
}) {
  const scrollRef   = useRef(null)
  const calendarRef = useRef(null)
  const eventRefs   = useRef({})

  const [localItems,  setLocalItems]  = useState(items)
  const [expandedId,  setExpandedId]  = useState(null)
  const [timeEditId,  setTimeEditId]  = useState(null)
  const [editingId,   setEditingId]   = useState(null)
  const [notesDraft,  setNotesDraft]  = useState({})
  const [savingNotes, setSavingNotes] = useState(null)
  const [hoverHour,   setHoverHour]   = useState(null)
  // 'both' | 'wedding' | 'vendor' — coordinators/admins can toggle; couple always sees wedding
  const [typeFilter,  setTypeFilter]  = useState('both')

  useEffect(() => { setLocalItems(items) }, [items])

  // ── Filtering ─────────────────────────────────────────────────────────────
  const effectiveFilter = isCouple ? 'wedding' : typeFilter
  const filteredItems = localItems.filter(i =>
    effectiveFilter === 'both' || (i.timeline_type ?? 'wedding') === effectiveFilter
  )

  // ── Sorted/split ─────────────────────────────────────────────────────────
  const sorted = [...filteredItems].sort((a, b) => {
    const ta = parseTime(a.time), tb = parseTime(b.time)
    if (ta === null && tb === null) return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (ta === null) return 1
    if (tb === null) return -1
    return ta - tb
  })
  const scheduled   = sorted.filter(i => parseTime(i.time) !== null)
  const unscheduled = sorted.filter(i => parseTime(i.time) === null)

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current || scheduled.length === 0) return
    const firstHour = parseTime(scheduled[0].time)
    scrollRef.current.scrollTop = Math.max(0, hoursToTop(firstHour) - HOUR_HEIGHT * 1.5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!scheduled.length])

  // ── Notes ─────────────────────────────────────────────────────────────────
  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      const item = localItems.find(i => i.id === id)
      setNotesDraft(d => ({ ...d, [id]: item?.notes ?? '' }))
    }
    setTimeEditId(null)
    setEditingId(null)
  }

  const saveNotes = async (id) => {
    const notes = notesDraft[id] ?? ''
    const current = localItems.find(i => i.id === id)
    if (current?.notes === notes) return
    setSavingNotes(id)
    setLocalItems(prev => prev.map(i => i.id === id ? { ...i, notes } : i))
    await onUpdate(id, { notes })
    setSavingNotes(null)
  }

  // ── Quick time save ───────────────────────────────────────────────────────
  const handleTimeSave = async (id, newTime, newDur) => {
    setTimeEditId(null)
    setLocalItems(prev => prev.map(i => i.id === id ? { ...i, time: newTime, duration_minutes: newDur } : i))
    await onUpdate(id, { time: newTime, duration_minutes: newDur })
  }

  // ── Reorder ───────────────────────────────────────────────────────────────
  const handleReorder = (id, direction) => {
    if (!onReorder) return
    onReorder(id, direction)
  }

  // ── Click-to-add on grid ──────────────────────────────────────────────────
  const handleCalendarClick = (e) => {
    if (!canEdit || e.target !== e.currentTarget) return
    const rect = calendarRef.current?.getBoundingClientRect()
    if (!rect) return
    onAddAt(formatTime(snapHours((e.clientY - rect.top) / HOUR_HEIGHT + START_HOUR)))
  }

  // ── Event card renderer ───────────────────────────────────────────────────
  const renderEventCard = (item, allVisible) => {
    const hours    = parseTime(item.time)
    const isGrid   = hours !== null
    const dur      = item.duration_minutes ?? DEFAULT_DUR
    const heightPx = isGrid ? eventHeightPx(dur) : null
    const isShort  = isGrid && heightPx < 52
    const isExpanded = expandedId === item.id
    const ts = typeStyle(item.timeline_type ?? 'wedding')
    const idx = allVisible.findIndex(i => i.id === item.id)
    const isFirst = idx === 0
    const isLast  = idx === allVisible.length - 1

    const card = (
      <div
        ref={el => { if (el) eventRefs.current[item.id] = el; else delete eventRefs.current[item.id] }}
        key={item.id}
        className={isGrid ? 'absolute left-3 right-3 z-10' : ''}
        style={isGrid ? { top: hoursToTop(hours) + 1 } : {}}
      >
        <div
          className={`rounded-xl border-2 shadow-sm group transition-all duration-200 overflow-visible bg-white ${
            isExpanded ? ts.activeBorder : `${ts.border} ${ts.hoverBorder}`
          }`}
          style={isGrid ? { minHeight: heightPx, cursor: 'pointer' } : { cursor: 'pointer' }}
          onClick={() => toggleExpand(item.id)}
        >
          {/* Main row */}
          <div
            className="flex items-start gap-2 px-3"
            style={{ paddingTop: isShort ? 4 : 8, paddingBottom: isShort ? 4 : 8 }}
          >
            {/* Type indicator dot */}
            <div className="flex-shrink-0 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${ts.dot}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isShort ? (
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-cowc-dark text-xs truncate">{item.title}</p>
                  {canEdit ? (
                    <button
                      className={`text-xs font-medium flex-shrink-0 whitespace-nowrap hover:underline focus:outline-none ${ts.iconColor}`}
                      onClick={e => { e.stopPropagation(); setTimeEditId(item.id); setEditingId(null) }}
                    >
                      {item.time} – {endTimeLabel(hours, dur)}
                    </button>
                  ) : (
                    <span className={`text-xs font-medium flex-shrink-0 whitespace-nowrap ${ts.iconColor}`}>
                      {item.time} – {endTimeLabel(hours, dur)}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-semibold text-cowc-dark text-sm truncate leading-tight">{item.title}</p>
                  {isGrid && (
                    canEdit ? (
                      <button
                        className={`text-xs font-medium whitespace-nowrap hover:underline focus:outline-none mt-0.5 block ${ts.iconColor}`}
                        onClick={e => { e.stopPropagation(); setTimeEditId(item.id); setEditingId(null) }}
                      >
                        {item.time} – {endTimeLabel(hours, dur)} · {durLabel(dur)}
                      </button>
                    ) : (
                      <span className={`text-xs font-medium whitespace-nowrap mt-0.5 block ${ts.iconColor}`}>
                        {item.time} – {endTimeLabel(hours, dur)} · {durLabel(dur)}
                      </span>
                    )
                  )}
                  {item.event_date && (
                    <p className="text-xs text-cowc-gray/80 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                      {new Date(item.event_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-cowc-gray mt-0.5 truncate">{item.description}</p>
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0 self-start mt-0.5">
              {/* Notes indicator */}
              {item.notes && (
                <FileText className="w-3 h-3 text-cowc-gold/60 flex-shrink-0" />
              )}
              {/* Type badge — visible to non-couple when showing 'both' */}
              {!isCouple && effectiveFilter === 'both' && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ts.badge}`}>
                  {ts.label}
                </span>
              )}
              {/* Expand chevron */}
              <ChevronDown
                className={`w-3.5 h-3.5 text-cowc-gray/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
              {canEdit && (
                <>
                  {/* Up / down reorder arrows */}
                  {onReorder && (
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); if (!isFirst) handleReorder(item.id, 'up') }}
                        className={`p-0.5 rounded hover:bg-cowc-cream ${isFirst ? 'opacity-20 cursor-not-allowed' : ''}`}
                        disabled={isFirst}
                      >
                        <ArrowUp className="w-2.5 h-2.5 text-cowc-gray" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (!isLast) handleReorder(item.id, 'down') }}
                        className={`p-0.5 rounded hover:bg-cowc-cream ${isLast ? 'opacity-20 cursor-not-allowed' : ''}`}
                        disabled={isLast}
                      >
                        <ArrowDown className="w-2.5 h-2.5 text-cowc-gray" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setEditingId(item.id); setTimeEditId(null) }}
                    className="p-1 hover:bg-cowc-cream rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-3 h-3 text-cowc-dark" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                    className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Expanded notes panel ── */}
          {isExpanded && (
            <div
              className="border-t border-cowc-sand/50 px-3 pb-3 pt-2"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-cowc-gold" />
                  <span className="text-xs text-cowc-gray uppercase tracking-widest font-semibold">Meeting Notes</span>
                </div>
                {savingNotes === item.id && (
                  <span className="text-xs text-cowc-light-gray">Saving…</span>
                )}
              </div>
              <textarea
                value={notesDraft[item.id] ?? ''}
                onChange={e => setNotesDraft(d => ({ ...d, [item.id]: e.target.value }))}
                onBlur={() => saveNotes(item.id)}
                placeholder={canEdit ? 'Click to add notes from this meeting…' : 'No notes yet.'}
                readOnly={!canEdit}
                rows={4}
                className="w-full text-sm text-cowc-dark bg-cowc-cream/60 rounded-lg px-3 py-2 resize-none border border-cowc-sand focus:outline-none focus:border-cowc-gold transition-colors placeholder:text-cowc-light-gray"
              />
              {canEdit && (
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => saveNotes(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cowc-gold text-white text-xs font-semibold hover:bg-cowc-gold/90 transition-colors"
                  >
                    <Save className="w-3 h-3" /> Save Notes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Time editor popover */}
        {timeEditId === item.id && (
          <TimeEditPopover
            item={item}
            anchorRef={{ current: eventRefs.current[item.id] }}
            onSave={(newTime, newDur) => handleTimeSave(item.id, newTime, newDur)}
            onCancel={() => setTimeEditId(null)}
          />
        )}

        {/* Full edit form */}
        {editingId === item.id && (
          <ItemEditForm
            item={item}
            anchorRef={{ current: eventRefs.current[item.id] }}
            onSave={async (u) => {
              setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, ...u } : i))
              setEditingId(null)
              await onUpdate(item.id, u)
            }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </div>
    )

    return card
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="card-premium overflow-hidden">
        {/* ── Type toggle bar (coordinator/admin only) ── */}
        {!isCouple && (
          <div className="px-4 pt-3 pb-2 border-b border-cowc-sand/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-cowc-cream rounded-lg p-1">
              {(['both', 'wedding', 'vendor']).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all capitalize ${
                    typeFilter === t
                      ? t === 'vendor'
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : t === 'wedding'
                          ? 'bg-cowc-gold text-white shadow-sm'
                          : 'bg-white text-cowc-dark shadow-sm'
                      : 'text-cowc-gray hover:text-cowc-dark'
                  }`}
                >
                  {t === 'both' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {canEdit && (
              <p className="text-xs text-cowc-gray/70 hidden sm:block">
                Click an event to view notes · Click a time badge to edit time · Click empty space to add
              </p>
            )}
          </div>
        )}

        {/* Couple hint bar */}
        {isCouple && canEdit && (
          <div className="px-4 py-3 border-b border-cowc-sand/50 flex items-center gap-2 text-xs text-cowc-gray">
            <Clock className="w-3.5 h-3.5 text-cowc-light-gray" />
            Click an event to view notes · Click a time badge to edit time · Click empty space to add
          </div>
        )}

        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="flex">
            {/* Hour labels */}
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
              {/* Hour lines */}
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div key={i}
                  className={`absolute left-0 right-0 border-t ${i === 0 ? 'border-cowc-sand' : 'border-cowc-sand/40'}`}
                  style={{ top: i * HOUR_HEIGHT }} />
              ))}
              {/* Half-hour lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div key={`h-${i}`}
                  className="absolute left-0 right-0 border-t border-dashed border-cowc-sand/20"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              ))}

              {/* Click-to-add overlay */}
              <div
                ref={calendarRef}
                className="absolute inset-0 z-0"
                style={{ cursor: canEdit ? 'crosshair' : 'default' }}
                onClick={handleCalendarClick}
                onMouseMove={e => {
                  if (!canEdit) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHoverHour(snapHours((e.clientY - rect.top) / HOUR_HEIGHT + START_HOUR))
                }}
                onMouseLeave={() => setHoverHour(null)}
              >
                {canEdit && hoverHour !== null && (
                  <div className="absolute left-2 right-2 flex items-center gap-2 pointer-events-none"
                    style={{ top: hoursToTop(hoverHour) - 1 }}>
                    <div className="h-0.5 flex-1 bg-cowc-gold/30 rounded" />
                    <span className="text-xs text-cowc-gold/60 font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" />{formatTime(hoverHour)}
                    </span>
                  </div>
                )}
              </div>

              {/* Scheduled events */}
              {scheduled.map(item => renderEventCard(item, scheduled))}
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
              <div
                key={item.id}
                ref={el => { if (el) eventRefs.current[item.id] = el; else delete eventRefs.current[item.id] }}
                className={`flex items-center gap-3 p-3 rounded-xl group relative border ${
                  (item.timeline_type ?? 'wedding') === 'vendor'
                    ? 'bg-indigo-50/60 border-indigo-100'
                    : 'bg-cowc-cream border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${typeStyle(item.timeline_type ?? 'wedding').dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cowc-dark text-sm">{item.title}</p>
                  {item.description && <p className="text-xs text-cowc-gray truncate">{item.description}</p>}
                </div>
                {!isCouple && effectiveFilter === 'both' && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeStyle(item.timeline_type ?? 'wedding').badge}`}>
                    {typeStyle(item.timeline_type ?? 'wedding').label}
                  </span>
                )}
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingId(item.id); setTimeEditId(null) }}
                      className="p-1 hover:bg-white rounded">
                      <Edit2 className="w-3 h-3 text-cowc-dark" />
                    </button>
                    <button onClick={() => onDelete(item.id)}
                      className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                )}
                {editingId === item.id && (
                  <ItemEditForm
                    item={item}
                    anchorRef={{ current: eventRefs.current[item.id] }}
                    onSave={async (u) => {
                      setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, ...u } : i))
                      setEditingId(null)
                      await onUpdate(item.id, u)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="card-premium p-12 text-center">
          <Clock className="w-16 h-16 text-cowc-light-gray mx-auto mb-4" />
          <p className="text-xl text-cowc-gray">
            {localItems.length > 0 ? `No ${typeFilter} events` : 'No timeline items yet'}
          </p>
        </div>
      )}
    </div>
  )
}
