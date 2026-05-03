'use client'

import { create } from 'zustand'
import { supabase, isDemoMode } from '../lib/supabase'

// Demo user for when Supabase is not configured
const demoUser = {
  id: 'demo-user-123',
  email: 'demo@examhelper.ai',
  name: 'Demo User',
  isDemo: true
}

interface AuthUser {
  id: string
  email?: string
  name?: string
  isDemo?: boolean
}

interface AuthResult {
  success: boolean
  error?: string
  requiresEmailConfirmation?: boolean
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthResult>
  register: (email: string, password: string, name: string) => Promise<AuthResult>
  logout: () => Promise<void>
  clearError: () => void
}

/** Wraps a promise with a timeout so we never hang indefinitely */
function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timed out after ${ms / 1000}s. Check your connection and Supabase credentials.`)),
        ms
      )
    ),
  ])
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    if (isDemoMode) {
      console.log('[Auth] Demo mode active — no Supabase credentials found')
      set({ user: demoUser, loading: false })
      return
    }

    console.log('[Auth] Initializing session...')
    try {
      const { data: { session }, error } = await withTimeout(supabase!.auth.getSession())
      if (error) console.error('[Auth] getSession error:', error.message)
      console.log('[Auth] Session found:', !!session)
      set({ user: session?.user ?? null, loading: false })

      supabase!.auth.onAuthStateChange((_event, session) => {
        console.log('[Auth] Auth state changed:', _event)
        set({ user: session?.user ?? null })
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Auth] Initialization failed:', msg)
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    if (isDemoMode) {
      console.log('[Auth] Demo login')
      set({ user: demoUser, error: null, loading: false })
      return { success: true }
    }

    console.log('[Auth] Attempting login for:', email)
    set({ loading: true, error: null })
    try {
      const { data, error } = await withTimeout(
        supabase!.auth.signInWithPassword({ email, password })
      )

      console.log('[Auth] Login response — user:', data?.user?.id ?? null, 'error:', error?.message ?? null)

      if (error) throw error

      set({ user: data.user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Auth] Login failed:', msg)
      set({ error: msg, loading: false })
      return { success: false, error: msg }
    } finally {
      // Safety net: ensure loading is always reset even if something unexpected throws
      set((state) => ({ loading: state.loading ? false : state.loading }))
    }
  },

  register: async (email, password, name) => {
    if (isDemoMode) {
      console.log('[Auth] Demo register')
      set({ user: { ...demoUser, email, name }, error: null, loading: false })
      return { success: true }
    }

    console.log('[Auth] Attempting signup for:', email)
    set({ loading: true, error: null })

    try {
      const { data, error } = await withTimeout(
        supabase!.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
      )

      console.log('[Auth] Signup response:')
      console.log('  user id   :', data?.user?.id ?? null)
      console.log('  session   :', data?.session ? 'present' : 'null (email confirmation required?)')
      console.log('  error     :', error?.message ?? null)

      if (error) throw error

      // Supabase returns user but NO session when email confirmation is required
      if (data.user && !data.session) {
        console.log('[Auth] Email confirmation required — not logging user in yet')
        set({ loading: false })
        return { success: true, requiresEmailConfirmation: true }
      }

      // Immediate session (email confirmation disabled in Supabase dashboard)
      if (data.user && data.session) {
        console.log('[Auth] Signup complete with immediate session')
        set({ user: data.user, loading: false })
        return { success: true }
      }

      // Unexpected: no user and no error
      throw new Error('Signup did not return a user. Please try again.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Auth] Register failed:', msg)
      set({ error: msg, loading: false })
      return { success: false, error: msg }
    } finally {
      // Safety net: ensure loading ALWAYS resets, no matter what
      set((state) => ({ loading: state.loading ? false : state.loading }))
    }
  },

  logout: async () => {
    if (isDemoMode) {
      set({ user: null })
      return
    }
    await supabase!.auth.signOut()
    set({ user: null })
  },

  clearError: () => set({ error: null }),
}))
