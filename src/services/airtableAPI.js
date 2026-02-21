// Airtable API Integration
// Docs: https://airtable.com/developers/web/api/introduction

const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

// Helper to make Airtable requests
async function airtableRequest(endpoint, options = {}) {
  const url = `${AIRTABLE_API_URL}/${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Airtable API Error:', error)
    throw new Error(error.error?.message || 'Airtable request failed')
  }

  return response.json()
}

// Transform Airtable record to app format
function transformWedding(record) {
  const fields = record.fields
  
  // Safely handle inspiration photos
  let inspirationPhotos = []
  if (fields['Inspiration Photos'] && Array.isArray(fields['Inspiration Photos'])) {
    inspirationPhotos = fields['Inspiration Photos'].map(photo => photo.url)
  }
  
  return {
    id: record.id,
    couple_name: fields['Couple Name'] || fields['Name'] || 'Unnamed Couple',
    couple_user_id: fields['Couple User ID'],
    wedding_date: fields['Wedding Date'] || null,
    ceremony_time: fields['Ceremony Time'] || '16:00',
    venue_name: fields['Venue Name'] || 'Venue TBD',
    venue_address: fields['Venue Address'] || '',
    guest_count: fields['Guest Count'] || 0,
    budget: fields['Budget'] || 0,
    status: fields['Status']?.toLowerCase() || 'planning',
    notes: fields['Notes'] || '',
    theme: {
      primary: fields['Theme Primary Color'] || '#d4a574',
      secondary: fields['Theme Secondary Color'] || '#2d3748',
      accent: fields['Theme Accent Color'] || '#faf9f7',
      vibe: fields['Theme Vibe'] || 'Classic Elegant',
      inspiration_photos: inspirationPhotos,
    },
    created_at: fields['Created At'] || new Date().toISOString(),
    updated_at: fields['Updated At'] || new Date().toISOString(),
  }
}

function transformTask(record) {
  const fields = record.fields
  return {
    id: record.id,
    title: fields['Title'],
    description: fields['Description'],
    wedding_id: fields['Wedding']?.[0], // Linked record ID
    due_date: fields['Due Date'],
    completed: fields['Completed'] || false,
    completed_at: fields['Completed At'],
    assigned_to: fields['Assigned To']?.toLowerCase() || 'couple',
    created_at: fields['Created At'],
  }
}

function transformUser(record) {
  const fields = record.fields
  return {
    id: record.id,
    full_name: fields['Full Name'],
    email: fields['Email'],
    phone: fields['Phone'],
    role: fields['Role']?.toLowerCase() || 'couple',
    status: fields['Status']?.toLowerCase() || 'active',
    created_at: fields['Created At'],
  }
}

function transformVendor(record) {
  const fields = record.fields
  return {
    id: record.id,
    name: fields['Name'],
    category: fields['Category']?.toLowerCase() || 'other',
    wedding_id: fields['Wedding']?.[0],
    contact: fields['Contact Email'],
    phone: fields['Phone'],
    website: fields['Website'],
    notes: fields['Notes'],
    created_at: fields['Created At'],
  }
}

function transformTimelineItem(record) {
  const fields = record.fields
  return {
    id: record.id,
    title: fields['Title'],
    wedding_id: fields['Wedding']?.[0],
    time: fields['Time'],
    description: fields['Description'],
    order: fields['Order'] || 0,
    created_at: fields['Created At'],
  }
}

// =============================================================================
// WEDDINGS API
// =============================================================================

export const airtableWeddingsAPI = {
  async getAll() {
    const data = await airtableRequest('Weddings')
    const weddings = data.records.map(transformWedding)
    
    // Enrich each wedding with related data
    const enrichedWeddings = await Promise.all(
      weddings.map(async (wedding) => {
        try {
          const [tasks, vendors, timelineItems, coordinators] = await Promise.allSettled([
            this.getTasks(wedding.id).catch(() => []),
            this.getVendors(wedding.id).catch(() => []),
            this.getTimelineItems(wedding.id).catch(() => []),
            this.getCoordinators(wedding.id).catch(() => []),
          ])

          return {
            ...wedding,
            tasks: tasks.status === 'fulfilled' ? tasks.value : [],
            vendors: vendors.status === 'fulfilled' ? vendors.value : [],
            timeline_items: timelineItems.status === 'fulfilled' ? timelineItems.value : [],
            coordinators: coordinators.status === 'fulfilled' ? coordinators.value : [],
          }
        } catch (error) {
          console.warn('Error enriching wedding:', wedding.id, error)
          return {
            ...wedding,
            tasks: [],
            vendors: [],
            timeline_items: [],
            coordinators: [],
          }
        }
      })
    )
    
    return enrichedWeddings
  },

  async getById(id) {
    try {
      console.log('Fetching wedding:', id)
      const data = await airtableRequest(`Weddings/${id}`)
      const wedding = transformWedding(data)
      console.log('Transformed wedding:', wedding)
      
      // Fetch related data with error handling
      console.log('Fetching related data for wedding:', id)
      const [tasks, vendors, timelineItems, coordinators] = await Promise.allSettled([
        this.getTasks(id).catch(err => { console.warn('Error loading tasks:', err); return []; }),
        this.getVendors(id).catch(err => { console.warn('Error loading vendors:', err); return []; }),
        this.getTimelineItems(id).catch(err => { console.warn('Error loading timeline:', err); return []; }),
        this.getCoordinators(id).catch(err => { console.warn('Error loading coordinators:', err); return []; }),
      ])

      console.log('Tasks result:', tasks)
      console.log('Vendors result:', vendors)
      console.log('Timeline result:', timelineItems)
      console.log('Coordinators result:', coordinators)

      const enrichedWedding = {
        ...wedding,
        tasks: tasks.status === 'fulfilled' ? tasks.value : [],
        vendors: vendors.status === 'fulfilled' ? vendors.value : [],
        timeline_items: timelineItems.status === 'fulfilled' ? timelineItems.value : [],
        coordinators: coordinators.status === 'fulfilled' ? coordinators.value : [],
      }

      console.log('Final enriched wedding:', enrichedWedding)
      return enrichedWedding
    } catch (error) {
      console.error('Error in getById:', error)
      throw error
    }
  },

  async getForCouple(userId) {
    // Sanitize userId to prevent injection attacks
    const sanitizedId = String(userId).replace(/['"\\]/g, '')
    const formula = `{Couple User ID} = '${sanitizedId}'`
    const data = await airtableRequest(`Weddings?filterByFormula=${encodeURIComponent(formula)}`)
    return data.records.map(transformWedding)
  },

  async getForCoordinator(userId) {
    // Sanitize userId to prevent injection attacks
    const sanitizedId = String(userId).replace(/['"\\]/g, '')
    // First get coordinator assignments
    const assignFormula = `{Coordinator} = '${sanitizedId}'`
    const assignments = await airtableRequest(`Coordinator Assignments?filterByFormula=${encodeURIComponent(assignFormula)}`)
    
    if (assignments.records.length === 0) return []

    // Get weddings for those assignments
    const weddingIds = assignments.records
      .map(r => r.fields['Wedding']?.[0])
      .filter(Boolean)
    
    if (weddingIds.length === 0) return []

    const weddings = await Promise.all(
      weddingIds.map(id => this.getById(id))
    )
    
    return weddings
  },

  async create(wedding) {
    // Removed Ceremony Time - add it manually in Airtable or change field type to Single Line Text
    const guestCount = Number(wedding.guest_count) || 0
    const budget = Number(wedding.budget) || 0
    
    console.log('Creating wedding with guest_count:', guestCount, 'type:', typeof guestCount)
    console.log('Creating wedding with budget:', budget, 'type:', typeof budget)
    
    const fields = {
      'Couple Name': wedding.couple_name,
      'Couple User ID': wedding.couple_user_id || '',
      'Wedding Date': wedding.wedding_date,
      'Venue Name': wedding.venue_name,
      'Venue Address': wedding.venue_address || '',
      'Guest Count': guestCount,
      'Budget': budget,
      'Status': wedding.status || 'Planning',
      'Notes': wedding.notes || '',
      'Theme Primary Color': wedding.theme?.primary || '#d4a574',
      'Theme Secondary Color': wedding.theme?.secondary || '#2d3748',
      'Theme Accent Color': wedding.theme?.accent || '#faf9f7',
      'Theme Vibe': wedding.theme?.vibe || 'Classic Elegant',
    }

    console.log('Sending fields to Airtable:', fields)

    const data = await airtableRequest('Weddings', {
      method: 'POST',
      body: JSON.stringify({ fields }),
    })
    
    return transformWedding(data)
  },

  async update(id, updates) {
    const fields = {}
    if (updates.couple_name) fields['Couple Name'] = updates.couple_name
    if (updates.wedding_date) fields['Wedding Date'] = updates.wedding_date
    if (updates.venue_name) fields['Venue Name'] = updates.venue_name
    if (updates.venue_address !== undefined) fields['Venue Address'] = updates.venue_address || ''
    if (updates.guest_count !== undefined) fields['Guest Count'] = Number(updates.guest_count) || 0
    if (updates.budget !== undefined) fields['Budget'] = Number(updates.budget) || 0
    if (updates.status) fields['Status'] = updates.status
    if (updates.notes !== undefined) fields['Notes'] = updates.notes || ''
    
    // Ceremony Time removed - causing field type errors

    console.log('Updating wedding with fields:', fields)

    const data = await airtableRequest(`Weddings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    })
    
    return transformWedding(data)
  },

  async delete(id) {
    await airtableRequest(`Weddings/${id}`, {
      method: 'DELETE',
    })
    return { success: true }
  },

  // Helper methods for related data
  async getTasks(weddingId) {
    try {
      console.log('getTasks called with weddingId:', weddingId)
      
      // Get ALL tasks first to see what we have
      const allTasksData = await airtableRequest(`Tasks`)
      console.log('ALL tasks in Airtable:', allTasksData)
      
      // Now filter client-side
      const matchingTasks = allTasksData.records.filter(record => {
        const taskWeddingId = record.fields['Wedding']?.[0]
        console.log('Task:', record.fields['Title'], 'Wedding field:', record.fields['Wedding'], 'taskWeddingId:', taskWeddingId, 'matches:', taskWeddingId === weddingId)
        return taskWeddingId === weddingId
      })
      
      console.log('Matching tasks:', matchingTasks)
      const tasks = matchingTasks.map(transformTask)
      console.log('getTasks transformed:', tasks)
      return tasks
    } catch (error) {
      console.error('Error in getTasks:', error)
      return []
    }
  },

  async getVendors(weddingId) {
    try {
      console.log('getVendors called with weddingId:', weddingId)
      
      // Get ALL vendors first
      const allVendorsData = await airtableRequest(`Vendors`)
      console.log('ALL vendors in Airtable:', allVendorsData)
      
      // Filter client-side
      const matchingVendors = allVendorsData.records.filter(record => {
        const vendorWeddingId = record.fields['Wedding']?.[0]
        console.log('Vendor:', record.fields['Name'], 'Wedding field:', record.fields['Wedding'], 'matches:', vendorWeddingId === weddingId)
        return vendorWeddingId === weddingId
      })
      
      console.log('Matching vendors:', matchingVendors)
      const vendors = matchingVendors.map(transformVendor)
      console.log('getVendors transformed:', vendors)
      return vendors
    } catch (error) {
      console.error('Error in getVendors:', error)
      return []
    }
  },

  async getTimelineItems(weddingId) {
    try {
      console.log('getTimelineItems called with weddingId:', weddingId)
      
      // Get ALL timeline items
      const allTimelineData = await airtableRequest(`Timeline Items`)
      console.log('ALL timeline items in Airtable:', allTimelineData)
      
      // Filter client-side
      const matchingItems = allTimelineData.records.filter(record => {
        const itemWeddingId = record.fields['Wedding']?.[0]
        console.log('Timeline:', record.fields['Title'], 'Wedding field:', record.fields['Wedding'], 'matches:', itemWeddingId === weddingId)
        return itemWeddingId === weddingId
      })
      
      // Sort by order
      matchingItems.sort((a, b) => (a.fields['Order'] || 0) - (b.fields['Order'] || 0))
      
      console.log('Matching timeline items:', matchingItems)
      const items = matchingItems.map(transformTimelineItem)
      console.log('getTimelineItems transformed:', items)
      return items
    } catch (error) {
      console.error('Error in getTimelineItems:', error)
      return []
    }
  },

  async getCoordinators(weddingId) {
    const formula = `RECORD_ID({Wedding}) = '${weddingId}'`
    const data = await airtableRequest(`Coordinator Assignments?filterByFormula=${encodeURIComponent(formula)}`)
    
    // Fetch coordinator details
    const coordinators = await Promise.all(
      data.records.map(async (assignment) => {
        const coordinatorId = assignment.fields['Coordinator']?.[0]
        if (!coordinatorId) return null
        
        const coordData = await airtableRequest(`Users/${coordinatorId}`)
        return {
          id: assignment.id,
          is_lead: assignment.fields['Is Lead'] || false,
          coordinator: transformUser(coordData),
        }
      })
    )
    
    return coordinators.filter(Boolean)
  },
}

// =============================================================================
// TASKS API
// =============================================================================

export const airtableTasksAPI = {
  async getByWedding(weddingId) {
    return airtableWeddingsAPI.getTasks(weddingId)
  },

  async complete(id) {
    const data = await airtableRequest(`Tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          'Completed': true,
          'Completed At': new Date().toISOString().split('T')[0],
        },
      }),
    })
    
    return transformTask(data)
  },

  async uncomplete(id) {
    const data = await airtableRequest(`Tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          'Completed': false,
          'Completed At': null,
        },
      }),
    })
    
    return transformTask(data)
  },

  async create(task) {
    const data = await airtableRequest('Tasks', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'Title': task.title,
          'Description': task.description || '',
          'Wedding': [task.wedding_id],
          'Due Date': task.due_date,
          'Completed': false,
          'Assigned To': task.assigned_to || 'couple',
        },
      }),
    })
    
    return transformTask(data)
  },
}

// =============================================================================
// USERS API
// =============================================================================

export const airtableUsersAPI = {
  async getByEmail(email) {
    const formula = `{Email} = '${email}'`
    const data = await airtableRequest(`Users?filterByFormula=${encodeURIComponent(formula)}`)
    
    if (data.records.length === 0) return null
    return transformUser(data.records[0])
  },

  async getByRole(role) {
    const formula = `{Role} = '${role}'`
    const data = await airtableRequest(`Users?filterByFormula=${encodeURIComponent(formula)}`)
    return data.records.map(transformUser)
  },

  async getAll() {
    const data = await airtableRequest('Users')
    return data.records.map(transformUser)
  },
}

// =============================================================================
// CHANGE LOGS API
// =============================================================================

export const airtableChangeLogsAPI = {
  async create(changeLog) {
    const data = await airtableRequest('Change Logs', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          'Description': changeLog.description,
          'Wedding': [changeLog.wedding_id],
          'Changed By': [changeLog.changed_by_user_id],
          'Change Type': changeLog.change_type,
          'Entity Type': changeLog.entity_type,
          'Entity ID': changeLog.entity_id,
        },
      }),
    })
    
    return data
  },

  async getForCoordinator(coordinatorId) {
    // Get weddings for this coordinator
    const weddings = await airtableWeddingsAPI.getForCoordinator(coordinatorId)
    const weddingIds = weddings.map(w => w.id)
    
    if (weddingIds.length === 0) return []

    // Get change logs for those weddings
    const formula = `OR(${weddingIds.map(id => `{Wedding} = '${id}'`).join(',')})`
    const data = await airtableRequest(`Change Logs?filterByFormula=${encodeURIComponent(formula)}&sort%5B0%5D%5Bfield%5D=Created At&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=50`)
    
    return data.records
  },
}
