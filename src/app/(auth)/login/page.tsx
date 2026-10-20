'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('')
    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', values)
      const { user, accessToken } = response.data.data

      setAuth(user, accessToken)

      if (user.role === 'ADMIN') {
        router.push('/admin')
      } else if (user.role === 'COURIER') {
        router.push('/courier')
      } else {
        router.push('/customer')
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = error.response

        if (
          typeof response === 'object' &&
          response !== null &&
          'data' in response &&
          typeof response.data === 'object' &&
          response.data !== null &&
          'message' in response.data &&
          typeof response.data.message === 'string'
        ) {
          setServerError(response.data.message)
        } else {
          setServerError('Unable to sign in. Please try again.')
        }
      } else {
        setServerError('Unable to connect to the server.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Courier & Logistics
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your shipments
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
              placeholder="you@example.com"
              className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
              placeholder="Enter your password"
              className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.password && (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full cursor-pointer rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">DEMO ACCESS</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              fillDemoCredentials('admin@courier.com', 'Admin@123456')
            }
            className="cursor-pointer rounded-md border px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() =>
              fillDemoCredentials('customer@test.com', 'Password123')
            }
            className="cursor-pointer rounded-md border px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() =>
              fillDemoCredentials('courier@courier.com', 'Courier@123456')
            }
            className="cursor-pointer rounded-md border px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Courier
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure access for customers, couriers, and administrators
        </p>
      </section>
    </main>
  )
}
