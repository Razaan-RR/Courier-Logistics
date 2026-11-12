'use client'

import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          !
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
          Payment Cancelled
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your payment was not completed. You can return to your shipments and
          try again whenever youre ready.
        </p>

        <Link
          href="/customer/shipments"
          className="mt-7 inline-flex w-full cursor-pointer justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Back to My Shipments
        </Link>
      </div>
    </div>
  )
}
