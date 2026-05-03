'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Loader2, Mail, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false)

  const { register, user } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()

  // If already logged in, redirect to app
  useEffect(() => {
    if (user) {
      router.replace('/app')
    }
  }, [router, user])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters', type: 'error' })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await register(email, password, name)

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          // Supabase sent a confirmation email — tell the user instead of redirecting
          setEmailConfirmationSent(true)
          toast({
            title: 'Check your email!',
            description: `We sent a confirmation link to ${email}`,
            type: 'success',
          })
        } else {
          // Immediate login — redirect to app
          toast({ title: 'Account created!', description: 'Welcome to ExamHelper AI', type: 'success' })
          router.push('/app')
        }
      } else {
        toast({
          title: 'Registration failed',
          description: result.error || 'Something went wrong. Please try again.',
          type: 'error',
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      toast({ title: 'Error', description: msg, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Email confirmation sent state ────────────────────────────────────────────
  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Check your inbox</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Account created successfully!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the link in your email to verify your account and start studying.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Didn&apos;t get the email? Check your spam folder or{' '}
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  setEmailConfirmationSent(false)
                  setPassword('')
                }}
              >
                try again
              </button>
              .
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </Link>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Start your AI-powered study journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
