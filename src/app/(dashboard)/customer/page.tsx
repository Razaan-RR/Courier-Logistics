'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export default function CustomerPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (user && user.role !== 'CUSTOMER') {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/courier')
    }
  }, [user, router])

  if (!user || user.role !== 'CUSTOMER') {
    return null
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Customer Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome, {user.name}</p>
    </main>
  )
}
