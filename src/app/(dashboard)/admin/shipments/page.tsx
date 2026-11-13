'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getReadyForAssignment,
  getPaidShipments,
  getAdminCouriers,
  assignShipmentToCourier,
  makeReadyForAssignment,
} from '@/services/admin-shipment.service'
import { restoreSession, useAuthStore, logoutUser } from '@/store/auth.store'
import { useTheme } from '@/components/providers/theme-provider'

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
  createdAt: string
  weight: number
  deliveryCharge: number
  customer?: {
    name?: string
    phone?: string
  }
  pickupAddress?: Address
  deliveryAddress?: Address
}

type Courier = {
  id: string
  name: string
  email: string
  phone?: string
  status: string
  _count?: {
    courierAssignments: number
  }
}

type PaginatedShipments = {
  data?: Shipment[]
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

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

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export default function AdminShipmentsPage() {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const darkMode = theme === 'dark'

  const [menuOpen, setMenuOpen] = useState(false)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [paidShipments, setPaidShipments] = useState<Shipment[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCouriers, setSelectedCouriers] = useState<
    Record<string, string>
  >({})
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState('')
  const [makingReadyId, setMakingReadyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const [shipmentData, paidData, courierData] = await Promise.all([
        getReadyForAssignment({
          page,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        getPaidShipments({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        getAdminCouriers(),
      ])

      const result = shipmentData as PaginatedShipments
      const paidResult = paidData as PaginatedShipments

      const shipmentList = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(shipmentData)
          ? shipmentData
          : []

      const paidList = Array.isArray(paidResult?.data)
        ? paidResult.data
        : Array.isArray(paidData)
          ? paidData
          : []

      setShipments(shipmentList)
      setPaidShipments(paidList)
      setCouriers(Array.isArray(courierData) ? courierData : [])
      setTotal(result?.meta?.total ?? shipmentList.length)
      setTotalPages(result?.meta?.totalPages ?? 1)
    } catch (err) {
      const requestError = err as {
        response?: {
          status?: number
          data?: { message?: string }
        }
      }

      if (requestError.response?.status === 401) {
        useAuthStore.getState().clearAuth()
        router.replace('/login')
        return
      }

      setError(
        requestError.response?.data?.message ??
          'Unable to load shipments. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [page, router])

  useEffect(() => {
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

      const currentUser = useAuthStore.getState().user

      if (currentUser && currentUser.role !== 'ADMIN') {
        router.replace(
          currentUser.role === 'COURIER' ? '/courier' : '/customer',
        )
        return
      }

      loadData()
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [accessToken, router, loadData])

  const handleMakeReady = async (shipmentId: string) => {
    setMakingReadyId(shipmentId)
    setError('')
    setSuccess('')

    try {
      await makeReadyForAssignment(shipmentId)
      await loadData()
      setSuccess('Shipment moved to Ready for Assignment successfully.')
    } catch (err) {
      const requestError = err as {
        response?: {
          data?: { message?: string }
        }
      }

      setError(
        requestError.response?.data?.message ??
          'Unable to update shipment. Please try again.',
      )
    } finally {
      setMakingReadyId('')
    }
  }

  const handleAssign = async (shipmentId: string) => {
    const courierId = selectedCouriers[shipmentId]

    if (!courierId) {
      setError('Please select a courier before assigning.')
      return
    }

    setAssigningId(shipmentId)
    setError('')
    setSuccess('')

    try {
      await assignShipmentToCourier(shipmentId, courierId)
      setSuccess('Courier assigned successfully.')
      setSelectedCouriers((previous) => {
        const updated = { ...previous }
        delete updated[shipmentId]
        return updated
      })
      await loadData()
    } catch (err) {
      const requestError = err as {
        response?: {
          status?: number
          data?: { message?: string }
        }
      }

      setError(
        requestError.response?.data?.message ??
          'Unable to assign courier. Please try again.',
      )
    } finally {
      setAssigningId('')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    router.replace('/login')
  }

  const navigation = [
    { label: 'Overview', icon: '▦', href: '/admin' },
    { label: 'Shipments', icon: '▤', href: '/admin/shipments' },
    { label: 'Customers', icon: '♙', href: '/admin/customers' },
    { label: 'Couriers', icon: '♧', href: '/admin/couriers' },
    { label: 'Payments', icon: '৳', href: '/admin/payments' },
  ]

  if (!user || user.role !== 'ADMIN') return null

  return (
    <div
      className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f5f7fb] text-slate-800'}`}
    >
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white text-slate-800 transition-transform dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[82px] items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-black text-white shadow-lg shadow-indigo-500/30">
            D
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">Delivo</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Logistics platform
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="ml-auto cursor-pointer text-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  if (item.href !== '/admin/shipments') router.push(item.href)
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  item.label === 'Shipments'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:bg-indigo-500'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${
                    item.label === 'Shipments'
                      ? 'bg-white/15'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8 px-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Preferences
          </p>
          <button
            type="button"
            onClick={() => router.push('/admin/settings')}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center text-lg">
              ⚙
            </span>
            Settings
          </button>
        </div>

        <div className="mt-auto p-4">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Platform status
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Your workspace is ready. Keep deliveries moving.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500 dark:text-white">
              {user.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {user.name ?? 'Administrator'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Administrator
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMenuOpen(true)}
              className="cursor-pointer rounded-xl border border-slate-200 p-2 text-xl dark:border-slate-700 dark:text-slate-200 lg:hidden"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-400">
                Workspace /{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Shipments
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Manage shipments and courier assignments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Admin dashboard
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {user.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-10">
          <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                SHIPMENT MANAGEMENT
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
                Shipments
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                Review paid shipments and assign available couriers.
              </p>
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Paid shipments
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
                {loading ? '…' : paidShipments.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Ready for assignment
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
                {loading ? '…' : total}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Available couriers
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
                {loading ? '…' : couriers.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Current page
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
                {page}{' '}
                <span className="text-base font-medium text-slate-400">
                  / {totalPages}
                </span>
              </p>
            </div>
          </section>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              {success}
            </div>
          )}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                  Paid Shipments
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Move successfully paid shipments to courier assignment.
                </p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Awaiting approval
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
                    <th className="px-6 py-4">Shipment</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Weight</th>
                    <th className="px-6 py-4">Delivery charge</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-slate-400"
                      >
                        Loading paid shipments…
                      </td>
                    </tr>
                  ) : paidShipments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-slate-400"
                      >
                        No paid shipments are waiting for approval.
                      </td>
                    </tr>
                  ) : (
                    paidShipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {shipment.trackingNumber ?? shipment.id}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Paid
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {shipment.customer?.name ?? 'Customer unavailable'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {shipment.customer?.phone ?? 'No phone number'}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          {shipment.weight} kg
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          ৳{Number(shipment.deliveryCharge ?? 0).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(shipment.createdAt)}
                        </td>
                        <td className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() => handleMakeReady(shipment.id)}
                            disabled={makingReadyId === shipment.id || loading}
                            className="cursor-pointer whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {makingReadyId === shipment.id
                              ? 'Processing…'
                              : 'Make Ready'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                  Ready for assignment
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Select a courier for each shipment.
                </p>
              </div>
              <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Awaiting courier assignment
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
                    <th className="px-6 py-4">Shipment</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Package</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Assign courier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-slate-400"
                      >
                        Loading shipments…
                      </td>
                    </tr>
                  ) : shipments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-slate-400"
                      >
                        No shipments are waiting for assignment.
                      </td>
                    </tr>
                  ) : (
                    shipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {shipment.trackingNumber ?? shipment.id}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Ready for assignment
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {shipment.customer?.name ?? 'Customer unavailable'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {shipment.customer?.phone ?? 'No phone number'}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          <p>{formatAddress(shipment.pickupAddress)}</p>
                          <p className="my-1 text-xs text-indigo-500">
                            ↓ Delivery
                          </p>
                          <p>{formatAddress(shipment.deliveryAddress)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {shipment.weight} kg
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ৳{Number(shipment.deliveryCharge ?? 0).toFixed(2)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(shipment.createdAt)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex min-w-[220px] flex-col gap-2">
                            <select
                              value={selectedCouriers[shipment.id] ?? ''}
                              onChange={(event) =>
                                setSelectedCouriers((previous) => ({
                                  ...previous,
                                  [shipment.id]: event.target.value,
                                }))
                              }
                              className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <option value="">Select courier</option>
                              {couriers.map((courier) => (
                                <option key={courier.id} value={courier.id}>
                                  {courier.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAssign(shipment.id)}
                              disabled={
                                !selectedCouriers[shipment.id] ||
                                assigningId === shipment.id ||
                                couriers.length === 0
                              }
                              className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {assigningId === shipment.id
                                ? 'Assigning…'
                                : 'Assign courier'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:px-6">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Showing {shipments.length} shipment
                {shipments.length === 1 ? '' : 's'} on this page
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                <span className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || loading}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row">
            <p>© 2026 Delivo Logistics. Operations dashboard.</p>
            <p>
              Built for smarter deliveries{' '}
              <span className="text-indigo-500">◆</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
