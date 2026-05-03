import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ── Startup diagnostics ──────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  // Only log in the browser, not during SSR/build
  console.log('[Supabase] URL configured    :', !!supabaseUrl, supabaseUrl ? `→ ${supabaseUrl}` : '')
  console.log('[Supabase] Key configured    :', !!supabaseAnonKey)

  if (supabaseAnonKey) {
    if (supabaseAnonKey.startsWith('eyJ')) {
      console.log('[Supabase] Key format        : JWT (legacy) ✓')
    } else if (supabaseAnonKey.startsWith('sb_publishable_')) {
      console.log('[Supabase] Key format        : Publishable Key (new format)')
      console.log('[Supabase] ⚠  Publishable Keys require @supabase/supabase-js ≥ 2.46.0')
      console.log('[Supabase]    If requests hang, run: npm install @supabase/supabase-js@latest')
      console.log('[Supabase]    Or use the JWT anon key from Supabase → Settings → API → Legacy Keys')
    } else {
      console.warn('[Supabase] ⚠  Key format unrecognised — auth requests may fail')
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Credentials missing — running in demo mode')
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// Demo mode when Supabase is not configured
export const isDemoMode = !supabase
