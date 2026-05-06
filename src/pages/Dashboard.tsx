'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useCourseStore } from '@/stores/courseStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useMaterialStore } from '@/stores/materialStore'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonListItem } from '@/components/ui/skeleton'
import {
  FileText, LayoutGrid, Brain, Upload, BookOpen, Clock, Flame, ArrowRight, Sparkles,
} from 'lucide-react'

interface DashboardStats { notes: number; flashcards: number; quizzes: number; streak: number }

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { courses, fetchCourses } = useCourseStore()
  const { fetchDocuments } = useDocumentStore()
  const { materials, fetchMaterials, loading: materialsLoading } = useMaterialStore()
  const [stats, setStats] = useState<DashboardStats>({ notes: 0, flashcards: 0, quizzes: 0, streak: 0 })

  useEffect(() => {
    fetchCourses(); fetchDocuments(); fetchMaterials()
    const calculateStats = async () => {
      const allMaterials = await db.materials.toArray()
      const notes = allMaterials.filter((m: any) => m.type === 'notes').length
      const flashcardSets = allMaterials.filter((m: any) => m.type === 'flashcards').length
      const quizzes = allMaterials.filter((m: any) => m.type === 'quiz').length
      const allAttempts = await db.quizAttempts.toArray()
      let streak = 0
      if (allAttempts.length > 0) {
        const dates = allAttempts.map(a => new Date(a.attemptedAt).toISOString().split('T')[0])
        const uniqueDates = [...new Set(dates)].sort().reverse()
        if (uniqueDates.length > 0) {
          const today = new Date().toISOString().split('T')[0]
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
          if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
            streak = 1; let current = new Date(uniqueDates[0])
            for (let i = 1; i < uniqueDates.length; i++) {
              const prev = new Date(uniqueDates[i])
              if (Math.round((current.getTime() - prev.getTime()) / 86400000) === 1) { streak++; current = prev } else break
            }
          }
        }
      }
      setStats({ notes, flashcards: flashcardSets, quizzes, streak })
    }
    calculateStats()
  }, [fetchCourses, fetchDocuments, fetchMaterials])

  const statCards = [
    { icon: FileText, label: 'Notes', value: stats.notes, color: 'text-[hsl(var(--accent-blue))]', bg: 'bg-[hsl(var(--accent-blue))]/10' },
    { icon: LayoutGrid, label: 'Flashcard Sets', value: stats.flashcards, color: 'text-[hsl(var(--accent-purple))]', bg: 'bg-[hsl(var(--accent-purple))]/10' },
    { icon: Brain, label: 'Quizzes', value: stats.quizzes, color: 'text-[hsl(var(--accent-green))]', bg: 'bg-[hsl(var(--accent-green))]/10' },
    { icon: Flame, label: 'Day Streak', value: stats.streak, color: 'text-[hsl(var(--accent-amber))]', bg: 'bg-[hsl(var(--accent-amber))]/10' },
  ]

  const getMatIcon = (type: string) => {
    if (type === 'notes') return <FileText className="h-4 w-4 text-[hsl(var(--accent-blue))]" />
    if (type === 'flashcards') return <LayoutGrid className="h-4 w-4 text-[hsl(var(--accent-purple))]" />
    return <Brain className="h-4 w-4 text-[hsl(var(--accent-green))]" />
  }
  const getMatBg = (type: string) => {
    if (type === 'notes') return 'bg-[hsl(var(--accent-blue))]/10'
    if (type === 'flashcards') return 'bg-[hsl(var(--accent-purple))]/10'
    return 'bg-[hsl(var(--accent-green))]/10'
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm text-primary font-medium">Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold">
          Welcome back, {(user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.name || user?.email?.split('@')[0] || 'Student'}!
        </h1>
        <p className="text-muted-foreground mt-1">Ready to ace your exams? Let&apos;s get studying.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={stat.label} className={`group animate-fade-in stagger-${i + 1}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="animate-fade-in group" style={{ animationDelay: '0.15s' }}>
          <CardHeader><CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Upload className="h-4 w-4 text-primary" /></div>
            Quick Upload
          </CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">Upload lecture slides or PDFs to generate study materials.</p>
            <Button asChild className="w-full gap-2"><Link href="/app/upload">Upload Files <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></Button>
          </CardContent>
        </Card>
        <Card className="animate-fade-in group" style={{ animationDelay: '0.2s' }}>
          <CardHeader><CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--accent-purple))]/10 flex items-center justify-center"><BookOpen className="h-4 w-4 text-[hsl(var(--accent-purple))]" /></div>
            Your Courses
          </CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">{courses.length > 0 ? `You have ${courses.length} course(s). Keep studying!` : 'Create your first course to organize your materials.'}</p>
            <Button asChild variant="outline" className="w-full gap-2"><Link href="/app/courses">{courses.length > 0 ? 'View Courses' : 'Create Course'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
        <CardHeader><CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--accent-blue))]/10 flex items-center justify-center"><Clock className="h-4 w-4 text-[hsl(var(--accent-blue))]" /></div>
          Recent Study Materials
        </CardTitle></CardHeader>
        <CardContent>
          {materialsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonListItem key={i} />
              ))}
            </div>
          ) : materials.length > 0 ? (
            <div className="space-y-2">
              {materials.slice(0, 5).map((material: any, index: number) => (
                <Link key={material.id} href={`/app/${material.type}/${material.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-250 group/item animate-fade-in stagger-${index + 1}`}>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${getMatBg(material.type)}`}>{getMatIcon(material.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{material.content?.title || `${material.type} - ${material.id}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(material.generatedAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-all" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No study materials yet"
              description="Upload a document to generate your first set of AI-powered notes, flashcards, and quizzes."
              actionLabel="Upload Files"
              onAction={() => router.push('/app/upload')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
