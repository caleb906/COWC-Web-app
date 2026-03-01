import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Clock, Plus, Edit2, Trash2, Save, Calendar, FileText,
  ChevronDown, X, ArrowUp, ArrowDown
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_DUR = 30
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180]

const TYPE_STYLES = {
  wedding: {
    border:       'border-cowc-gold/50',
    activeBorder: 'border-cowc-gold ring-2 ring-cowc-gold/20',
    hoverBorder:  'hover:border-cowc-gold/40',
    dot:          'bg-cowc-gold',
    badge:        'bg-amber-50 text-amber-700 border border-amber-200',
    timeColor:    'text-cowc-gold',
    label:        'Wedding',
  },
  vendor: {
    border:       'border-indigo-300/50',
    activeBorder: 'border-indigo-400 ring-2 ring-indigo-200/40',
    hoverBorder:  'hover:border-indigo-300/50',
    dot:          'bg-indigo-400',
    badge:        'bg-indigo-50 text-indigo-600 border border-indigo-200',
    timeColor:    'text-indigo-500',
    label:        'Vendor',
  },
}
function ts(type) { return TYPE_STYLES[type] ?? TYPE_STYLES.wedding }

// ── Time helpers ──────────────────────────────────────────────────────────────
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

function endTimeLabel(startHours, durMin) {
  return formatTime(Math.min(startHours + durMin / 60, 24))
}

function durLabel(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function hourLabel(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// ── Portal positioning helper ─────────────────────────────────────────────────
function calcPortalPos(anchorEl, formW, formH) {
  const rect = anchorEl.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= formH
    ? Math.min(rect.bottom + 6, window.innerHeight - formH - 8)
    : Math.max(8, rect.top - formH - 6)
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - formW - 8))
  return { top, left }
}

// ── Full edit form (portal) ───────────────────────────────────────────────────
function ItemEditForm({ item, anchorRef, onSave, onCancel }) {
  const [title,       setTitle]    = useState(item.title || '')
  const [description, setDesc]     = useState(item.description || '')
  const [eventDate,   setDate]     = useState(item.event_date || '')
  const [itemType,    setItemType] = useState(item.timeline_type || 'wedding')
  const [pos,         setPos]      = useState({ top: 0, left: 0, width: 340 })

  useEffect(() => {
    if (!anchorRef?.current) return
    const { top, left } = calcPortalPos(anchorRef.current, 340, 290)
    setPos({ top, left, width: 340 })
  }, [anchorRef])

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="space-y-2 p-3 bg-white rounded-xl shadow-2xl border-2 border-cowc-gold/40"
      onClick={e => e.stopPropagation()}
    >
      <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
        className="input-premium text-sm py-2 w-full" placeholder="Event title" />
      <textarea value={description} onChange={e => setDesc(e.target.value)}
        className="input-premium text-sm py-2 w-full min-h-[56px]" rows={2}
        placeholder="Description (optional)" />
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-cowc-gold flex-shrink-0" />
        <input type="date" value={eventDate} onChange={e => setDate(e.target.value)}
          className="input-premium text-sm py-1.5 flex-1" />
        {eventDate && (
          <button onClick={() => setDate('')} className="text-xs text-cowc-gray hover:text-red-500">Clear</button>
        )}
      </div>
      {/* Type picker */}
      <div className="flex gap-2">
        {['wedding', 'vendor'].map(t => (
          <button key={t} onClick={() => setItemType(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
              itemType === t
                ? t === 'vendor' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-cowc-gold text-white border-cowc-gold'
                : 'bg-white text-cowc-gray border-cowc-sand hover:border-cowc-gold/50'
            }`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title: title.trim(), description: description.trim(), event_date: eventDate || null, timeline_type: itemType })}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-40"
        ><Save className="w-3 h-3" /> Save</button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-gray-200 text-cowc-dark text-xs font-semibold hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Quick time editor (portal) ────────────────────────────────────────────────
function TimeEditPopover({ item, anchorRef, onSave, onCancel }) {
  const [timeVal, setTimeVal] = useState(toInputTime(item.time))
  const [durVal,  setDurVal]  = useState(item.duration_minutes ?? DEFAULT_DUR)
  const [pos,     setPos]     = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRef?.current) return
    const { top, left } = calcPortalPos(anchorRef.current, 260, 180)
    setPos({ top, left })
  }, [anchorRef])

  const handleSave = () => {
    if (!timeVal) return
    const [hStr, mStr] = timeVal.split(':')
    onSave(formatTime(parseInt(hStr) + parseInt(mStr) / 60), durVal)
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
            {DURATION_OPTIONS.map(d => <option key={d} value={d}>{durLabel(d)}</option>)}
            {!DURATION_OPTIONS.includes(durVal) && <option value={durVal}>{durLabel(durVal)}</option>}
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
  const itemRefs = useRef({})

  const [localItems,  setLocalItems]  = useState(items)
  const [expandedId,  setExpandedId]  = useState(null)
  const [timeEditId,  setTimeEditId]  = useState(null)
  const [editingId,   setEditingId]   = useState(null)
  const [notesDraft,  setNotesDraft]  = useState({})
  const [savingNotes, setSavingNotes] = useState(null)
  const [typeFilter,  setTypeFilter]  = useState('both')

  useEffect(() => { setLocalItems(items) }, [items])

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const effectiveFilter = isCouple ? 'wedding' : typeFilter
  const filtered = localItems.filter(i =>
    effectiveFilter === 'both' || (i.timeline_type ?? 'wedding') === effectiveFilter
  )
  const sorted = [...filtered].sort((a, b) => {
    const ta = parseTime(a.time), tb = parseTime(b.time)
    if (ta === null && tb === null) return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (ta === null) return 1
    if (tb === null) return -1
    return ta - tb
  })

  // Group by hour for the ruler labels
  const getHourGroup = (item) => {
    const h = parseTime(item.time)
    if (h === null) return null
    return Math.floor(h)
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
    if (expandedId !== id) {
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

  const handleTimeSave = async (id, newTime, newDur) => {
    setTimeEditId(null)
    setLocalItems(prev => prev.map(i => i.id === id ? { ...i, time: newTime, duration_minutes: newDur } : i))
    await onUpdate(id, { time: newTime, duration_minutes: newDur })
  }

  // ── Render a single event card ────────────────────────────────────────────
  const renderCard = (item, allVisible) => {
    const hours      = parseTime(item.time)
    const dur        = item.duration_minutes ?? DEFAULT_DUR
    const isExpanded = expandedId === item.id
    const style      = ts(item.timeline_type ?? 'wedding')
    const idx        = allVisible.findIndex(i => i.id === item.id)
    const isFirst    = idx === 0
    const isLast     = idx === allVisible.length - 1

    return (
      <div
        key={item.id}
        ref={el => { if (el) itemRefs.current[item.id] = el; else delete itemRefs.current[item.id] }}
      >
        <div
          className={`rounded-xl border-2 shadow-sm group transition-all duration-200 bg-white ${
            isExpanded ? style.activeBorder : `${style.border} ${style.hoverBorder}`
          }`}
          style={{ cursor: 'pointer' }}
          onClick={() => toggleExpand(item.id)}
        >
          {/* Main row */}
          <div className="flex items-start gap-2 px-3 py-2.5">
            {/* Type dot */}
            <div className="flex-shrink-0 mt-1.5">
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-cowc-dark text-sm leading-tight">{item.title}</p>

              {/* Time / duration row */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {hours !== null && (
                  canEdit ? (
                    <button
                      className={`text-xs font-medium whitespace-nowrap hover:underline focus:outline-none ${style.timeColor}`}
                      onClick={e => { e.stopPropagation(); setTimeEditId(item.id); setEditingId(null) }}
                    >
                      {item.time} – {endTimeLabel(hours, dur)} · {durLabel(dur)}
                    </button>
                  ) : (
                    <span className={`text-xs font-medium whitespace-nowrap ${style.timeColor}`}>
                      {item.time} – {endTimeLabel(hours, dur)} · {durLabel(dur)}
                    </span>
                  )
                )}
                {item.event_date && (
                  <span className="text-xs text-cowc-gray/80 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(item.event_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-cowc-gray mt-0.5 line-clamp-2">{item.description}</p>
              )}
            </div>

            {/* Right-side actions */}
            <div className="flex items-center gap-1 flex-shrink-0 self-start">
              {item.notes && <FileText className="w-3 h-3 text-cowc-gold/60" />}

              {/* Type badge — only in 'both' view for non-couple */}
              {!isCouple && effectiveFilter === 'both' && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                  {style.label}
                </span>
              )}

              <ChevronDown className={`w-3.5 h-3.5 text-cowc-gray/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />

              {canEdit && (
                <>
                  {onReorder && (
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); if (!isFirst) onReorder(item.id, 'up') }}
                        disabled={isFirst}
                        className={`p-0.5 rounded hover:bg-cowc-cream ${isFirst ? 'opacity-20 cursor-not-allowed' : ''}`}
                      ><ArrowUp className="w-2.5 h-2.5 text-cowc-gray" /></button>
                      <button
                        onClick={e => { e.stopPropagation(); if (!isLast) onReorder(item.id, 'down') }}
                        disabled={isLast}
                        className={`p-0.5 rounded hover:bg-cowc-cream ${isLast ? 'opacity-20 cursor-not-allowed' : ''}`}
                      ><ArrowDown className="w-2.5 h-2.5 text-cowc-gray" /></button>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setEditingId(item.id); setTimeEditId(null) }}
                    className="p-1 hover:bg-cowc-cream rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  ><Edit2 className="w-3 h-3 text-cowc-dark" /></button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                    className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  ><Trash2 className="w-3 h-3 text-red-500" /></button>
                </>
              )}
            </div>
          </div>

          {/* Expanded notes */}
          {isExpanded && (
            <div className="border-t border-cowc-sand/50 px-3 pb-3 pt-2" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-cowc-gold" />
                  <span className="text-xs text-cowc-gray uppercase tracking-widest font-semibold">Meeting Notes</span>
                </div>
                {savingNotes === item.id && <span className="text-xs text-cowc-light-gray">Saving…</span>}
              </div>
              <textarea
                value={notesDraft[item.id] ?? ''}
                onChange={e => setNotesDraft(d => ({ ...d, [item.id]: e.target.value }))}
                onBlur={() => saveNotes(item.id)}
                placeholder={canEdit ? 'Add notes from this meeting…' : 'No notes yet.'}
                readOnly={!canEdit}
                rows={4}
                className="w-full text-sm text-cowc-dark bg-cowc-cream/60 rounded-lg px-3 py-2 resize-none border border-cowc-sand focus:outline-none focus:border-cowc-gold transition-colors placeholder:text-cowc-light-gray"
              />
              {canEdit && (
                <div className="flex justify-end mt-1.5">
                  <button onClick={() => saveNotes(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cowc-gold text-white text-xs font-semibold hover:bg-cowc-gold/90">
                    <Save className="w-3 h-3" /> Save Notes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popovers */}
        {timeEditId === item.id && (
          <TimeEditPopover
            item={item}
            anchorRef={{ current: itemRefs.current[item.id] }}
            onSave={(t, d) => handleTimeSave(item.id, t, d)}
            onCancel={() => setTimeEditId(null)}
          />
        )}
        {editingId === item.id && (
          <ItemEditForm
            item={item}
            anchorRef={{ current: itemRefs.current[item.id] }}
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
  }

  // ── Build schedule rows with hour-group headers ───────────────────────────
  const scheduledItems = sorted.filter(i => parseTime(i.time) !== null)
  const unscheduledItems = sorted.filter(i => parseTime(i.time) === null)

  // Group consecutive items into hour buckets for the time ruler
  const hourGroups = []
  let lastHour = null
  scheduledItems.forEach(item => {
    const h = getHourGroup(item)
    if (h !== lastHour) {
      hourGroups.push({ hour: h, items: [item] })
      lastHour = h
    } else {
      hourGroups[hourGroups.length - 1].items.push(item)
    }
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Type toggle bar ───────────────────────────────────────────────── */}
      {!isCouple && (
        <div className="card-premium px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-cowc-cream rounded-lg p-1">
            {['both', 'wedding', 'vendor'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
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
            <p className="text-xs text-cowc-gray/60 hidden md:block">
              Click event to expand · Click time to edit · Click empty area to add
            </p>
          )}
        </div>
      )}

      {/* ── Main schedule list ────────────────────────────────────────────── */}
      <div className="card-premium overflow-hidden">
        {/* Click-to-add hint for couple */}
        {isCouple && canEdit && (
          <div className="px-4 py-2.5 border-b border-cowc-sand/50 flex items-center gap-2 text-xs text-cowc-gray">
            <Clock className="w-3.5 h-3.5 text-cowc-light-gray" />
            Click a time to edit · Click an event to expand notes
          </div>
        )}

        {scheduledItems.length === 0 && unscheduledItems.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-14 h-14 text-cowc-light-gray mx-auto mb-3" />
            <p className="text-lg text-cowc-gray">
              {localItems.length > 0 ? `No ${typeFilter} events` : 'No timeline items yet'}
            </p>
            {canEdit && (
              <p className="text-sm text-cowc-light-gray mt-1">Use "Add Item" or "AI Import" above to get started</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-cowc-sand/30">
            {/* Scheduled items with hour group headers */}
            {hourGroups.map(({ hour, items: groupItems }) => (
              <div key={hour}>
                {/* Hour header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-cowc-cream/60 sticky top-0 z-10">
                  <Clock className="w-3.5 h-3.5 text-cowc-light-gray flex-shrink-0" />
                  <span className="text-xs font-semibold text-cowc-gray uppercase tracking-widest">
                    {hourLabel(hour)}
                  </span>
                  <div className="flex-1 h-px bg-cowc-sand/60" />
                </div>
                {/* Items in this hour */}
                <div className="px-3 py-2 space-y-2">
                  {groupItems.map(item => renderCard(item, scheduledItems))}
                </div>
              </div>
            ))}

            {/* Unscheduled items */}
            {unscheduledItems.length > 0 && (
              <div>
                <div className="flex items-center gap-3 px-4 py-2 bg-cowc-cream/60">
                  <Clock className="w-3.5 h-3.5 text-cowc-light-gray flex-shrink-0" />
                  <span className="text-xs font-semibold text-cowc-gray uppercase tracking-widest">No Time Set</span>
                  <div className="flex-1 h-px bg-cowc-sand/60" />
                </div>
                <div className="px-3 py-2 space-y-2">
                  {unscheduledItems.map(item => renderCard(item, unscheduledItems))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Click-to-add at the bottom */}
        {canEdit && (
          <button
            onClick={() => onAddAt && onAddAt(null)}
            className="w-full py-3 flex items-center justify-center gap-2 text-xs text-cowc-gray/50 hover:text-cowc-gold hover:bg-cowc-gold/5 transition-all border-t border-cowc-sand/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Add event
          </button>
        )}
      </div>
    </div>
  )
}
