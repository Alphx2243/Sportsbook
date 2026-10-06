'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chrome } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getDefaultRouteForRole } from '@/lib/roles'

const errors: Record<string, string> = {
  google: 'Google sign-in failed. Try again.',
  domain: 'Use your IIIT Delhi Google account.',
}

export default function AuthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) router.push(getDefaultRouteForRole(user.role))
  }, [user, router])

  useEffect(() => {
    setError(new URLSearchParams(window.location.search).get('error'))
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-16">
      <Card className="w-full max-w-md border-white/10 shadow-2xl bg-card/40 backdrop-blur-xl">
        <CardHeader className="text-center border-b border-border/50">
          <CardTitle className="text-3xl font-bold text-gradient-premium">SportsBook</CardTitle>
          <p className="text-muted-foreground mt-2">Sign in with your IIIT Delhi Google account</p>
        </CardHeader>
        <CardContent className="p-8 space-y-5">
          {error && <p className="text-sm text-destructive text-center">{errors[error] || errors.google}</p>}
          <Button
            type="button"
            variant="primary"
            disabled={loading}
            onClick={() => { window.location.href = '/api/auth/google' }}
            className="w-full h-12 gap-3 text-base font-semibold"
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
