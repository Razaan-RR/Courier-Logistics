'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { restoreSession, useAuthStore, logoutUser } from '@/store/auth.store'

type DashboardStats = {
  totalShipments: number
  inTransit: number
  delivered: number
  pending: number
}

type Address = {
  addressLine?: string
  addressLine1?: string
  street?: string
  area?: string
  city?: string
  district?: string
  division?: string
  country?: string
}

type Shipment = {
  id: string
  trackingNumber?: string
  status: string
  createdAt: string
  updatedAt?: string
  customer?: {
    name?: string
  }
  pickupAddress?: Address
  deliveryAddress?: Address
}

const statusStyles: Record<string, string> = {
  IN_TRANSIT: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  OUT_FOR_DELIVERY: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  ASSIGNED:
    'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  COURIER_ACCEPTED:
    'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  PICKED_UP:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  DELIVERED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PENDING_PAYMENT:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  PAID: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  READY_FOR_ASSIGNMENT:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  DELIVERY_FAILED:
    'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  RETURNED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  CANCELLED:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Pending payment',
  READY_FOR_ASSIGNMENT: 'Ready for assignment',
  COURIER_ACCEPTED: 'Courier accepted',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERY_FAILED: 'Delivery failed',
}

const formatStatus = (status: string) =>
  statusLabels[status] ??
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

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const formatRelativeTime = (date: string) => {
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime())
  const minutes = Math.floor(elapsed / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  return formatDate(date)
}

export default function AdminPage() {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const router = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }

        const [statsResponse, shipmentsResponse] = await Promise.all([
          api.get('/admin/dashboard/stats', config),
          api.get('/admin/shipments', {
            ...config,
            params: {
              page: 1,
              limit: 5,
              sortBy: 'createdAt',
              sortOrder: 'desc',
            },
          }),
        ])

        if (cancelled) return

        const statsData = statsResponse.data.data
        const shipmentData = shipmentsResponse.data.data

        setStats(statsData)
        setShipments(Array.isArray(shipmentData?.data) ? shipmentData.data : [])
      } catch (err) {
        if (cancelled) return

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
            'Unable to load dashboard data. Please try again.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [accessToken, router])

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme')
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      localStorage.setItem('admin-theme', next ? 'dark' : 'light')
      return next
    })
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

  const statCards = [
    {
      label: 'Total Shipments',
      value: stats?.totalShipments,
      description: 'All recorded shipments',
      icon: '◫',
      color:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
      bar: 'bg-indigo-500',
      width: 'w-[72%]',
    },
    {
      label: 'In Transit',
      value: stats?.inTransit,
      description: 'Currently in transit',
      icon: '↗',
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
      bar: 'bg-sky-500',
      width: 'w-[56%]',
    },
    {
      label: 'Delivered',
      value: stats?.delivered,
      description: 'Successfully delivered',
      icon: '✓',
      color:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      bar: 'bg-emerald-500',
      width: 'w-[82%]',
    },
    {
      label: 'Pending',
      value: stats?.pending,
      description: 'Awaiting next steps',
      icon: '◷',
      color:
        'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      bar: 'bg-amber-400',
      width: 'w-[22%]',
    },
  ]

  const activity = shipments.slice(0, 3).map((shipment) => ({
    id: shipment.id,
    icon:
      shipment.status === 'DELIVERED'
        ? '✓'
        : shipment.status === 'IN_TRANSIT'
          ? '↗'
          : '+',
    color:
      statusStyles[shipment.status] ??
      'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    title: `Shipment ${formatStatus(shipment.status).toLowerCase()}`,
    detail: `${shipment.trackingNumber ?? shipment.id} · ${shipment.customer?.name ?? 'Customer unavailable'}`,
    time: formatRelativeTime(shipment.updatedAt ?? shipment.createdAt),
  }))

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

      <aside className="fixed left-0 top-0 z-40 h-screen w-64 overflow-y-auto border-r border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="py-2 flex h-[82px] items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
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
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
            Workspace
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setActiveNav(item.label)
                  setMenuOpen(false)
                  if (item.href !== '/admin') router.push(item.href)
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  activeNav === item.label
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:bg-indigo-500 dark:shadow-indigo-950/40'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${
                    activeNav === item.label
                      ? 'bg-white/15'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
                {item.label === 'Shipments' && (
                  <span
                    className={`ml-auto rounded-md px-2 py-0.5 text-[10px] ${
                      activeNav === item.label
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {loading ? '…' : (stats?.totalShipments ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8 px-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
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
              <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Your workspace is ready. Keep deliveries moving.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500 dark:text-white">
              {user?.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {user?.name ?? 'Administrator'}
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
                  {activeNav}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
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
              onClick={toggleDarkMode}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {user?.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-10">
          <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                OPERATIONS OVERVIEW
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
                Good to see you, {user?.name?.split(' ')[0] ?? 'Admin'}.
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                Here&apos;s what&apos;s happening across your delivery network.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/admin/shipments')}
              className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#4f46e5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 sm:self-auto"
            >
              <span className="text-lg">+</span> Create shipment
            </button>
          </section>

          {error && (
            <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 sm:flex-row sm:items-center">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  useAuthStore.setState((state) => ({
                    accessToken: state.accessToken,
                  }))
                  router.refresh()
                }}
                className="cursor-pointer self-start font-semibold underline sm:self-auto"
              >
                Refresh page
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/20 sm:p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-semibold ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    Live data
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                  {loading ? '…' : (stat.value ?? '—').toLocaleString()}
                </p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${stat.bar} ${stat.width}`}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  {stat.description}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                    Recent shipments
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Latest shipments from your database
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/admin/shipments')}
                  className="cursor-pointer self-start rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
                >
                  View all →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
                      <th className="px-6 py-4">Shipment</th>
                      <th className="px-6 py-4">Destination</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-sm text-slate-400"
                        >
                          Loading shipments…
                        </td>
                      </tr>
                    ) : shipments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-sm text-slate-400"
                        >
                          {error
                            ? 'Shipments could not be loaded.'
                            : 'No shipments found.'}
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
                            <p className="mt-1 text-xs text-slate-400">
                              {shipment.customer?.name ??
                                'Customer unavailable'}
                            </p>
                          </td>
                          <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                            {formatAddress(shipment.pickupAddress)} →{' '}
                            {formatAddress(shipment.deliveryAddress)}
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ${statusStyles[shipment.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {formatStatus(shipment.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(shipment.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                {loading
                  ? 'Retrieving shipment records…'
                  : `${shipments.length} recent shipment${shipments.length === 1 ? '' : 's'} displayed`}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                    Recent updates
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Latest shipment records
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800 dark:text-slate-300">
                  ↗
                </span>
              </div>

              <div className="mt-7 space-y-6">
                {loading ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Loading updates…
                  </p>
                ) : activity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No shipment updates available.
                  </p>
                ) : (
                  activity.map((item, index) => (
                    <div key={item.id} className="relative flex gap-3">
                      {index !== activity.length - 1 && (
                        <div className="absolute left-[19px] top-11 h-9 w-px bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div
                        className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${item.color}`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {item.detail}
                        </p>
                        <p className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-7 rounded-xl bg-[#f5f6ff] p-4 dark:border dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Network insight
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Keep an eye on pending shipments to help prevent delivery
                  delays.
                </p>
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
