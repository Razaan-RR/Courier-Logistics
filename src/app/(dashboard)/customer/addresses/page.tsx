'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Address = {
  id: string
  label: string
  addressLine: string
  city: string
  district: string
  postalCode: string | null
  createdAt: string
}

type AddressForm = {
  label: string
  addressLine: string
  city: string
  district: string
  postalCode: string
}

const emptyForm: AddressForm = {
  label: '',
  addressLine: '',
  city: '',
  district: '',
  postalCode: '',
}

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

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadAddresses = useCallback(async () => {
    try {
      setError('')
      const response = await api.get<unknown>('/addresses')
      setAddresses(extractAddresses(response))
    } catch {
      setError('Unable to load your addresses.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const fetchAddresses = async () => {
      try {
        const response = await api.get<unknown>('/addresses')

        if (active) {
          setAddresses(extractAddresses(response))
        }
      } catch {
        if (active) {
          setError('Unable to load your addresses.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void fetchAddresses()

    return () => {
      active = false
    }
  }, [])

  const openCreateForm = () => {
    setEditingAddress(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setIsFormOpen(true)
  }

  const openEditForm = (address: Address) => {
    setEditingAddress(address)
    setForm({
      label: address.label,
      addressLine: address.addressLine,
      city: address.city,
      district: address.district,
      postalCode: address.postalCode || '',
    })
    setError('')
    setSuccess('')
    setIsFormOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      label: form.label.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      postalCode: form.postalCode.trim() || undefined,
    }

    try {
      if (editingAddress) {
        await api.patch(`/addresses/${editingAddress.id}`, payload)
        setSuccess('Address updated successfully.')
      } else {
        await api.post('/addresses', payload)
        setSuccess('Address added successfully.')
      }

      setForm(emptyForm)
      setEditingAddress(null)
      setIsFormOpen(false)
      await loadAddresses()
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const apiError = error as {
          response?: {
            data?: {
              message?: string
            }
          }
        }

        setError(apiError.response?.data?.message || 'Unable to save address.')
      } else {
        setError('Unable to connect to the server.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (address: Address) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${address.label}"?`,
    )

    if (!confirmed) return

    setDeletingId(address.id)
    setError('')
    setSuccess('')

    try {
      await api.delete(`/addresses/${address.id}`)
      setAddresses((current) =>
        current.filter((item) => item.id !== address.id),
      )
      setSuccess('Address deleted successfully.')
    } catch {
      setError('Unable to delete this address.')
    } finally {
      setDeletingId(null)
    }
  }

  const updateField = (field: keyof AddressForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Address Management
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your saved pickup and delivery addresses.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Add New Address
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      {isFormOpen && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h2>

            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false)
                setEditingAddress(null)
                setForm(emptyForm)
              }}
              className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="label" className="text-sm font-medium">
                  Address Label
                </label>
                <input
                  id="label"
                  required
                  maxLength={100}
                  value={form.label}
                  onChange={(event) => updateField('label', event.target.value)}
                  placeholder="Home, Office, Warehouse"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="district" className="text-sm font-medium">
                  District
                </label>
                <input
                  id="district"
                  required
                  value={form.district}
                  onChange={(event) =>
                    updateField('district', event.target.value)
                  }
                  placeholder="Enter district"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="addressLine" className="text-sm font-medium">
                  Full Address
                </label>
                <textarea
                  id="addressLine"
                  required
                  rows={3}
                  value={form.addressLine}
                  onChange={(event) =>
                    updateField('addressLine', event.target.value)
                  }
                  placeholder="House, road, area, landmark..."
                  className="w-full rounded-lg border bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium">
                  City
                </label>
                <input
                  id="city"
                  required
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  placeholder="Enter city"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="postalCode" className="text-sm font-medium">
                  Postal Code (Optional)
                </label>
                <input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(event) =>
                    updateField('postalCode', event.target.value)
                  }
                  placeholder="Enter postal code"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? 'Saving...'
                  : editingAddress
                    ? 'Update Address'
                    : 'Save Address'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingAddress(null)
                  setForm(emptyForm)
                }}
                className="cursor-pointer rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {isLoading ? (
        <div className="rounded-xl border bg-background p-10 text-center text-sm text-muted-foreground">
          Loading addresses...
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background p-10 text-center">
          <h3 className="font-semibold">No saved addresses</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first address to use it when creating shipments.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-5 cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((address) => (
            <article
              key={address.id}
              className="rounded-xl border bg-background p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{address.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Saved address
                  </p>
                </div>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Address
                </span>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <p className="text-foreground">{address.addressLine}</p>
                <p className="text-muted-foreground">
                  {address.city}, {address.district}
                  {address.postalCode ? ` - ${address.postalCode}` : ''}
                </p>
              </div>

              <div className="mt-5 flex gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => openEditForm(address)}
                  className="cursor-pointer text-sm font-medium text-primary hover:underline"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => void handleDelete(address)}
                  disabled={deletingId === address.id}
                  className="cursor-pointer text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === address.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
