'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { useCourseStore } from '@/stores/courseStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useMaterialStore } from '@/stores/materialStore'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  LayoutGrid,
  Brain,
  Upload,
  BookOpen,
  Clock,
  Flame,
} from 'lucide-react'

interface DashboardStats {
  notes: number
  flashcards: number
  quizzes: number
  streak: number
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { courses, fetchCourses } = useCourseStore()
  const { fetchDocuments } = useDocumentStore()
  const { materials, fetchMaterials } = useMaterialStore()
  const [stats, setStats] = useState<DashboardStats>({ notes: 0, flashcards: 0, quizzes: 0, streak: 0 })

  useEffect(() => {
    fetchCourses()
    fetchDocuments()
    fetchMaterials()

    const calculateStats = async () => {
      const allMaterials = await db.materials.toArray()
      const notes = allMaterials.filter((m: any) => m.type === 'notes').length
      const flashcardSets = allMaterials.filter((m: any) => m.type === 'flashcards').length
      const quizzes = allMaterials.filter((m: any) => m.type === 'quiz').length

      const sessions = await db.studySessions.toArray()
      const streak = sessions.length > 0 ? Math.min(sessions.length, 7) : 0

      setStats({ notes, flashcards: flashcardSets, quizzes, streak })
    }

    calculateStats()
  }, [fetchCourses, fetchDocuments, fetchMaterials])

  const statCards = [
    { icon: FileText, label: 'Notes', value: stats.notes, color: 'text-blue-500' },
    { icon: LayoutGrid, label: 'Flashcard Sets', value: stats.flashcards, color: 'text-purple-500' },
    { icon: Brain, label: 'Quizzes', value: stats.quizzes, color: 'text-green-500' },
    { icon: Flame, label: 'Day Streak', value: stats.streak, color: 'text-orange-500' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Student'}!</h1>
        <p className="text-muted-foreground mt-1">Ready to ace your exams? Let's get studying.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-10 w-10 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Quick Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Upload lecture slides or PDFs to generate study materials.</p>
            <Button asChild className="w-full">
              <Link href="/app/upload">Upload Files</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Your Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {courses.length > 0
                ? `You have ${courses.length} course(s). Keep studying!`
                : 'Create your first course to organize your materials.'}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/app/courses">{courses.length > 0 ? 'View Courses' : 'Create Course'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Study Materials
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length > 0 ? (
            <div className="space-y-3">
              {materials.slice(0, 5).map((material: any) => (
                <Link
                  key={material.id}
                  href={`/app/${material.type}/${material.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  {material.type === 'notes' && <FileText className="h-5 w-5 text-blue-500" />}
                  {material.type === 'flashcards' && <LayoutGrid className="h-5 w-5 text-purple-500" />}
                  {material.type === 'quiz' && <Brain className="h-5 w-5 text-green-500" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{material.content?.title || `${material.type} - ${material.id}`}</p>
                    <p className="text-sm text-muted-foreground">{new Date(material.generatedAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No study materials yet.</p>
              <p className="text-sm">Upload a document to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
