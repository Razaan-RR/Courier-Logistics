'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { restoreSession, useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'

type Shipment = {
  id: string
  trackingNumber: string
  recipientName: string
  recipientPhone: string
  status: string
  deliveryCharge: number
  createdAt: string
}

const statuses = [
  'ALL',
  'PENDING_PAYMENT',
  'PAID',
  'READY_FOR_ASSIGNMENT',
  'ASSIGNED',
  'COURIER_ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'RETURNED',
  'CANCELLED',
]

const badge = (status: string) => {
  const styles: Record<string, string> = {
    PENDING_PAYMENT:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    PAID: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    READY_FOR_ASSIGNMENT:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    ASSIGNED:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    COURIER_ACCEPTED:
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    PICKED_UP:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    IN_TRANSIT: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    OUT_FOR_DELIVERY:
      'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    DELIVERED:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    DELIVERY_FAILED:
      'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    RETURNED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    CANCELLED:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }

  return (
    styles[status] ??
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  )
}

const label = (status: string) =>
  status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

export default function CustomerShipmentsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  const loadShipments = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      let token = accessToken

      if (!token) {
        await restoreSession()
        token = useAuthStore.getState().accessToken
      }

      if (!token) {
        window.location.href = '/login'
        return
      }

      const config = { headers: { Authorization: `Bearer ${token}` } }

      const response = search.trim()
        ? await api.get('/shipments/search', {
            ...config,
            params: { q: search.trim(), page, limit: 10 },
          })
        : await api.get('/shipments', {
            ...config,
            params: {
              page,
              limit: 10,
              ...(status !== 'ALL' ? { status } : {}),
              sortBy: 'createdAt',
              sortOrder: 'desc',
            },
          })

      const payload = response.data?.data
      const rows = Array.isArray(payload?.shipments)
        ? payload.shipments
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []

      setShipments(rows)
      setTotal(payload?.pagination?.total ?? rows.length)
      setTotalPages(Math.max(1, payload?.pagination?.totalPages ?? 1))
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } }
      }

      if (e.response?.status === 401) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return
      }

      setError(e.response?.data?.message ?? 'Unable to retrieve shipments.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, search, status])

  useEffect(() => {
    const timer = window.setTimeout(loadShipments, 300)
    return () => window.clearTimeout(timer)
  }, [loadShipments])

  const cancelShipment = async (shipment: Shipment) => {
    if (!window.confirm(`Cancel shipment ${shipment.trackingNumber}?`)) return

    setBusyId(shipment.id)
    setError('')
    setMessage('')

    try {
      let token = useAuthStore.getState().accessToken

      if (!token) {
        await restoreSession()
        token = useAuthStore.getState().accessToken
      }

      if (!token) {
        router.replace('/login')
        return
      }

      await api.post(
        `/shipments/${shipment.id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )

      setMessage(`Shipment ${shipment.trackingNumber} cancelled successfully.`)
      await loadShipments()
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Unable to cancel this shipment.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            SHIPMENT MANAGEMENT
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
            My shipments
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Search, track, and manage your delivery orders.
          </p>
        </div>
        <Link
          href="/customer/shipments/create"
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700"
        >
          + Create shipment
        </Link>
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label
              htmlFor="shipment-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Search shipments
            </label>
            <input
              id="shipment-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Tracking number, recipient name, or phone"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="shipment-status"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Filter by status
            </label>
            <select
              id="shipment-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              disabled={Boolean(search.trim())}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'All statuses' : label(item)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <p>
            {loading
              ? 'Loading…'
              : `${total} shipment${total === 1 ? '' : 's'} found`}
          </p>
          <button
            type="button"
            onClick={loadShipments}
            className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            Refresh ↻
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/70">
                <th className="px-6 py-4">Tracking number</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Delivery charge</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-slate-400"
                  >
                    Loading shipments…
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No shipments match your search.
                    </p>
                    <Link
                      href="/customer/shipments/create"
                      className="mt-3 inline-block cursor-pointer text-sm font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      Create a shipment →
                    </Link>
                  </td>
                </tr>
              ) : (
                shipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-6 py-5 text-sm font-bold text-slate-800 dark:text-slate-100">
                      {shipment.trackingNumber}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {shipment.recipientName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {shipment.recipientPhone}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ${badge(shipment.status)}`}
                      >
                        {label(shipment.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      ৳{Number(shipment.deliveryCharge).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(shipment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/customer/shipments/${shipment.id}`}
                          className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          Details
                        </Link>
                        {shipment.status === 'PENDING_PAYMENT' && (
                          <button
                            type="button"
                            disabled={busyId === shipment.id}
                            onClick={() => cancelShipment(shipment)}
                            className="cursor-pointer text-sm font-semibold text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400"
                          >
                            {busyId === shipment.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:px-6">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
