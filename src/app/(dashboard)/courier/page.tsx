'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export default function CourierPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (user && user.role !== 'COURIER') {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/customer')
    }
  }, [user, router])

  if (!user || user.role !== 'COURIER') {
    return null
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Courier Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome, {user.name}</p>
    </main>
  )
}
