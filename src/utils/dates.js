import { differenceInDays, format, parseISO, isPast, isToday } from 'date-fns'

export const formatDate = (dateString, formatStr = 'MMMM d, yyyy') => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, formatStr)
  } catch (error) {
    return dateString
  }
}

export const formatTime = (timeString) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const daysUntil = (dateString) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = typeof dateString === 'string' ? parseISO(dateString) : dateString
    targetDate.setHours(0, 0, 0, 0)
    return differenceInDays(targetDate, today)
  } catch (error) {
    return 0
  }
}

export const isPastDue = (dateString) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    return isPast(date) && !isToday(date)
  } catch (error) {
    return false
  }
}

export const timeAgo = (dateString) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    }
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit)
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`
      }
    }
    
    return 'just now'
  } catch (error) {
    return dateString
  }
}
