'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { restoreSession, useAuthStore } from '@/store/auth.store'

type Payment = {
  id: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  amount: number | string
  currency: string
  shipment?: {
    trackingNumber: string
  }
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!paymentId) return

    let active = true
    let attempts = 0
    let timeout: ReturnType<typeof setTimeout>

    const checkPayment = async () => {
      try {
        let token = useAuthStore.getState().accessToken

        if (!token) {
          await restoreSession()
          token = useAuthStore.getState().accessToken
        }

        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        const response = await api.get(`/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = response.data?.data

        if (!active) return

        setPayment(data)

        if (
          data?.status === 'SUCCESS' ||
          data?.status === 'FAILED' ||
          data?.status === 'CANCELLED'
        ) {
          setLoading(false)
          return
        }

        attempts += 1

        if (attempts >= 10) {
          setLoading(false)
          return
        }

        timeout = setTimeout(checkPayment, 2000)
      } catch {
        if (!active) return

        setError('Unable to verify your payment.')
        setLoading(false)
      }
    }

    void checkPayment()

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [paymentId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!paymentId ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Verification Unavailable
            </h1>
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">
              Payment information is missing.
            </p>
          </>
        ) : loading ? (
          <>
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              Verifying Payment
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Please wait while we confirm your payment.
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Verification Unavailable
            </h1>
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          </>
        ) : payment?.status === 'SUCCESS' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              ✓
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
              Payment Successful!
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Your payment has been confirmed successfully.
            </p>
            {payment.shipment?.trackingNumber && (
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tracking: {payment.shipment.trackingNumber}
              </p>
            )}
          </>
        ) : payment?.status === 'FAILED' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Payment Failed
            </h1>
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">
              Your payment could not be completed.
            </p>
          </>
        ) : payment?.status === 'CANCELLED' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Payment Cancelled
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Your payment was cancelled.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Payment Pending
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              We havent received payment confirmation yet. Please check your
              shipment status again shortly.
            </p>
          </>
        )}

        <Link
          href="/customer"
          className="mt-7 inline-flex w-full cursor-pointer justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
