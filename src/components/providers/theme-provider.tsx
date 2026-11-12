'use client'

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react'

type Theme = 'dark' | 'light'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function getTheme(): Theme {
  return localStorage.getItem('admin-theme') === 'light' ? 'light' : 'dark'
}

function getServerTheme(): Theme {
  return 'dark'
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('theme-change', callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('theme-change', callback)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark'

    localStorage.setItem('admin-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    window.dispatchEvent(new Event('theme-change'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
