'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCourierCompletedShipments } from '@/services/courier.service'
import { restoreSession, useAuthStore } from '@/store/auth.store'
import { useTheme } from '@/components/providers/theme-provider'

type Address = {
  addressLine?: string
  street?: string
  city?: string
  district?: string
  area?: string
}

type Shipment = {
  id: string
  trackingNumber: string
  status: string
  createdAt: string
  updatedAt?: string
  pickupAddress?: Address
  deliveryAddress?: Address
  customer?: {
    name?: string
    phone?: string
  }
}

type Assignment = {
  id: string
  status: string
  assignedAt: string
  shipment: Shipment
}

type ApiError = {
  response?: {
    data?: {
      message?: string
    }
  }
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const apiError = err as ApiError

    if (typeof apiError.response?.data?.message === 'string') {
      return apiError.response.data.message
    }
  }

  return fallback
}

export default function CompletedShipmentsPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const user = useAuthStore((state) => state.user)
  const darkMode = theme === 'dark'

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadShipments = useCallback(async () => {
    try {
      setError('')
      const data = await getCourierCompletedShipments()
      setAssignments(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load completed deliveries.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      await restoreSession()

      const currentUser = useAuthStore.getState().user

      if (!currentUser) {
        router.replace('/login')
        return
      }

      if (currentUser.role !== 'COURIER') {
        router.replace('/')
        return
      }

      await loadShipments()
    }

    initialize()
  }, [router, loadShipments])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadShipments()
  }

  const formatAddress = (address?: Address) => {
    if (!address) return '—'

    return (
      [
        address.addressLine || address.street,
        address.area,
        address.city,
        address.district,
      ]
        .filter(Boolean)
        .join(', ') || '—'
    )
  }

  const formatDate = (date?: string) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const panelClass = darkMode
    ? 'border-slate-800 bg-slate-900'
    : 'border-slate-200 bg-white'

  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-500'
  const headingText = darkMode ? 'text-white' : 'text-slate-900'

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className={`text-2xl font-bold ${headingText}`}>
            Completed Deliveries
          </h1>
          <p className={`mt-1 text-sm ${mutedText}`}>
            View all shipments you have successfully completed.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className={`rounded-xl border p-5 ${panelClass}`}>
        <p className={`text-sm ${mutedText}`}>Total Completed Deliveries</p>
        <p className="mt-2 text-3xl font-bold text-emerald-500">
          {assignments.length}
        </p>
      </div>

      <div className={`overflow-hidden rounded-xl border ${panelClass}`}>
        <div className="border-b border-inherit p-5">
          <h2 className={`font-semibold ${headingText}`}>Delivery History</h2>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Your successfully completed shipment assignments.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : assignments.length === 0 ? (
          <div className={`py-16 text-center ${mutedText}`}>
            <p className="font-medium">No completed deliveries found.</p>
            <p className="mt-1 text-sm">
              Successfully delivered shipments will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead
                className={
                  darkMode
                    ? 'bg-slate-800/70 text-slate-400'
                    : 'bg-slate-50 text-slate-500'
                }
              >
                <tr>
                  <th className="px-5 py-4 font-semibold">Tracking Number</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Pickup Address</th>
                  <th className="px-5 py-4 font-semibold">Delivery Address</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Completed Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-inherit">
                {assignments.map((assignment) => {
                  const shipment = assignment.shipment

                  return (
                    <tr
                      key={assignment.id}
                      className={
                        darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }
                    >
                      <td className={`px-5 py-4 font-semibold ${headingText}`}>
                        {shipment.trackingNumber}
                      </td>

                      <td className="px-5 py-4">
                        <p className={headingText}>
                          {shipment.customer?.name || '—'}
                        </p>
                        <p className={`mt-1 text-xs ${mutedText}`}>
                          {shipment.customer?.phone || '—'}
                        </p>
                      </td>

                      <td className={`max-w-[180px] px-5 py-4 ${mutedText}`}>
                        {formatAddress(shipment.pickupAddress)}
                      </td>

                      <td className={`max-w-[180px] px-5 py-4 ${mutedText}`}>
                        {formatAddress(shipment.deliveryAddress)}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {shipment.status.replaceAll('_', ' ')}
                        </span>
                      </td>

                      <td className={`px-5 py-4 ${mutedText}`}>
                        {formatDate(shipment.updatedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
