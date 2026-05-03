import type { Metadata } from 'next'
import './globals.css'
import { ToasterProvider } from '@/components/providers/ToasterProvider'

export const metadata: Metadata = {
  title: 'ExamHelper AI',
  description: 'AI-powered study materials from lecture content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <ToasterProvider />
      </body>
    </html>
  )
}