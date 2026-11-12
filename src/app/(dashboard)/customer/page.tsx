'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

type Shipment = {
  id: string
  status: string
}

type ShipmentStats = {
  total: number
  pending: number
  inTransit: number
  delivered: number
}

const emptyStats: ShipmentStats = {
  total: 0,
  pending: 0,
  inTransit: 0,
  delivered: 0,
}

const extractShipments = (response: unknown): Shipment[] => {
  if (typeof response !== 'object' || response === null) return []

  const responseData = response as {
    data?: {
      data?: unknown
    }
  }

  const data = responseData.data?.data

  if (Array.isArray(data)) return data as Shipment[]

  if (typeof data === 'object' && data !== null) {
    const nestedData = data as {
      shipments?: unknown
      data?: unknown
    }

    if (Array.isArray(nestedData.shipments)) {
      return nestedData.shipments as Shipment[]
    }

    if (Array.isArray(nestedData.data)) {
      return nestedData.data as Shipment[]
    }
  }

  return []
}

export default function CustomerPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  const [stats, setStats] = useState<ShipmentStats>(emptyStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/shipments', {
        params: { page: 1, limit: 100 },
      })

      const shipments = extractShipments(response)

      setStats({
        total: shipments.length,
        pending: shipments.filter(
          (shipment) => shipment.status === 'PENDING_PAYMENT',
        ).length,
        inTransit: shipments.filter((shipment) =>
          [
            'ASSIGNED',
            'COURIER_ACCEPTED',
            'PICKED_UP',
            'IN_TRANSIT',
            'OUT_FOR_DELIVERY',
          ].includes(shipment.status),
        ).length,
        delivered: shipments.filter(
          (shipment) => shipment.status === 'DELIVERED',
        ).length,
      })

      setError('')
    } catch (error: unknown) {
      console.error('Customer dashboard API error:', error)

      if (typeof error === 'object' && error !== null && 'response' in error) {
        const apiError = error as {
          response?: {
            status?: number
            data?: {
              message?: string
            }
          }
        }

        setError(
          apiError.response?.data?.message ||
            `Request failed with status ${apiError.response?.status || 'unknown'}`,
        )
      } else {
        setError('Unable to connect to the backend server.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && user.role !== 'CUSTOMER') {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/courier')
    }
  }, [user, router])

  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') return

    const timer = setTimeout(() => {
      void loadStats()
    }, 0)

    const interval = setInterval(() => {
      void loadStats()
    }, 30000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [user, loadStats])

  if (!user || user.role !== 'CUSTOMER') {
    return null
  }

  const statCards = [
    {
      title: 'Total Shipments',
      value: stats.total,
      description: 'All your shipments',
    },
    {
      title: 'Pending',
      value: stats.pending,
      description: 'Awaiting payment',
    },
    {
      title: 'In Transit',
      value: stats.inTransit,
      description: 'Currently being delivered',
    },
    {
      title: 'Delivered',
      value: stats.delivered,
      description: 'Successfully delivered',
    },
  ]

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Welcome, {user.name}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border bg-background p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {card.title}
            </p>

            <p className="mt-3 text-3xl font-bold">
              {isLoading ? '...' : card.value}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Statistics refresh automatically every 30 seconds.
        </p>

        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={isLoading}
          className="cursor-pointer rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Statistics'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.push('/customer/shipments')}
          className="cursor-pointer rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          View My Shipments
        </button>
        <button
          type="button"
          onClick={() => router.push('/customer/addresses')}
          className="cursor-pointer rounded-md border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          My Addresses
        </button>
      </div>
    </main>
  )
}
