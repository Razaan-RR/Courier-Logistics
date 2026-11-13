'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCourierAssignedShipments,
  getCourierActiveShipments,
  getCourierCompletedShipments,
} from '@/services/courier.service'
import { useAuthStore } from '@/store/auth.store'

type CourierAssignment = {
  id: string
  status: string
  shipment: {
    id: string
    trackingNumber: string
    recipientName: string
    recipientPhone: string
    status: string
    packageType: string
    weight: number | string
  }
}

export default function CourierPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  const [assigned, setAssigned] = useState<CourierAssignment[]>([])
  const [active, setActive] = useState<CourierAssignment[]>([])
  const [completed, setCompleted] = useState<CourierAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && user.role !== 'COURIER') {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/customer')
    }
  }, [user, router])

  useEffect(() => {
    if (!user || user.role !== 'COURIER') return

    let activeRequest = true

    const fetchDashboard = async () => {
      try {
        setLoading(true)
        setError('')

        const [assignedData, activeData, completedData] = await Promise.all([
          getCourierAssignedShipments(),
          getCourierActiveShipments(),
          getCourierCompletedShipments(),
        ])

        if (!activeRequest) return

        setAssigned(assignedData)
        setActive(activeData)
        setCompleted(completedData)
      } catch {
        if (activeRequest) {
          setError('Unable to load courier dashboard data.')
        }
      } finally {
        if (activeRequest) {
          setLoading(false)
        }
      }
    }

    void fetchDashboard()

    return () => {
      activeRequest = false
    }
  }, [user])

  if (!user || user.role !== 'COURIER') {
    return null
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Courier Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome, {user.name}</p>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Loading dashboard...
        </p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-500">{error}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border p-5">
              <p className="text-sm text-muted-foreground">
                Assigned Shipments
              </p>
              <p className="mt-2 text-3xl font-bold">{assigned.length}</p>
            </div>

            <div className="rounded-xl border p-5">
              <p className="text-sm text-muted-foreground">Active Shipments</p>
              <p className="mt-2 text-3xl font-bold">{active.length}</p>
            </div>

            <div className="rounded-xl border p-5">
              <p className="text-sm text-muted-foreground">
                Completed Shipments
              </p>
              <p className="mt-2 text-3xl font-bold">{completed.length}</p>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Assigned Shipments</h2>

            {assigned.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No shipments assigned yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {assigned.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {assignment.shipment.trackingNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Recipient: {assignment.shipment.recipientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Phone: {assignment.shipment.recipientPhone}
                        </p>
                      </div>

                      <div className="text-sm">
                        <p>
                          Status:{' '}
                          {assignment.shipment.status.replaceAll('_', ' ')}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Assignment: {assignment.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
