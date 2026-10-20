'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { restoreSession, useAuthStore } from '@/store/auth.store'

type Address = {
  addressLine?: string
  addressLine1?: string
  street?: string
  area?: string
  city?: string
  district?: string
  division?: string
  postalCode?: string
}

type Shipment = {
  id: string
  trackingNumber: string
  status: string
  recipientName: string
  recipientPhone: string
  packageType: string
  description?: string
  weight: number | string
  length?: number | string
  width?: number | string
  height?: number | string
  deliveryCharge: number | string
  createdAt: string
  updatedAt: string
  pickupAddress?: Address
  deliveryAddress?: Address
}

type HistoryItem = {
  id: string
  status: string
  note?: string
  createdAt: string
  changedBy?: {
    name: string
    role: string
  }
}

const statusStyles: Record<string, string> = {
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
  OUT_FOR_DELIVERY: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  DELIVERED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  DELIVERY_FAILED:
    'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  RETURNED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  CANCELLED:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const formatStatus = (status: string) =>
  status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const formatAddress = (address?: Address) => {
  if (!address) return 'Address unavailable'

  return (
    [
      address.addressLine1 ?? address.addressLine ?? address.street,
      address.area,
      address.city,
      address.district,
      address.division,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(', ') || 'Address unavailable'
  )
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

export default function ShipmentDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const loadDetails = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      let token = accessToken

      if (!token) {
        await restoreSession()
        token = useAuthStore.getState().accessToken
      }

      if (!token) {
        router.replace('/login')
        return
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      }

      const [shipmentResponse, historyResponse] = await Promise.all([
        api.get(`/shipments/${params.id}`, config),
        api.get(`/shipments/${params.id}/history`, config),
      ])

      const shipmentData = shipmentResponse.data?.data
      const historyData = historyResponse.data?.data

      setShipment(shipmentData?.shipment ?? shipmentData)
      setHistory(
        Array.isArray(historyData)
          ? historyData
          : Array.isArray(historyData?.history)
            ? historyData.history
            : [],
      )
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } }
      }

      if (e.response?.status === 401) {
        useAuthStore.getState().clearAuth()
        router.replace('/login')
        return
      }

      setError(e.response?.data?.message ?? 'Unable to load shipment details.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, params.id, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDetails()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadDetails])

  const cancelShipment = async () => {
    if (
      !shipment ||
      !window.confirm(`Cancel shipment ${shipment.trackingNumber}?`)
    ) {
      return
    }

    setBusy(true)
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

      setMessage('Shipment cancelled successfully.')
      await loadDetails()
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Unable to cancel shipment.')
    } finally {
      setBusy(false)
    }
  }

  const cardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6'

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Loading shipment details…
      </div>
    )
  }

  if (error && !shipment) {
    return (
      <section className={cardClass}>
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        <button
          type="button"
          onClick={loadDetails}
          className="mt-4 cursor-pointer text-sm font-semibold text-indigo-600 dark:text-indigo-400"
        >
          Try again
        </button>
        <Link
          href="/customer/shipments"
          className="ml-4 cursor-pointer text-sm font-semibold text-slate-500"
        >
          Back to shipments
        </Link>
      </section>
    )
  }

  if (!shipment) return null

  return (
    <>
      <section className="mb-8">
        <Link
          href="/customer/shipments"
          className="mb-4 inline-flex cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
        >
          ← Back to shipments
        </Link>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3">
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                SHIPMENT TRACKING
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
              {shipment.trackingNumber}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Created {formatDate(shipment.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-2 text-xs font-semibold ${statusStyles[shipment.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {formatStatus(shipment.status)}
            </span>
            {shipment.status === 'PENDING_PAYMENT' && (
              <button
                type="button"
                disabled={busy}
                onClick={cancelShipment}
                className="cursor-pointer rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
              >
                {busy ? 'Cancelling…' : 'Cancel shipment'}
              </button>
            )}
          </div>
        </div>
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Delivery route
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pickup and destination information
            </p>

            <div className="mt-7 space-y-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-lg text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    ↗
                  </span>
                  <div className="mt-2 h-12 border-l-2 border-dashed border-slate-200 dark:border-slate-700" />
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pickup address
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatAddress(shipment.pickupAddress)}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  ⌖
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery address
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatAddress(shipment.deliveryAddress)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                Shipment history
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Updates recorded by the delivery system
              </p>
            </div>

            {history.length === 0 ? (
              <p className="py-6 text-sm text-slate-400">
                No history records found.
              </p>
            ) : (
              <div className="space-y-6">
                {history.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    {index !== history.length - 1 && (
                      <div className="absolute left-4 top-9 h-full w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div
                      className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusStyles[item.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      ✓
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {formatStatus(item.status)}
                      </p>
                      {item.note && (
                        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                          {item.note}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(item.createdAt)}
                      </p>
                      {item.changedBy && (
                        <p className="mt-1 text-xs text-slate-400">
                          Updated by {item.changedBy.name} (
                          {formatStatus(item.changedBy.role)})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Recipient details
            </h2>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Full name
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {shipment.recipientName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Phone number
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {shipment.recipientPhone}
                </p>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Package details
            </h2>
            <div className="mt-5 space-y-4">
              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Package type
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {shipment.packageType}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Weight
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {Number(shipment.weight).toLocaleString()} kg
                </span>
              </div>
              {(shipment.length || shipment.width || shipment.height) && (
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Dimensions
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {[shipment.length, shipment.width, shipment.height]
                      .map((v) => v ?? '—')
                      .join(' × ')}{' '}
                    cm
                  </span>
                </div>
              )}
              {shipment.description && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Description
                  </p>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                    {shipment.description}
                  </p>
                </div>
              )}
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Delivery charge
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-100">
                  ৳{Number(shipment.deliveryCharge).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-[#f5f6ff] p-5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Need help?
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Keep your tracking number handy when asking about this delivery.
            </p>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(shipment.trackingNumber)
              }
              className="mt-4 cursor-pointer rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800"
            >
              Copy tracking number
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
