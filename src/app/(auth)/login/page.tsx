'use client'
import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center bg-sand-50">
        <p className="text-espresso-muted text-sm">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
