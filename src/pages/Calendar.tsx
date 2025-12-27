/**
 * Calendar Page
 * Shows all scheduled jobs from both individual clients and property management units
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, User, Building2, Clock } from 'lucide-react'
import { useClientsStore } from '@store/useClientsStore'
import { useCompaniesStore } from '@store/useCompaniesStore'
import { useQuotesStore } from '@store/useQuotesStore'

type ScheduledJob = {
  id: string
  type: 'client' | 'property'
  name: string           // Client name or Property address + unit
  address: string
  date: string          // YYYY-MM-DD
  time?: string
  companyName?: string  // For properties, the parent company name
  quoteTotal?: number
  linkTo: string        // Where to navigate
}

export default function Calendar() {
  const { clients, init: initClients } = useClientsStore()
  const { companies, properties, init: initCompanies } = useCompaniesStore()
  const { quotes, init: initQuotes } = useQuotesStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  useEffect(() => {
    initClients()
    initCompanies()
    initQuotes()
  }, [])

  // Combine scheduled jobs from clients, properties, and quotes
  const scheduledJobs = useMemo(() => {
    const jobs: ScheduledJob[] = []

    // Add scheduled clients
    clients.forEach((client) => {
      if (client.scheduledDate && client.workflowStatus === 'scheduled') {
        jobs.push({
          id: client.id,
          type: 'client',
          name: client.name,
          address: client.address || '',
          date: client.scheduledDate,
          time: client.scheduledTime,
          linkTo: `/clients/${client.id}`,
        })
      }
    })

    // Add scheduled properties
    properties.forEach((prop) => {
      if (prop.scheduledDate && prop.workflowStatus === 'scheduled') {
        const company = companies.find((c) => c.id === prop.companyId)
        const displayName = prop.unit ? `${prop.address}, ${prop.unit}` : prop.address

        jobs.push({
          id: prop.id,
          type: 'property',
          name: displayName,
          address: prop.address,
          date: prop.scheduledDate,
          time: prop.scheduledTime,
          companyName: company?.name,
          linkTo: `/companies/${prop.companyId}`,
        })
      }
    })

    // Add scheduled quotes (scheduledDate or appointmentDate)
    quotes.forEach((quote) => {
      const schedDate = quote.scheduledDate || quote.appointmentDate
      const schedTime = quote.scheduledTime || quote.appointmentTime
      const isScheduled = quote.workflowStatus === 'scheduled' || quote.status === 'scheduled' || quote.status === 'approved'
      
      if (schedDate && isScheduled) {
        const client = clients.find((c) => c.id === quote.clientId)
        // Don't duplicate if client already has same scheduled date
        if (client && client.scheduledDate === schedDate) return

        jobs.push({
          id: quote.id,
          type: 'client',
          name: quote.clientName || client?.name || 'Unknown',
          address: quote.clientAddress || client?.address || '',
          date: schedDate,
          time: schedTime || undefined,
          quoteTotal: quote.total,
          linkTo: `/quotes/${quote.id}`,
        })
      }
    })

    return jobs.sort((a, b) => a.date.localeCompare(b.date))
  }, [clients, properties, companies, quotes])

  // Get days in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    return { daysInMonth, startingDay, year, month }
  }

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate)

  // Get jobs for a specific date
  const getJobsForDate = (dateStr: string) => {
    return scheduledJobs.filter((job) => job.date === dateStr)
  }

  // Format date as YYYY-MM-DD
  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const today = new Date()
  const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  // Upcoming jobs (next 7 days)
  const upcomingJobs = useMemo(() => {
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const nowStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStr = formatDateKey(weekFromNow.getFullYear(), weekFromNow.getMonth(), weekFromNow.getDate())

    return scheduledJobs.filter((job) => job.date >= nowStr && job.date <= weekStr)
  }, [scheduledJobs])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8d487]">Calendar</h1>
          <p className="text-sm text-gray-400">View all scheduled jobs</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="btn-secondary px-3 py-1.5 text-sm">
            Today
          </button>
          <button onClick={prevMonth} className="btn-secondary p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-lg font-medium text-white min-w-[180px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="btn-secondary p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Calendar Grid */}
        <div className="card p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-black/20 rounded" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = formatDateKey(year, month, day)
              const dayJobs = getJobsForDate(dateStr)
              const isToday = dateStr === todayStr

              return (
                <div
                  key={day}
                  className={`calendar-day h-24 rounded border p-1 overflow-hidden ${
                    isToday
                      ? 'border-[#e8d487] bg-[#e8d487]/10'
                      : 'border-gray-800 bg-black/30'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-[#e8d487]' : 'text-gray-400'}`}>
                    {day}
                  </div>

                  <div className="space-y-0.5 overflow-y-auto max-h-16">
                    {dayJobs.slice(0, 3).map((job) => (
                      <Link
                        key={job.id}
                        to={job.linkTo}
                        className={`block text-[10px] px-1 py-0.5 rounded truncate ${
                          job.type === 'property'
                            ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                            : 'bg-[#e8d487]/20 text-[#e8d487] hover:bg-[#e8d487]/30'
                        }`}
                      >
                        {job.time && <span className="font-medium">{job.time} </span>}
                        {job.name}
                      </Link>
                    ))}
                    {dayJobs.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1">
                        +{dayJobs.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar - Upcoming Jobs */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-[#e8d487] mb-3 border-l-2 border-[#e8d487] pl-2">
              Upcoming (Next 7 Days)
            </h2>

            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-gray-400">No scheduled jobs</p>
            ) : (
              <div className="space-y-3">
                {upcomingJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={job.linkTo}
                    className="block p-3 bg-black/40 rounded-lg border border-gray-800 hover:border-[#e8d487]/50 transition"
                  >
                    <div className="flex items-start gap-2">
                      {job.type === 'property' ? (
                        <Building2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      ) : (
                        <User className="w-4 h-4 text-[#e8d487] mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {job.name}
                        </div>
                        {job.companyName && (
                          <div className="text-xs text-blue-400 truncate">
                            {job.companyName}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(job.date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {job.time && ` at ${job.time}`}
                        </div>
                        {job.address && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{job.address}</span>
                          </div>
                        )}
                        {job.quoteTotal !== undefined && (
                          <div className="mt-1 text-xs text-green-400">
                            ${job.quoteTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">Legend</h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#e8d487]/30"></div>
                <span className="text-gray-300">Individual Client</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500/30"></div>
                <span className="text-gray-300">Property (Company)</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">This Month</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-black/40 rounded">
                <div className="text-xl font-bold text-[#e8d487]">
                  {scheduledJobs.filter((j) => j.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}
                </div>
                <div className="text-xs text-gray-400">Jobs</div>
              </div>
              <div className="text-center p-2 bg-black/40 rounded">
                <div className="text-xl font-bold text-green-400">
                  ${scheduledJobs
                    .filter((j) => j.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && j.quoteTotal)
                    .reduce((sum, j) => sum + (j.quoteTotal || 0), 0)
                    .toFixed(0)}
                </div>
                <div className="text-xs text-gray-400">Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
