'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { logoutUser } from '@/store/auth.store'

export default function AdminPage() {
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  const handleLogout = async () => {
    await logoutUser()
    router.replace('/login')
  }

  return (
    <main className="flex items-center justify-between p-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome, {user?.name ?? 'Admin'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Role: {user?.role ?? 'Not available'}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="cursor-pointer rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Logout
      </button>
    </main>
  )
}
