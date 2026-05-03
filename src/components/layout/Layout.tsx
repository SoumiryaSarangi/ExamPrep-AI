'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { path: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/app/courses', icon: BookOpen, label: 'Courses' },
  { path: '/app/upload', icon: Upload, label: 'Upload' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    <div className="min-h-screen bg-background">
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <Link href="/app" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg">ExamHelper AI</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen((prev) => !prev)}>
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <div className="flex">
        <aside
          className={`
          fixed lg:sticky top-0 inset-y-0 left-0 z-40
          w-64 bg-card border-r flex flex-col h-screen
          transform lg:transform-none transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        >
          <div className="hidden lg:flex items-center gap-2 p-6 border-b shrink-0">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">ExamHelper AI</span>
          </div>

          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${
                    isActive(item.path, item.exact)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t mt-auto shrink-0 bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-medium">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || user?.email || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.isDemo ? 'Demo Mode' : user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)] overflow-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
