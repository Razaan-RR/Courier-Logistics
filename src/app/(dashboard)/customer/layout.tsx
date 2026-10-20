'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { restoreSession, useAuthStore, logoutUser } from '@/store/auth.store'

const navigation = [
  { label: 'Overview', icon: '▦', href: '/customer' },
  { label: 'My Shipments', icon: '▤', href: '/customer/shipments' },
  { label: 'Create Shipment', icon: '+', href: '/customer/shipments/create' },
]

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme')
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      localStorage.setItem('admin-theme', next ? 'dark' : 'light')
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      let token = accessToken

      if (!token) {
        await restoreSession()
        token = useAuthStore.getState().accessToken
      }

      if (cancelled) return

      if (!token) {
        router.replace('/login')
        return
      }

      const currentUser = useAuthStore.getState().user

      if (currentUser?.role && currentUser.role !== 'CUSTOMER') {
        router.replace(
          currentUser.role === 'ADMIN'
            ? '/admin'
            : currentUser.role === 'COURIER'
              ? '/courier'
              : '/login',
        )
        return
      }

      setReady(true)
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [accessToken, router])

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current
      localStorage.setItem('admin-theme', next ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  const handleLogout = async () => {
    await logoutUser()
    router.replace('/login')
  }

  const activeItem =
    navigation.find(
      (item) =>
        pathname === item.href ||
        (item.href !== '/customer' && pathname.startsWith(item.href)),
    ) ?? navigation[0]

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading your workspace…
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f5f7fb] text-slate-800'}`}
    >
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white text-slate-800 transition-transform dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[82px] shrink-0 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-black text-white shadow-lg shadow-indigo-500/30">
            D
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">Delivo</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Logistics platform
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="ml-auto cursor-pointer text-xl lg:hidden"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const active = activeItem.href === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:bg-indigo-500'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${active ? 'bg-white/15' : 'bg-slate-100 dark:bg-slate-800'}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>


        <div className="mt-auto p-4">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">Delivery updates</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Track your packages and stay informed about their progress.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500 dark:text-white">
              {user?.name?.charAt(0).toUpperCase() ?? 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.name ?? 'Customer'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              className="cursor-pointer rounded-xl border border-slate-200 p-2 text-xl dark:border-slate-700 lg:hidden"
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-400">
                Workspace /{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {activeItem.label}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Customer workspace
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {user?.name?.charAt(0).toUpperCase() ?? 'C'}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-10">
          {children}
          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row">
            <p>© 2026 Delivo Logistics. Customer workspace.</p>
            <p>
              Built for smarter deliveries{' '}
              <span className="text-indigo-500">◆</span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
