// Supabase API Service
// Replaces Airtable with Supabase for all data operations

import { supabase } from '../lib/supabase'

// =============================================
// USERS API
// =============================================
export const usersAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('email', 'ilike', '%@cowc.dev')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getByEmail(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error) throw error
    return data
  },

  async getByRole(role) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .not('email', 'ilike', '%@cowc.dev')
      .order('full_name')

    if (error) throw error
    return data
  },

  // Returns all staff who can be assigned as coordinators (coordinators + admins)
  // Dev/test accounts (@cowc.dev) are excluded from all coordinator lists
  async getCoordinators() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['coordinator', 'admin'])
      .not('email', 'ilike', '%@cowc.dev')
      .order('full_name')

    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// =============================================
// WEDDINGS API
// =============================================
export const weddingsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('weddings')
      .select(`
        *,
        couple:profiles!weddings_couple_user_id_fkey(id, full_name, email),
        tasks(*),
        vendors(*),
        timeline_items(*),
        coordinator_assignments(
          id,
          is_lead,
          coordinator:profiles(id, full_name, email)
        )
      `)
      .order('wedding_date', { ascending: true })

    if (error) throw error

    // Transform to match app format, exclude dev/test weddings
    return data
      .filter(w => !w.couple?.email?.endsWith('@cowc.dev'))
      .map(transformWedding)
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('weddings')
      .select(`
        *,
        couple:profiles!weddings_couple_user_id_fkey(id, full_name, email),
        tasks(*),
        vendors(*),
        timeline_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return transformWedding(data)
  },

  async getForCouple(userId) {
    const { data, error } = await supabase
      .from('weddings')
      .select(`
        *,
        tasks(*),
        vendors(*),
        timeline_items(*)
      `)
      .eq('couple_user_id', userId)

    if (error) throw error
    return data.map(transformWedding)
  },

  async getForCoordinator(userId) {
    // First get coordinator assignments
    const { data: assignments, error: assignError } = await supabase
      .from('coordinator_assignments')
      .select('wedding_id')
      .eq('coordinator_id', userId)

    if (assignError) throw assignError
    if (!assignments.length) return []

    const weddingIds = assignments.map(a => a.wedding_id)

    const { data, error } = await supabase
      .from('weddings')
      .select(`
        *,
        tasks(*),
        vendors(*),
        timeline_items(*),
        coordinator_assignments(
          id,
          is_lead,
          coordinator:profiles(id, full_name, email)
        )
      `)
      .in('id', weddingIds)

    if (error) throw error
    return data.map(transformWedding)
  },

  async create(wedding) {
    const { data, error } = await supabase
      .from('weddings')
      .insert({
        couple_name: wedding.couple_name,
        couple_user_id: wedding.couple_user_id || null,
        couple_email: wedding.couple_email || null,
        wedding_date: wedding.wedding_date,
        ceremony_time: wedding.ceremony_time || '16:00',
        venue_name: wedding.venue_name,
        venue_address: wedding.venue_address || '',
        guest_count: wedding.guest_count || 0,
        budget: wedding.budget || 0,
        status: wedding.status?.toLowerCase() || 'planning',
        notes: wedding.notes || '',
        theme_primary_color: wedding.theme?.primary || '#d4a574',
        theme_secondary_color: wedding.theme?.secondary || '#2d3748',
        theme_accent_color: wedding.theme?.accent || '#faf9f7',
        theme_vibe: wedding.theme?.vibe || 'Classic Elegant',
        inspiration_photos: wedding.theme?.inspiration_photos || [],
      })
      .select()
      .single()

    if (error) throw error
    return transformWedding(data)
  },

  async update(id, updates) {
    const updateData = {}

    // Map app fields to database fields
    if (updates.couple_name !== undefined) updateData.couple_name = updates.couple_name
    if (updates.couple_user_id !== undefined) updateData.couple_user_id = updates.couple_user_id
    if (updates.couple_email !== undefined) updateData.couple_email = updates.couple_email
    if (updates.couple_invite_sent_at !== undefined) updateData.couple_invite_sent_at = updates.couple_invite_sent_at
    if (updates.wedding_date !== undefined) updateData.wedding_date = updates.wedding_date
    if (updates.ceremony_time !== undefined) updateData.ceremony_time = updates.ceremony_time
    if (updates.venue_name !== undefined) updateData.venue_name = updates.venue_name
    if (updates.venue_address !== undefined) updateData.venue_address = updates.venue_address
    if (updates.guest_count !== undefined) updateData.guest_count = updates.guest_count
    if (updates.budget !== undefined) updateData.budget = updates.budget
    // Store status exactly as provided (DB constraint validates allowed values)
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.archived !== undefined) updateData.archived = updates.archived
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.package_type !== undefined) updateData.package_type = updates.package_type

    // Theme updates
    if (updates.theme) {
      if (updates.theme.primary   !== undefined) updateData.theme_primary_color   = updates.theme.primary
      if (updates.theme.secondary !== undefined) updateData.theme_secondary_color = updates.theme.secondary
      if (updates.theme.accent    !== undefined) updateData.theme_accent_color    = updates.theme.accent
      if (updates.theme.color4    !== undefined) updateData.theme_color_4         = updates.theme.color4
      if (updates.theme.color5    !== undefined) updateData.theme_color_5         = updates.theme.color5
      if (updates.theme.vibe      !== undefined) updateData.theme_vibe            = updates.theme.vibe
      if (updates.theme.extraColors         !== undefined) updateData.theme_extra_colors         = updates.theme.extraColors
      if (updates.theme.gradientColorIndex  !== undefined) updateData.theme_gradient_color_index = updates.theme.gradientColorIndex
      if (updates.theme.inspiration_photos  !== undefined) updateData.inspiration_photos         = updates.theme.inspiration_photos
      if (updates.theme.pinterest_boards   !== undefined) updateData.pinterest_boards   = updates.theme.pinterest_boards
    }

    const { data, error } = await supabase
      .from('weddings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transformWedding(data)
  },

  async delete(id) {
    const { error } = await supabase
      .from('weddings')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },
}

// =============================================
// TASKS API
// =============================================
export const tasksAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        wedding:weddings(id, couple_name, wedding_date)
      `)
      .order('due_date', { ascending: true })

    if (error) throw error
    return data.map(t => ({
      ...transformTask(t),
      wedding: t.wedding || null,
    }))
  },

  async getByWedding(weddingId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('due_date', { ascending: true })

    if (error) throw error
    return data.map(transformTask)
  },

  async create(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        wedding_id: task.wedding_id,
        title: task.title,
        description: task.description || '',
        due_date: task.due_date,
        assigned_to: task.assigned_to || 'couple',
        assigned_user_id: task.assigned_user_id || null,
        priority: task.priority || 'medium',
        category: task.category || null,
      })
      .select()
      .single()

    if (error) throw error
    return transformTask(data)
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transformTask(data)
  },

  async complete(id) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transformTask(data)
  },

  async uncomplete(id) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: false, completed_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transformTask(data)
  },

  async delete(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },
}

// =============================================
// VENDORS API
// =============================================
export const vendorsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        wedding:weddings(id, couple_name, wedding_date)
      `)
      .order('name')

    if (error) throw error

    const flat = data.map(v => ({
      ...transformVendor(v),
      wedding: v.wedding || null,
    }))
    // Return only top-level companies with members nested; orphaned members included flat
    return nestVendors(flat)
  },

  async search(query) {
    if (!query || query.length < 2) return []

    const { data, error } = await supabase
      .from('vendors')
      .select('*, wedding:weddings(id, couple_name)')
      .ilike('name', `%${query}%`)
      .is('parent_vendor_id', null)   // only match companies
      .limit(8)

    if (error) throw error
    return data.map(v => ({
      ...transformVendor(v),
      wedding_name: v.wedding?.couple_name || '',
    }))
  },

  async getByWedding(weddingId) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('name')

    if (error) throw error
    return nestVendors(data.map(transformVendor))
  },

  async create(vendor) {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        wedding_id: vendor.wedding_id,
        name: vendor.name,
        category: vendor.category,
        contact_email: vendor.contact_email || vendor.contact || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
        notes: vendor.notes || '',
        role: vendor.role || null,
        cost: vendor.cost || null,
        status: vendor.status || 'pending',
        submitted_by_couple: vendor.submitted_by_couple || false,
        parent_vendor_id: vendor.parent_vendor_id || null,
        vendor_role: vendor.parent_vendor_id ? 'member' : 'company',
      })
      .select()
      .single()

    if (error) throw error
    return transformVendor(data)
  },

  // Convenience: add a team member under a parent company vendor
  async addMember(parentVendorId, member) {
    return vendorsAPI.create({
      ...member,
      parent_vendor_id: parentVendorId,
      vendor_role: 'member',
      // category inherited from parent — not required for members
      category: member.category || 'other',
    })
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transformVendor(data)
  },

  async delete(id) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },
}

// =============================================
// TIMELINE API
// =============================================
export const timelineAPI = {
  async getByWedding(weddingId) {
    const { data, error } = await supabase
      .from('timeline_items')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data.map(transformTimelineItem)
  },

  async create(item) {
    const { data, error } = await supabase
      .from('timeline_items')
      .insert({
        wedding_id: item.wedding_id,
        title: item.title,
        time: item.time || null,
        description: item.description || '',
        sort_order: item.sort_order || item.order || 0,
      })
      .select()
      .single()

    if (error) throw error
    return transformTimelineItem(data)
  },

  async update(id, updates) {
    const updateData = { ...updates }
    if (updates.order !== undefined) {
      updateData.sort_order = updates.order
      delete updateData.order
    }

    const { data, error } = await supabase
      .from('timeline_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return transformTimelineItem(data)
  },

  async delete(id) {
    const { error } = await supabase
      .from('timeline_items')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },

  async reorder(weddingId, orderedIds) {
    // Update sort_order for all items
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index,
    }))

    for (const update of updates) {
      await supabase
        .from('timeline_items')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }

    return true
  },
}

// =============================================
// COORDINATOR ASSIGNMENTS API
// =============================================
export const coordinatorAssignmentsAPI = {
  async getByWedding(weddingId) {
    const { data, error } = await supabase
      .from('coordinator_assignments')
      .select(`
        *,
        coordinator:profiles(id, full_name, email)
      `)
      .eq('wedding_id', weddingId)

    if (error) throw error
    return data
  },

  async assign(weddingId, coordinatorId, isLead = false) {
    const { data, error } = await supabase
      .from('coordinator_assignments')
      .insert({
        wedding_id: weddingId,
        coordinator_id: coordinatorId,
        is_lead: isLead,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async unassign(weddingId, coordinatorId) {
    const { error } = await supabase
      .from('coordinator_assignments')
      .delete()
      .eq('wedding_id', weddingId)
      .eq('coordinator_id', coordinatorId)

    if (error) throw error
    return true
  },

  async setLead(weddingId, coordinatorId) {
    // First, remove lead from all coordinators for this wedding
    await supabase
      .from('coordinator_assignments')
      .update({ is_lead: false })
      .eq('wedding_id', weddingId)

    // Then set the new lead
    const { data, error } = await supabase
      .from('coordinator_assignments')
      .update({ is_lead: true })
      .eq('wedding_id', weddingId)
      .eq('coordinator_id', coordinatorId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// =============================================
// CHANGE LOGS API
// =============================================
export const changeLogsAPI = {
  async getByWedding(weddingId) {
    const { data, error } = await supabase
      .from('change_logs')
      .select(`
        *,
        user:profiles(id, full_name)
      `)
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async create(log) {
    const { data, error } = await supabase
      .from('change_logs')
      .insert({
        wedding_id: log.wedding_id,
        changed_by: log.changed_by_user_id || log.changed_by,
        change_type: log.change_type,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        description: log.description,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// =============================================
// NOTIFICATIONS API
// =============================================
export const notificationsAPI = {
  async getForUser(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async markAsRead(id) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)

    if (error) throw error
    return true
  },

  async create(notification) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        wedding_id: notification.wedding_id || null,
        message: notification.message,
        type: notification.type || 'info',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// =============================================
// HELPER: Log change and notify
// =============================================
export async function logChangeAndNotify(changeLog) {
  try {
    await changeLogsAPI.create(changeLog)

    // Create in-app notifications for other wedding participants
    if (changeLog.wedding_id && changeLog.changed_by_user_id) {
      await _dispatchNotifications(changeLog)
    }
  } catch (error) {
    console.error('Error logging change:', error)
  }
}

async function _dispatchNotifications(changeLog) {
  try {
    // Get the wedding to find coordinators + couple
    const { data: wedding, error } = await supabase
      .from('weddings')
      .select(`
        couple_user_id,
        couple_name,
        coordinator_assignments(coordinator_id)
      `)
      .eq('id', changeLog.wedding_id)
      .single()

    if (error || !wedding) return

    // Collect all participant user IDs except the person who made the change
    const participantIds = new Set()

    if (wedding.couple_user_id) {
      participantIds.add(wedding.couple_user_id)
    }
    wedding.coordinator_assignments?.forEach((a) => {
      participantIds.add(a.coordinator_id)
    })
    participantIds.delete(changeLog.changed_by_user_id) // don't notify yourself

    if (participantIds.size === 0) return

    // Insert one notification per participant
    const rows = Array.from(participantIds).map((uid) => ({
      user_id: uid,
      wedding_id: changeLog.wedding_id,
      message: `${wedding.couple_name}: ${changeLog.description}`,
      type: changeLog.change_type || 'info',
      read: false,
    }))

    await supabase.from('notifications').insert(rows)
  } catch (err) {
    // Non-fatal — just log
    console.warn('Could not dispatch notifications:', err.message)
  }
}

// =============================================
// TRANSFORM FUNCTIONS
// =============================================
function transformWedding(data) {
  if (!data) return null

  return {
    id: data.id,
    couple_name: data.couple_name,
    couple_user_id: data.couple_user_id,
    couple_email: data.couple_email || null,
    couple_invite_sent_at: data.couple_invite_sent_at || null,
    couple: data.couple || null,
    wedding_date: data.wedding_date,
    ceremony_time: data.ceremony_time,
    venue_name: data.venue_name,
    venue_address: data.venue_address,
    guest_count: data.guest_count,
    budget: data.budget,
    status: data.status,
    package_type: data.package_type || null,
    archived: data.archived || false,
    notes: data.notes,
    theme: (() => {
      const primary   = data.theme_primary_color   || '#d4a574'
      const secondary = data.theme_secondary_color || '#2d3748'
      const accent    = data.theme_accent_color    || '#faf9f7'
      const color4    = data.theme_color_4         || '#f0e6d3'
      const color5    = data.theme_color_5         || '#ffffff'
      const extraColors = data.theme_extra_colors  || []
      // Compute which color drives the gradient
      const gradientColorIndex = data.theme_gradient_color_index ?? 0
      const allColors = [primary, secondary, accent, color4, color5, ...extraColors]
      const gradientBase = allColors[gradientColorIndex] || primary
      return {
        primary, secondary, accent, color4, color5,
        vibe: data.theme_vibe || 'Classic Elegant',
        extraColors,
        gradientColorIndex,
        gradientBase,
        inspiration_photos: data.inspiration_photos || [],
        pinterest_boards: data.pinterest_boards || [],
      }
    })(),
    tasks: data.tasks?.map(transformTask) || [],
    vendors: nestVendors(data.vendors?.map(transformVendor) || []),
    timeline_items: data.timeline_items?.map(transformTimelineItem) || [],
    coordinators: data.coordinator_assignments || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function transformTask(data) {
  if (!data) return null

  return {
    id: data.id,
    wedding_id: data.wedding_id,
    title: data.title,
    description: data.description,
    due_date: data.due_date,
    assigned_to: data.assigned_to,
    assigned_user_id: data.assigned_user_id,
    completed: data.completed,
    completed_at: data.completed_at,
    priority: data.priority,
    category: data.category,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

function transformVendor(data) {
  if (!data) return null

  return {
    id: data.id,
    wedding_id: data.wedding_id,
    name: data.name,
    category: data.category,
    contact_email: data.contact_email,
    contact: data.contact_email, // Alias for compatibility
    phone: data.phone,
    website: data.website,
    notes: data.notes,
    cost: data.cost,
    paid: data.paid,
    status: data.status,
    submitted_by_couple: data.submitted_by_couple || false,
    role: data.role || '',
    parent_vendor_id: data.parent_vendor_id || null,
    vendor_role: data.vendor_role || 'company',
    members: data.members || [], // populated by nestVendors()
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

/**
 * Takes a flat array of vendor objects (already through transformVendor)
 * and returns top-level companies with their team members nested under .members[].
 * Any vendor with a parent_vendor_id whose parent isn't in the list is kept flat.
 */
function nestVendors(flatVendors) {
  const byId = {}
  const companies = []
  const orphans = []

  flatVendors.forEach(v => {
    byId[v.id] = { ...v, members: [] }
  })

  flatVendors.forEach(v => {
    if (v.parent_vendor_id && byId[v.parent_vendor_id]) {
      byId[v.parent_vendor_id].members.push(byId[v.id])
    } else if (!v.parent_vendor_id) {
      companies.push(byId[v.id])
    } else {
      orphans.push(byId[v.id]) // parent deleted — treat as top-level
    }
  })

  return [...companies, ...orphans]
}

function transformTimelineItem(data) {
  if (!data) return null

  return {
    id: data.id,
    wedding_id: data.wedding_id,
    title: data.title,
    time: data.time,
    description: data.description,
    order: data.sort_order,
    sort_order: data.sort_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}
