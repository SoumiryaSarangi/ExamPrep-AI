'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  LogOut,
  GraduationCap,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/utils/cn'

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/app/courses', icon: BookOpen, label: 'Courses' },
  { path: '/app/upload', icon: Upload, label: 'Upload' },
]

const SIDEBAR_KEY = 'examhelper-sidebar-collapsed'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Restore collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY)
      if (saved === 'true') setCollapsed(true)
    } catch { }
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_KEY, String(next))
    } catch { }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const isActive = (path: string, exact = false) => {
    if (!pathname) return false
    if (exact) return pathname === path
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-background noise-overlay ambient-glow">
      {/* ─── Mobile header ─── */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b glass-subtle">
        <Link href="/app" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg">SenseiAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen((prev) => !prev)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* ─── Sidebar ─── */}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50',
            'flex flex-col h-screen glass',
            'transform lg:transform-none transition-all duration-300 ease-in-out',
            // Mobile: slide in/out
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            // Desktop: expand/collapse
            collapsed ? 'lg:w-[var(--sidebar-collapsed-width)]' : 'lg:w-[var(--sidebar-width)]',
            // Mobile always full width sidebar
            'w-[var(--sidebar-width)]',
          )}
        >
          {/* ─── Logo area ─── */}
          <div className={cn(
            "hidden lg:flex items-center border-b border-white/[0.06] shrink-0 transition-all duration-300",
            collapsed ? "justify-center p-3" : "p-5 gap-3"
          )}>
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 animate-glow-pulse">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span
              className={cn(
                'font-bold text-lg whitespace-nowrap transition-all duration-300 overflow-hidden',
                collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
              )}
            >
              SenseiAI
            </span>
          </div>

          {/* ─── Collapse toggle (desktop only) ─── */}
          <div className={cn(
            "hidden lg:flex items-center py-2 shrink-0 transition-all duration-300",
            collapsed ? "justify-center px-0" : "justify-end px-3"
          )}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* ─── Navigation ─── */}
          <nav className="px-3 space-y-1 flex-1 overflow-y-auto py-2">
            {navItems.map((item, index) => {
              const active = isActive(item.path, item.exact)
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex items-center rounded-xl transition-all duration-250 relative',
                    collapsed ? 'p-2 justify-center' : 'p-2 pr-4',
                    active
                      ? 'bg-primary/15 text-primary shadow-[0_0_16px_-4px_hsl(var(--primary)/0.25)]'
                      : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                    `animate-slide-in-left stagger-${index + 1}`,
                  )}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                  )}
                  <div className="flex items-center justify-center shrink-0 w-10 h-10">
                    <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "group-hover:text-foreground")} />
                  </div>
                  <span
                    className={cn(
                      'whitespace-nowrap transition-all duration-300 overflow-hidden font-medium',
                      collapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* ─── Bottom section ─── */}
          <div className="mt-auto shrink-0 border-t border-white/[0.06]">
            {/* Theme toggle */}
            <div className={cn('flex items-center px-3 py-2', collapsed ? 'justify-center' : 'justify-start')}>
              <ThemeToggle collapsed={collapsed} className="hidden lg:flex" />
              {!collapsed && (
                <span className="text-xs text-muted-foreground ml-2 hidden lg:inline">Toggle theme</span>
              )}
            </div>

            {/* User info */}
            <div className={cn('p-3', collapsed ? 'flex flex-col items-center gap-2' : '')}>
              <div className={cn('flex items-center', collapsed ? 'flex-col justify-center gap-0' : 'gap-3')}>
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                  <span className="text-primary font-semibold text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex-1 min-w-0 transition-all duration-300 overflow-hidden',
                    collapsed ? 'w-0 h-0 opacity-0 m-0' : 'opacity-100',
                  )}
                >
                  <p className="text-sm font-medium truncate">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.isDemo ? 'Demo Mode' : user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className={cn(
                  'w-full mt-2 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-250',
                  collapsed ? 'justify-center px-0' : 'justify-start',
                )}
                onClick={handleLogout}
                title={collapsed ? 'Sign Out' : undefined}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    'whitespace-nowrap transition-all duration-300 overflow-hidden',
                    collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                  )}
                >
                  Sign Out
                </span>
              </Button>
            </div>
          </div>
        </aside>

        {/* ─── Mobile backdrop ─── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ─── Main content ─── */}
        <main
          className={cn(
            'flex-1 min-h-screen overflow-auto transition-all duration-300 ease-in-out',
            collapsed ? 'lg:ml-[var(--sidebar-collapsed-width)]' : 'lg:ml-[var(--sidebar-width)]'
          )}
        >
          <div className="container mx-auto p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
