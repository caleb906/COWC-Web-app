// Mock database - will replace with Supabase later
// This provides a complete data layer for testing all features

export const mockDatabase = {
  users: [
    // Admin
    {
      id: '0',
      email: 'amanda@cowc.com',
      role: 'admin',
      full_name: 'Amanda Smith',
      phone: '(541) 555-0100',
      created_at: '2025-01-01T00:00:00Z',
    },
    // Coordinators
    {
      id: '1',
      email: 'sarah@cowc.com',
      role: 'coordinator',
      full_name: 'Sarah Johnson',
      phone: '(541) 555-0101',
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'mike@cowc.com',
      role: 'coordinator',
      full_name: 'Mike Davis',
      phone: '(541) 555-0102',
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: '3',
      email: 'emma@cowc.com',
      role: 'coordinator',
      full_name: 'Emma Wilson',
      phone: '(541) 555-0103',
      created_at: '2025-01-01T00:00:00Z',
    },
    // Couples
    {
      id: '10',
      email: 'jessica.mark@email.com',
      role: 'couple',
      full_name: 'Jessica Miller',
      phone: '(503) 555-0201',
      created_at: '2025-06-01T00:00:00Z',
    },
    {
      id: '11',
      email: 'rachel.tom@email.com',
      role: 'couple',
      full_name: 'Rachel Thompson',
      phone: '(503) 555-0202',
      created_at: '2025-08-01T00:00:00Z',
    },
    {
      id: '12',
      email: 'sophia.chris@email.com',
      role: 'couple',
      full_name: 'Sophia Anderson',
      phone: '(503) 555-0203',
      created_at: '2025-09-01T00:00:00Z',
    },
    {
      id: '13',
      email: 'emily.david@email.com',
      role: 'couple',
      full_name: 'Emily Roberts',
      phone: '(503) 555-0204',
      created_at: '2025-07-01T00:00:00Z',
    },
    {
      id: '14',
      email: 'olivia.james@email.com',
      role: 'couple',
      full_name: 'Olivia Martinez',
      phone: '(503) 555-0205',
      created_at: '2025-10-01T00:00:00Z',
    },
  ],

  weddings: [
    {
      id: 'w1',
      couple_name: 'Jessica & Mark',
      couple_user_id: '10',
      wedding_date: '2026-06-15',
      ceremony_time: '16:00',
      venue_name: 'Sunriver Resort',
      venue_address: '17600 Center Drive, Sunriver, OR 97707',
      guest_count: 150,
      budget: 45000,
      status: 'active',
      notes: 'Outdoor ceremony, garden reception. Couple loves romantic, soft colors.',
      created_at: '2025-06-01T00:00:00Z',
      theme: {
        primary: '#d4a574',
        secondary: '#8b9a8f',
        accent: '#f5f1eb',
        vibe: 'Romantic Garden',
        inspiration_photos: [
          'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
          'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800',
          'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
          'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
        ],
      },
    },
    {
      id: 'w2',
      couple_name: 'Rachel & Tom',
      couple_user_id: '11',
      wedding_date: '2026-08-22',
      ceremony_time: '17:30',
      venue_name: 'Tumalo Falls Lodge',
      venue_address: '64619 Tyler Rd, Bend, OR 97703',
      guest_count: 100,
      budget: 35000,
      status: 'active',
      notes: 'Modern bohemian style. Wants terracotta and natural elements.',
      created_at: '2025-08-01T00:00:00Z',
      theme: {
        primary: '#b4917f',
        secondary: '#4a5759',
        accent: '#f9f6f2',
        vibe: 'Modern Bohemian',
        inspiration_photos: [
          'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800',
          'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
          'https://images.unsplash.com/photo-1513691925592-c0498a19b736?w=800',
        ],
      },
    },
    {
      id: 'w3',
      couple_name: 'Sophia & Chris',
      couple_user_id: '12',
      wedding_date: '2026-09-10',
      ceremony_time: '15:00',
      venue_name: 'Mt. Bachelor Village',
      venue_address: '19717 Mt Bachelor Dr, Bend, OR 97702',
      guest_count: 80,
      budget: 28000,
      status: 'planning',
      notes: 'Mountain wedding with elegant touches. Sage green and ivory.',
      created_at: '2025-09-01T00:00:00Z',
      theme: {
        primary: '#8b9a8f',
        secondary: '#5d6d69',
        accent: '#fffef9',
        vibe: 'Mountain Elegant',
        inspiration_photos: [
          'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
          'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=800',
        ],
      },
    },
    {
      id: 'w4',
      couple_name: 'Emily & David',
      couple_user_id: '13',
      wedding_date: '2026-07-18',
      ceremony_time: '18:00',
      venue_name: 'Brasada Ranch',
      venue_address: '16986 SW Brasada Ranch Rd, Powell Butte, OR 97753',
      guest_count: 120,
      budget: 50000,
      status: 'active',
      notes: 'Luxury desert wedding. Warm tones and modern design.',
      created_at: '2025-07-01T00:00:00Z',
      theme: {
        primary: '#c9a882',
        secondary: '#7d5a3c',
        accent: '#faf7f2',
        vibe: 'Desert Luxe',
        inspiration_photos: [
          'https://images.unsplash.com/photo-1522673607110-e4831fdb1c6b?w=800',
          'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800',
        ],
      },
    },
    {
      id: 'w5',
      couple_name: 'Olivia & James',
      couple_user_id: '14',
      wedding_date: '2026-10-05',
      ceremony_time: '16:30',
      venue_name: 'Black Butte Ranch',
      venue_address: '13892 Hawksbeard, Black Butte Ranch, OR 97759',
      guest_count: 90,
      budget: 38000,
      status: 'planning',
      notes: 'Fall wedding with burgundy and gold accents.',
      created_at: '2025-10-01T00:00:00Z',
      theme: {
        primary: '#8b3a3a',
        secondary: '#d4a574',
        accent: '#f5f1e8',
        vibe: 'Autumn Romance',
        inspiration_photos: [
          'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
        ],
      },
    },
  ],

  coordinator_assignments: [
    { id: 'ca1', wedding_id: 'w1', coordinator_user_id: '1', is_lead: true, assigned_at: '2025-06-01T00:00:00Z' },
    { id: 'ca2', wedding_id: 'w1', coordinator_user_id: '2', is_lead: false, assigned_at: '2025-06-01T00:00:00Z' },
    { id: 'ca3', wedding_id: 'w2', coordinator_user_id: '2', is_lead: true, assigned_at: '2025-08-01T00:00:00Z' },
    { id: 'ca4', wedding_id: 'w4', coordinator_user_id: '1', is_lead: true, assigned_at: '2025-07-01T00:00:00Z' },
    { id: 'ca5', wedding_id: 'w4', coordinator_user_id: '3', is_lead: false, assigned_at: '2025-07-01T00:00:00Z' },
  ],

  tasks: [
    // Jessica & Mark's tasks
    { id: 't1', wedding_id: 'w1', title: 'Book photographer', description: 'Finalize contract with photographer', due_date: '2026-05-01', completed: true, completed_at: '2026-04-15T00:00:00Z', assigned_to: 'couple', created_at: '2025-06-01T00:00:00Z' },
    { id: 't2', wedding_id: 'w1', title: 'Choose wedding cake flavor', description: 'Schedule tasting at bakery', due_date: '2026-05-15', completed: true, completed_at: '2026-05-10T00:00:00Z', assigned_to: 'couple', created_at: '2025-06-01T00:00:00Z' },
    { id: 't3', wedding_id: 'w1', title: 'Send invitations', description: 'Mail save-the-dates and formal invitations', due_date: '2026-04-15', completed: false, assigned_to: 'couple', created_at: '2025-06-01T00:00:00Z' },
    { id: 't4', wedding_id: 'w1', title: 'Finalize seating chart', description: 'Complete seating arrangements', due_date: '2026-06-01', completed: false, assigned_to: 'couple', created_at: '2025-06-01T00:00:00Z' },
    { id: 't5', wedding_id: 'w1', title: 'Order flowers', description: 'Confirm floral arrangements', due_date: '2026-05-20', completed: false, assigned_to: 'coordinator', created_at: '2025-06-01T00:00:00Z' },
    
    // Rachel & Tom's tasks
    { id: 't6', wedding_id: 'w2', title: 'Book band', description: 'Confirm live music for reception', due_date: '2026-07-15', completed: true, completed_at: '2026-07-10T00:00:00Z', assigned_to: 'couple', created_at: '2025-08-01T00:00:00Z' },
    { id: 't7', wedding_id: 'w2', title: 'Choose menu', description: 'Final menu selection with caterer', due_date: '2026-07-30', completed: false, assigned_to: 'couple', created_at: '2025-08-01T00:00:00Z' },
    { id: 't8', wedding_id: 'w2', title: 'Book hair & makeup', description: 'Schedule trial and confirm booking', due_date: '2026-07-20', completed: false, assigned_to: 'couple', created_at: '2025-08-01T00:00:00Z' },
    
    // Emily & David's tasks
    { id: 't9', wedding_id: 'w4', title: 'Order wedding dress alterations', description: 'Final fitting scheduled', due_date: '2026-06-15', completed: false, assigned_to: 'couple', created_at: '2025-07-01T00:00:00Z' },
    { id: 't10', wedding_id: 'w4', title: 'Book rehearsal dinner venue', description: 'Reserve space for rehearsal dinner', due_date: '2026-06-01', completed: true, completed_at: '2026-05-28T00:00:00Z', assigned_to: 'couple', created_at: '2025-07-01T00:00:00Z' },
  ],

  vendors: [
    { id: 'v1', wedding_id: 'w1', category: 'photographer', name: 'Cascade Photography', contact: 'info@cascadephoto.com', phone: '(541) 555-1001', website: 'cascadephoto.com', notes: 'Booked for full day coverage', created_at: '2025-06-01T00:00:00Z' },
    { id: 'v2', wedding_id: 'w1', category: 'florist', name: 'Bend Blooms', contact: 'hello@bendblooms.com', phone: '(541) 555-1002', website: 'bendblooms.com', notes: 'Romantic garden style', created_at: '2025-06-01T00:00:00Z' },
    { id: 'v3', wedding_id: 'w1', category: 'caterer', name: 'Sunriver Catering', contact: 'events@sunrivercatering.com', phone: '(541) 555-1003', website: 'sunrivercatering.com', notes: 'Menu finalized', created_at: '2025-06-01T00:00:00Z' },
    { id: 'v4', wedding_id: 'w2', category: 'band', name: 'Central Oregon Band', contact: 'bookings@coband.com', phone: '(541) 555-1004', website: 'coband.com', notes: 'Booked for 4 hours', created_at: '2025-08-01T00:00:00Z' },
    { id: 'v5', wedding_id: 'w2', category: 'videographer', name: 'High Desert Films', contact: 'info@hdfilms.com', phone: '(541) 555-1005', website: 'hdfilms.com', notes: 'Full day package', created_at: '2025-08-01T00:00:00Z' },
  ],

  timeline_items: [
    { id: 'tl1', wedding_id: 'w1', time: '14:00', title: 'Bride & Bridesmaids Hair/Makeup', description: 'At bridal suite', order: 1, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl2', wedding_id: 'w1', time: '15:30', title: 'First Look Photos', description: 'Garden location', order: 2, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl3', wedding_id: 'w1', time: '16:00', title: 'Ceremony Begins', description: 'Outdoor lawn area', order: 3, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl4', wedding_id: 'w1', time: '16:30', title: 'Cocktail Hour', description: 'Terrace with appetizers', order: 4, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl5', wedding_id: 'w1', time: '17:30', title: 'Reception Begins', description: 'Grand entrance', order: 5, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl6', wedding_id: 'w1', time: '18:00', title: 'Dinner Service', description: 'Plated dinner', order: 6, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl7', wedding_id: 'w1', time: '19:00', title: 'First Dance & Toasts', description: 'Best man and maid of honor speeches', order: 7, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl8', wedding_id: 'w1', time: '21:00', title: 'Cake Cutting', description: 'Three-tier vanilla raspberry', order: 8, created_at: '2025-06-01T00:00:00Z' },
    { id: 'tl9', wedding_id: 'w1', time: '22:00', title: 'Last Dance & Grand Exit', description: 'Sparkler send-off', order: 9, created_at: '2025-06-01T00:00:00Z' },
  ],

  change_logs: [
    { id: 'cl1', wedding_id: 'w1', changed_by_user_id: '10', change_type: 'task_completed', entity_type: 'task', entity_id: 't1', description: 'Completed task: Book photographer', created_at: '2026-04-15T10:30:00Z' },
    { id: 'cl2', wedding_id: 'w1', changed_by_user_id: '10', change_type: 'task_completed', entity_type: 'task', entity_id: 't2', description: 'Completed task: Choose wedding cake flavor', created_at: '2026-05-10T14:20:00Z' },
    { id: 'cl3', wedding_id: 'w2', changed_by_user_id: '11', change_type: 'task_completed', entity_type: 'task', entity_id: 't6', description: 'Completed task: Book band', created_at: '2026-07-10T09:15:00Z' },
    { id: 'cl4', wedding_id: 'w4', changed_by_user_id: '1', change_type: 'vendor_added', entity_type: 'vendor', entity_id: 'v5', description: 'Added vendor: High Desert Films (videographer)', created_at: '2026-05-20T11:00:00Z' },
  ],

  notifications: [
    { id: 'n1', user_id: '1', wedding_id: 'w1', change_log_id: 'cl1', title: 'Task Completed', message: 'Jessica completed: Book photographer', read: false, created_at: '2026-04-15T10:30:00Z' },
    { id: 'n2', user_id: '1', wedding_id: 'w1', change_log_id: 'cl2', title: 'Task Completed', message: 'Jessica completed: Choose wedding cake flavor', read: false, created_at: '2026-05-10T14:20:00Z' },
    { id: 'n3', user_id: '2', wedding_id: 'w2', change_log_id: 'cl3', title: 'Task Completed', message: 'Rachel completed: Book band', read: true, created_at: '2026-07-10T09:15:00Z' },
  ],
};

// Helper functions to interact with mock database
export const mockAPI = {
  // Users
  getUser: (id) => mockDatabase.users.find(u => u.id === id),
  getAllUsers: () => mockDatabase.users,
  getUsersByRole: (role) => mockDatabase.users.filter(u => u.role === role),

  // Weddings
  getAllWeddings: () => mockDatabase.weddings,
  getWedding: (id) => mockDatabase.weddings.find(w => w.id === id),
  getWeddingForCouple: (userId) => mockDatabase.weddings.find(w => w.couple_user_id === userId),
  getWeddingsForCoordinator: (userId) => {
    const assignments = mockDatabase.coordinator_assignments.filter(ca => ca.coordinator_user_id === userId);
    return mockDatabase.weddings.filter(w => assignments.some(a => a.wedding_id === w.id));
  },
  
  createWedding: (wedding) => {
    const newWedding = { ...wedding, id: `w${Date.now()}`, created_at: new Date().toISOString() };
    mockDatabase.weddings.push(newWedding);
    return newWedding;
  },

  updateWedding: (id, updates) => {
    const index = mockDatabase.weddings.findIndex(w => w.id === id);
    if (index !== -1) {
      mockDatabase.weddings[index] = { ...mockDatabase.weddings[index], ...updates };
      return mockDatabase.weddings[index];
    }
    return null;
  },

  // Tasks
  getTasksForWedding: (weddingId) => mockDatabase.tasks.filter(t => t.wedding_id === weddingId),
  completeTask: (id) => {
    const task = mockDatabase.tasks.find(t => t.id === id);
    if (task) {
      task.completed = true;
      task.completed_at = new Date().toISOString();
    }
    return task;
  },
  uncompleteTask: (id) => {
    const task = mockDatabase.tasks.find(t => t.id === id);
    if (task) {
      task.completed = false;
      task.completed_at = null;
    }
    return task;
  },

  // Vendors
  getVendorsForWedding: (weddingId) => mockDatabase.vendors.filter(v => v.wedding_id === weddingId),

  // Timeline
  getTimelineForWedding: (weddingId) => mockDatabase.timeline_items.filter(t => t.wedding_id === weddingId).sort((a, b) => a.order - b.order),

  // Coordinator Assignments
  getCoordinatorsForWedding: (weddingId) => {
    const assignments = mockDatabase.coordinator_assignments.filter(ca => ca.wedding_id === weddingId);
    return assignments.map(a => ({
      ...a,
      coordinator: mockDatabase.users.find(u => u.id === a.coordinator_user_id),
    }));
  },

  assignCoordinator: (weddingId, coordinatorId, isLead = false) => {
    const assignment = {
      id: `ca${Date.now()}`,
      wedding_id: weddingId,
      coordinator_user_id: coordinatorId,
      is_lead: isLead,
      assigned_at: new Date().toISOString(),
    };
    mockDatabase.coordinator_assignments.push(assignment);
    return assignment;
  },

  // Change Logs
  getChangeLogsForWedding: (weddingId) => mockDatabase.change_logs.filter(cl => cl.wedding_id === weddingId),
  getChangeLogsForCoordinator: (coordinatorId) => {
    const weddingIds = mockAPI.getWeddingsForCoordinator(coordinatorId).map(w => w.id);
    return mockDatabase.change_logs.filter(cl => weddingIds.includes(cl.wedding_id));
  },

  addChangeLog: (changeLog) => {
    const newLog = { ...changeLog, id: `cl${Date.now()}`, created_at: new Date().toISOString() };
    mockDatabase.change_logs.push(newLog);
    return newLog;
  },

  // Notifications
  getNotificationsForUser: (userId) => mockDatabase.notifications.filter(n => n.user_id === userId),
  markNotificationRead: (id) => {
    const notification = mockDatabase.notifications.find(n => n.id === id);
    if (notification) notification.read = true;
    return notification;
  },
};
