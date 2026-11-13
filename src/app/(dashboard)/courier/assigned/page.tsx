'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  acceptShipment,
  pickupShipment,
  getCourierAssignedShipments,
} from '@/services/courier.service'
import { restoreSession, useAuthStore } from '@/store/auth.store'

type Address = {
  addressLine?: string
  addressLine1?: string
  street?: string
  area?: string
  city?: string
  district?: string
  division?: string
}

type Shipment = {
  id: string
  trackingNumber?: string
  status: string
  createdAt?: string
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
  assignedAt?: string
  shipment: Shipment
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ACCEPTED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  ASSIGNED:
    'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  COURIER_ACCEPTED:
    'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  COMPLETED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
}

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const formatAddress = (address?: Address) => {
  if (!address) return 'Address unavailable'

  const parts = [
    address.area,
    address.city,
    address.district,
    address.division,
  ].filter(Boolean)

  return parts.length
    ? parts.join(', ')
    : (address.addressLine1 ??
        address.addressLine ??
        address.street ??
        'Address unavailable')
}

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date unavailable'

export default function AssignedShipmentsPage() {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const router = useRouter()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [pickingUpId, setPickingUpId] = useState<string | null>(null)

  const loadAssignments = useCallback(async () => {
    try {
      const data = await getCourierAssignedShipments()
      setAssignments(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      const error = err as {
        response?: {
          status?: number
          data?: { message?: string }
        }
      }

      if (error.response?.status === 401) {
        useAuthStore.getState().clearAuth()
        router.replace('/login')
        return
      }

      setError(
        error.response?.data?.message ??
          'Unable to load assigned shipments. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (user && user.role !== 'COURIER') {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/customer')
      return
    }

    let cancelled = false

    const initialize = async () => {
      let token = accessToken

      if (!token) {
        await restoreSession()
        token = useAuthStore.getState().accessToken
      }

      if (cancelled) return

      if (!token) {
        router.replace('/login')
        return
      }

      if (useAuthStore.getState().user?.role !== 'COURIER') {
        const role = useAuthStore.getState().user?.role
        router.replace(role === 'ADMIN' ? '/admin' : '/customer')
        return
      }

      await loadAssignments()
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [user, accessToken, router, loadAssignments])

  const handleRefresh = async () => {
    setLoading(true)
    setError('')
    await loadAssignments()
  }

  const handleAccept = async (shipmentId: string) => {
    setAcceptingId(shipmentId)
    setError('')

    try {
      await acceptShipment(shipmentId)
      await loadAssignments()
    } catch (err) {
      const error = err as {
        response?: {
          data?: { message?: string }
        }
      }

      setError(
        error.response?.data?.message ??
          'Unable to accept this shipment. Please try again.',
      )
    } finally {
      setAcceptingId(null)
    }
  }

  const handlePickup = async (shipmentId: string) => {
    setPickingUpId(shipmentId)
    setError('')

    try {
      await pickupShipment(shipmentId)
      await loadAssignments()
    } catch (err) {
      const error = err as {
        response?: {
          data?: { message?: string }
        }
      }

      setError(
        error.response?.data?.message ??
          'Unable to pick up this shipment. Please try again.',
      )
    } finally {
      setPickingUpId(null)
    }
  }

  if (!user || user.role !== 'COURIER') {
    return null
  }

  const pendingCount = assignments.filter(
    (item) => item.status === 'PENDING',
  ).length

  const acceptedCount = assignments.filter(
    (item) => item.status === 'ACCEPTED',
  ).length

  return (
    <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-10">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            DELIVERY MANAGEMENT
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            Assigned shipments
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            Review your assigned shipments and accept new deliveries.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="cursor-pointer self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
        >
          ↻ Refresh
        </button>
      </section>

      <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Assigned',
            value: assignments.length,
            icon: '◫',
            color:
              'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
          },
          {
            label: 'Awaiting Acceptance',
            value: pendingCount,
            icon: '◷',
            color:
              'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
          },
          {
            label: 'Accepted',
            value: acceptedCount,
            icon: '✓',
            color:
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-semibold ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
              {loading ? '…' : stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      {error && (
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 sm:flex-row sm:items-center">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="cursor-pointer self-start font-semibold underline sm:self-auto"
          >
            Try again
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Your assigned deliveries
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Shipments assigned to your courier account
            </p>
          </div>
          <span className="self-start rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 sm:self-auto">
            {loading ? 'Loading…' : `${assignments.length} shipments`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
                <th className="px-6 py-4">Shipment</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Loading assigned shipments…
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">
                      ◫
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      No assigned shipments
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      New deliveries will appear here when assigned to you.
                    </p>
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const shipment = assignment.shipment
                  const isPending = assignment.status === 'PENDING'
                  const isAccepted =
                    assignment.status === 'ACCEPTED' &&
                    shipment.status === 'COURIER_ACCEPTED'

                  return (
                    <tr
                      key={assignment.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {shipment.trackingNumber ?? shipment.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          ID: {shipment.id.slice(0, 8)}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {shipment.customer?.name ?? 'Customer unavailable'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {shipment.customer?.phone ?? 'Phone unavailable'}
                        </p>
                      </td>

                      <td className="max-w-[260px] px-6 py-5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            Pickup:
                          </span>{' '}
                          {formatAddress(shipment.pickupAddress)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            Delivery:
                          </span>{' '}
                          {formatAddress(shipment.deliveryAddress)}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                            statusStyles[assignment.status] ??
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {formatStatus(assignment.status)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(assignment.assignedAt)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleAccept(shipment.id)}
                            disabled={
                              acceptingId !== null || pickingUpId !== null
                            }
                            className="cursor-pointer whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                          >
                            {acceptingId === shipment.id
                              ? 'Accepting…'
                              : 'Accept shipment'}
                          </button>
                        ) : isAccepted ? (
                          <button
                            type="button"
                            onClick={() => handlePickup(shipment.id)}
                            disabled={
                              pickingUpId !== null || acceptingId !== null
                            }
                            className="cursor-pointer whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                          >
                            {pickingUpId === shipment.id
                              ? 'Picking up…'
                              : 'Pickup shipment'}
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatStatus(assignment.status)} ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {loading
            ? 'Retrieving assigned shipment records…'
            : `${assignments.length} assigned shipment${assignments.length === 1 ? '' : 's'} displayed`}
        </div>
      </section>

      <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row">
        <p>© 2026 Delivo Logistics. Courier workspace.</p>
        <p>
          Built for smarter deliveries{' '}
          <span className="text-indigo-500">◆</span>
        </p>
      </footer>
    </main>
  )
}
