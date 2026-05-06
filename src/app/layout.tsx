import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToasterProvider } from '@/components/providers/ToasterProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SenseiAI',
  description: 'AI-powered study materials from lecture content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased font-[family-name:var(--font-inter)]">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ToasterProvider />
      </body>
    </html>
  )
}