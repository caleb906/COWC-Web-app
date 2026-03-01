// Unified API Layer - Now uses Supabase as the primary data source
import {
  weddingsAPI as supabaseWeddingsAPI,
  tasksAPI as supabaseTasksAPI,
  vendorsAPI as supabaseVendorsAPI,
  timelineAPI as supabaseTimelineAPI,
  usersAPI as supabaseUsersAPI,
  changeLogsAPI as supabaseChangeLogsAPI,
  coordinatorAssignmentsAPI as supabaseCoordinatorAssignmentsAPI,
  notificationsAPI as supabaseNotificationsAPI,
  logChangeAndNotify as supabaseLogChangeAndNotify,
  notifyTaskAssigned as supabaseNotifyTaskAssigned,
} from './supabaseAPI'

// Export all APIs from Supabase
export const weddingsAPI = supabaseWeddingsAPI
export const tasksAPI = supabaseTasksAPI
export const vendorsAPI = supabaseVendorsAPI
export const timelineAPI = supabaseTimelineAPI
export const usersAPI = supabaseUsersAPI
export const changeLogsAPI = supabaseChangeLogsAPI
export const coordinatorAssignmentsAPI = supabaseCoordinatorAssignmentsAPI
export const notificationsAPI = supabaseNotificationsAPI
export const logChangeAndNotify = supabaseLogChangeAndNotify
export const notifyTaskAssigned = supabaseNotifyTaskAssigned

console.log('🔌 Data Source: Supabase')
