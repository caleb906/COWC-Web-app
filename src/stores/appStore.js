import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  login: (user) => set({ user, session: { user }, loading: false }),
  signOut: () => set({ user: null, session: null }),
}))

export const useAppStore = create((set) => ({
  weddings: [],
  selectedWedding: null,
  changeLogs: [],
  notifications: [],
  unreadCount: 0,
  
  setWeddings: (weddings) => set({ weddings }),
  setSelectedWedding: (wedding) => set({ selectedWedding: wedding }),
  setChangeLogs: (logs) => set({ changeLogs: logs }),
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
  }),
  
  addWedding: (wedding) => set((state) => ({
    weddings: [...state.weddings, wedding],
  })),
  
  updateWedding: (id, updates) => set((state) => ({
    weddings: state.weddings.map(w => w.id === id ? { ...w, ...updates } : w),
    selectedWedding: state.selectedWedding?.id === id 
      ? { ...state.selectedWedding, ...updates }
      : state.selectedWedding,
  })),
  
  addChangeLog: (log) => set((state) => ({
    changeLogs: [log, ...state.changeLogs],
  })),
  
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
}))
