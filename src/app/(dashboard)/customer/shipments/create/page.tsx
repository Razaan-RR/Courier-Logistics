'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { restoreSession, useAuthStore } from '@/store/auth.store'

type Address = {
  id: string
  label?: string
  recipientName?: string
  addressLine?: string
  addressLine1?: string
  street?: string
  area?: string
  city?: string
  district?: string
  division?: string
  phone?: string
}

const addressLabel = (address: Address) =>
  [
    address.label,
    address.addressLine1 ?? address.addressLine ?? address.street,
    address.area,
    address.city,
    address.district,
    address.division,
  ]
    .filter(Boolean)
    .join(', ') || address.id

const extractAddresses = (response: unknown): Address[] => {
  if (typeof response !== 'object' || response === null) return []

  const responseData = response as {
    data?: {
      data?: unknown
    }
  }

  const data = responseData.data?.data

  if (Array.isArray(data)) return data as Address[]

  if (typeof data === 'object' && data !== null) {
    const nestedData = data as {
      addresses?: unknown
      data?: unknown
    }

    if (Array.isArray(nestedData.addresses)) {
      return nestedData.addresses as Address[]
    }

    if (Array.isArray(nestedData.data)) {
      return nestedData.data as Address[]
    }
  }

  return []
}

export default function CreateShipmentPage() {
  const router = useRouter()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    pickupAddressId: '',
    deliveryAddressId: '',
    recipientName: '',
    recipientPhone: '',
    packageType: 'PARCEL',
    description: '',
    weight: '1',
    length: '',
    width: '',
    height: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadAddresses = async () => {
      setLoadingAddresses(true)
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

        const response = await api.get('/addresses', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (cancelled) return

        const records = extractAddresses(response)
        setAddresses(records)
      } catch (err) {
        if (cancelled) return

        const e = err as { response?: { data?: { message?: string } } }
        setError(
          e.response?.data?.message ?? 'Unable to load your saved addresses.',
        )
      } finally {
        if (!cancelled) setLoadingAddresses(false)
      }
    }

    loadAddresses()

    return () => {
      cancelled = true
    }
  }, [accessToken, router])

  const charge = useMemo(() => {
    const weight = Number(form.weight)
    return Number.isFinite(weight) && weight > 0 ? 60 + weight * 20 : 0
  }, [form.weight])

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.pickupAddressId || !form.deliveryAddressId) {
      setError('Please select both pickup and delivery addresses.')
      return
    }

    if (form.pickupAddressId === form.deliveryAddressId) {
      setError('Pickup and delivery addresses must be different.')
      return
    }

    if (!Number.isFinite(Number(form.weight)) || Number(form.weight) <= 0) {
      setError('Weight must be greater than zero.')
      return
    }

    setSubmitting(true)

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

      const payload = {
        pickupAddressId: form.pickupAddressId,
        deliveryAddressId: form.deliveryAddressId,
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        packageType: form.packageType,
        description: form.description.trim() || undefined,
        weight: Number(form.weight),
        length: form.length ? Number(form.length) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
      }

      const response = await api.post('/shipments', payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const shipment = response.data?.data?.shipment ?? response.data?.data

      if (!shipment?.id) {
        throw new Error('Shipment was created, but its ID was not returned.')
      }

      router.push(`/customer/shipments/${shipment.id}`)
    } catch (err) {
      const e = err as {
        response?: { data?: { message?: string } }
        message?: string
      }

      setError(
        e.response?.data?.message ?? e.message ?? 'Unable to create shipment.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

  const labelClass =
    'mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300'

  return (
    <>
      <section className="mb-8">
        <Link
          href="/customer/shipments"
          className="mb-4 inline-flex cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
        >
          ← Back to shipments
        </Link>
        <div className="mb-3">
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
            NEW DELIVERY
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">
          Create a shipment
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enter package and recipient details to create your delivery order.
        </p>
      </section>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
          {error}
        </div>
      )}

      {!loadingAddresses && addresses.length === 0 && !error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          You need saved addresses before creating a shipment. Add your
          addresses first.
        </div>
      )}

      <form
        onSubmit={submit}
        className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_320px]"
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                Delivery addresses
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose from your saved addresses.
              </p>
            </div>

            {loadingAddresses ? (
              <p className="py-6 text-sm text-slate-400">
                Loading saved addresses…
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="pickup" className={labelClass}>
                    Pickup address *
                  </label>
                  <select
                    id="pickup"
                    required
                    value={form.pickupAddressId}
                    onChange={(e) =>
                      updateField('pickupAddressId', e.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="">Select pickup address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {addressLabel(address)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="delivery" className={labelClass}>
                    Delivery address *
                  </label>
                  <select
                    id="delivery"
                    required
                    value={form.deliveryAddressId}
                    onChange={(e) =>
                      updateField('deliveryAddressId', e.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="">Select delivery address</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {addressLabel(address)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <Link
              href="/customer/addresses"
              className="mt-5 inline-flex cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
            >
              Manage saved addresses →
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                Recipient information
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Who should receive this package?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="recipientName" className={labelClass}>
                  Recipient name *
                </label>
                <input
                  id="recipientName"
                  required
                  maxLength={100}
                  value={form.recipientName}
                  onChange={(e) => updateField('recipientName', e.target.value)}
                  className={fieldClass}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label htmlFor="recipientPhone" className={labelClass}>
                  Recipient phone *
                </label>
                <input
                  id="recipientPhone"
                  required
                  maxLength={20}
                  value={form.recipientPhone}
                  onChange={(e) =>
                    updateField('recipientPhone', e.target.value)
                  }
                  className={fieldClass}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                Package details
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Provide the package type, weight, and dimensions.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="packageType" className={labelClass}>
                  Package type *
                </label>
                <select
                  id="packageType"
                  required
                  value={form.packageType}
                  onChange={(e) => updateField('packageType', e.target.value)}
                  className={fieldClass}
                >
                  <option value="PARCEL">Parcel</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="BOX">Box</option>
                  <option value="FRAGILE">Fragile</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="weight" className={labelClass}>
                  Weight (kg) *
                </label>
                <input
                  id="weight"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  className={fieldClass}
                />
              </div>
              {(['length', 'width', 'height'] as const).map((field) => (
                <div key={field}>
                  <label htmlFor={field} className={labelClass}>
                    {field.charAt(0).toUpperCase() + field.slice(1)} (cm)
                  </label>
                  <input
                    id={field}
                    type="number"
                    min="0"
                    step="0.1"
                    value={form[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    className={fieldClass}
                    placeholder="Optional"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label htmlFor="description" className={labelClass}>
                  Package description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className={fieldClass}
                  placeholder="Describe the package (optional)"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 xl:sticky xl:top-24">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            ৳
          </div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Delivery estimate
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Estimated charge based on package weight.
          </p>
          <div className="my-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Estimated total
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
              ৳{charge.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              ৳60 base charge + ৳20 per kg
            </p>
          </div>
          <p className="mb-6 text-xs leading-5 text-slate-500 dark:text-slate-400">
            The backend calculates the final delivery charge when the shipment
            is created. Payment is handled separately.
          </p>
          <button
            type="submit"
            disabled={submitting || loadingAddresses || addresses.length < 2}
            className="w-full cursor-pointer rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating shipment…' : 'Create shipment →'}
          </button>
          <Link
            href="/customer/shipments"
            className="mt-3 block cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
        </aside>
      </form>
    </>
  )
}
