'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCourierActiveShipments,
  markShipmentInTransit,
  markShipmentOutForDelivery,
  deliverShipment,
  markShipmentDeliveryFailed,
} from '@/services/courier.service'
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

export default function ActiveShipmentsPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const user = useAuthStore((state) => state.user)
  const darkMode = theme === 'dark'

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [transitId, setTransitId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadShipments = useCallback(async () => {
    try {
      setError('')
      const data = await getCourierActiveShipments()
      setAssignments(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load active shipments.'))
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

  const handleInTransit = async (shipmentId: string) => {
    try {
      setTransitId(shipmentId)
      setError('')
      await markShipmentInTransit(shipmentId)
      await loadShipments()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update shipment status.'))
    } finally {
      setTransitId(null)
    }
  }

  const handleOutForDelivery = async (shipmentId: string) => {
    try {
      setTransitId(shipmentId)
      setError('')
      await markShipmentOutForDelivery(shipmentId)
      await loadShipments()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update shipment status.'))
    } finally {
      setTransitId(null)
    }
  }

  const handleDeliver = async (shipmentId: string) => {
    try {
      setTransitId(shipmentId)
      setError('')
      await deliverShipment(shipmentId)
      await loadShipments()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to complete delivery.'))
    } finally {
      setTransitId(null)
    }
  }

  const handleDeliveryFailed = async (shipmentId: string) => {
    try {
      setTransitId(shipmentId)
      setError('')
      await markShipmentDeliveryFailed(shipmentId)
      await loadShipments()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update delivery status.'))
    } finally {
      setTransitId(null)
    }
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

  const getStatusStyle = (status: string) => {
    if (status === 'PICKED_UP') {
      return darkMode
        ? 'bg-blue-500/10 text-blue-400'
        : 'bg-blue-50 text-blue-700'
    }

    if (status === 'IN_TRANSIT') {
      return darkMode
        ? 'bg-indigo-500/10 text-indigo-400'
        : 'bg-indigo-50 text-indigo-700'
    }

    if (status === 'OUT_FOR_DELIVERY') {
      return darkMode
        ? 'bg-amber-500/10 text-amber-400'
        : 'bg-amber-50 text-amber-700'
    }

    if (status === 'DELIVERY_FAILED') {
      return darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'
    }

    return darkMode
      ? 'bg-slate-700 text-slate-300'
      : 'bg-slate-100 text-slate-600'
  }

  const pickedUpCount = assignments.filter(
    (item) => item.shipment.status === 'PICKED_UP',
  ).length

  const inTransitCount = assignments.filter(
    (item) => item.shipment.status === 'IN_TRANSIT',
  ).length

  const outForDeliveryCount = assignments.filter(
    (item) => item.shipment.status === 'OUT_FOR_DELIVERY',
  ).length

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
            Active Shipments
          </h1>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Manage your accepted and ongoing deliveries.
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-xl border p-5 ${panelClass}`}>
          <p className={`text-sm ${mutedText}`}>Total Active</p>
          <p className={`mt-2 text-3xl font-bold ${headingText}`}>
            {assignments.length}
          </p>
        </div>

        <div className={`rounded-xl border p-5 ${panelClass}`}>
          <p className={`text-sm ${mutedText}`}>Picked Up</p>
          <p className="mt-2 text-3xl font-bold text-blue-500">
            {pickedUpCount}
          </p>
        </div>

        <div className={`rounded-xl border p-5 ${panelClass}`}>
          <p className={`text-sm ${mutedText}`}>In Transit</p>
          <p className="mt-2 text-3xl font-bold text-indigo-500">
            {inTransitCount}
          </p>
        </div>

        <div className={`rounded-xl border p-5 ${panelClass}`}>
          <p className={`text-sm ${mutedText}`}>Out for Delivery</p>
          <p className="mt-2 text-3xl font-bold text-amber-500">
            {outForDeliveryCount}
          </p>
        </div>
      </div>

      <div className={`overflow-hidden rounded-xl border ${panelClass}`}>
        <div className="border-b border-inherit p-5">
          <h2 className={`font-semibold ${headingText}`}>
            Your Active Deliveries
          </h2>
          <p className={`mt-1 text-sm ${mutedText}`}>
            Shipments currently assigned to you.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : assignments.length === 0 ? (
          <div className={`py-16 text-center ${mutedText}`}>
            <p className="font-medium">No active shipments found.</p>
            <p className="mt-1 text-sm">Accepted shipments will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
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
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-inherit">
                {assignments.map((assignment) => {
                  const shipment = assignment.shipment
                  const isPickedUp = shipment.status === 'PICKED_UP'
                  const isInTransit = shipment.status === 'IN_TRANSIT'
                  const isOutForDelivery =
                    shipment.status === 'OUT_FOR_DELIVERY'
                  const isProcessing = transitId === shipment.id

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
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(shipment.status)}`}
                        >
                          {shipment.status.replaceAll('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isPickedUp ? (
                          <button
                            onClick={() => handleInTransit(shipment.id)}
                            disabled={isProcessing}
                            className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isProcessing ? 'Updating...' : 'Mark In Transit'}
                          </button>
                        ) : isInTransit ? (
                          <button
                            onClick={() => handleOutForDelivery(shipment.id)}
                            disabled={isProcessing}
                            className="cursor-pointer rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isProcessing ? 'Updating...' : 'Out for Delivery'}
                          </button>
                        ) : isOutForDelivery ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleDeliveryFailed(shipment.id)}
                              disabled={isProcessing}
                              className="cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing ? 'Updating...' : 'Delivery Failed'}
                            </button>

                            <button
                              onClick={() => handleDeliver(shipment.id)}
                              disabled={isProcessing}
                              className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isProcessing ? 'Updating...' : 'Mark Delivered'}
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs ${mutedText}`}>
                            No action available
                          </span>
                        )}
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
