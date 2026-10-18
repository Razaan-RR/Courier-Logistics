'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreSession, useAuthStore } from '@/store/auth.store'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      const currentUser = useAuthStore.getState().user

      if (currentUser) {
        if (active) setIsChecking(false)
        return
      }

      const restored = await restoreSession()

      if (!active) return

      if (!restored) {
        router.replace('/login')
        return
      }

      setIsChecking(false)
    }

    checkSession()

    return () => {
      active = false
    }
  }, [router])

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Please wait...</p>
      </main>
    )
  }

  return <>{children}</>
}
