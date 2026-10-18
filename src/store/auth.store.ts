import { create } from 'zustand'

export type UserRole = 'CUSTOMER' | 'COURIER' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))

export const restoreSession = async () => {
  try {
    const response = await import('@/lib/api').then(({ api }) =>
      api.post('/auth/refresh-token'),
    )

    const { user, accessToken } = response.data.data

    useAuthStore.getState().setAuth(user, accessToken)

    return true
  } catch {
    useAuthStore.getState().clearAuth()
    return false
  }
}

export const logoutUser = async () => {
  try {
    const { api } = await import('@/lib/api')
    await api.post('/auth/logout')
  } catch (error) {
    console.error('Logout failed:', error)
  } finally {
    useAuthStore.getState().clearAuth()
    window.location.replace('/login')
  }
}
