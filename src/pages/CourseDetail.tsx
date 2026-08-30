'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCourseStore } from '@/stores/courseStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useMaterialStore } from '@/stores/materialStore'
import { db, type WeakAreaRecord } from '@/lib/db'
import { generateWeakAreaQuiz } from '@/lib/ai/aiService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton, SkeletonListItem, SkeletonStatCard } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Upload,
  FileText,
  LayoutGrid,
  Brain,
  Trash2,
  Eye,
  Sparkles,
  Flame,
  CheckCircle,
  BarChart3,
  Shield,
  AlertTriangle,
  Target,
  Zap,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface QuizAttemptWithMeta {
  id: number
  materialId: number
  score: number
  total: number
  percent: number
  attemptedAt: string
  quizTitle: string
}

interface NotesProgress {
  materialId: number
  title: string
  generated: number
  total: number
}

// ─────────────────────────────────────────────
// Progress Ring
// ─────────────────────────────────────────────

function ProgressRing({ percent }: { percent: number }) {
  const size = 88
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference) // start at 0%

  useEffect(() => {
    // Defer to next frame so transition fires
    const id = requestAnimationFrame(() => {
      const clampedPct = Math.max(0, Math.min(percent, 100))
      setOffset(circumference - (clampedPct / 100) * circumference)
    })
    return () => cancelAnimationFrame(id)
  }, [percent, circumference])

  const color =
    percent <= 40 ? 'hsl(var(--accent-red))' :
      percent <= 70 ? 'hsl(var(--accent-amber))' :
        'hsl(var(--accent-green))'

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/25"
        />
        {/* Arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Center text — counter-rotate so it reads upright */}
        <text
          x="50%" y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontWeight="700"
          fontSize="18"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {percent}%
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function CourseDetail() {
  const params = useParams<{ courseId: string }>()
  const courseId = Number(params?.courseId || 0)
  const router = useRouter()
  const { currentCourse, getCourse } = useCourseStore()
  const { documents, fetchDocuments, deleteDocument } = useDocumentStore()
  const { materials, fetchMaterials, addMaterial } = useMaterialStore()
  const { toast } = useToast()
  const [courseDocuments, setCourseDocuments] = useState<any[]>([])
  const [courseMaterials, setCourseMaterials] = useState<any[]>([])
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptWithMeta[]>([])

  useEffect(() => {
    if (!Number.isFinite(courseId)) return
    getCourse(courseId)
    fetchDocuments(courseId)
    fetchMaterials()
  }, [courseId, fetchDocuments, fetchMaterials, getCourse])

  useEffect(() => {
    setCourseDocuments(documents.filter((d: any) => d.courseId === courseId))
  }, [documents, courseId])

  useEffect(() => {
    const docIds = courseDocuments.map((d) => d.id)
    setCourseMaterials(materials.filter((m: any) => docIds.includes(m.documentId)))
  }, [materials, courseDocuments])

  // Fetch quiz attempts for this course's quizzes
  useEffect(() => {
    const loadAttempts = async () => {
      const quizMats = courseMaterials.filter((m) => m.type === 'quiz')
      if (quizMats.length === 0) { setQuizAttempts([]); return }

      const allAttempts = await db.quizAttempts.toArray()
      const mapped: QuizAttemptWithMeta[] = []

      for (const attempt of allAttempts) {
        const quiz = quizMats.find((q) => q.id === attempt.materialId)
        if (!quiz) continue

        const total = quiz.content?.questions?.length || 15
        const percent = attempt.score // score is saved as a percentage in Quiz.tsx
        const rawScore = Math.round((percent / 100) * total)

        mapped.push({
          id: attempt.id!,
          materialId: attempt.materialId,
          score: rawScore,
          total,
          percent,
          attemptedAt: attempt.attemptedAt,
          quizTitle: quiz.content?.title || `Quiz #${quiz.id}`,
        })
      }

      // Sort newest first
      mapped.sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())
      setQuizAttempts(mapped)
    }

    loadAttempts()
  }, [courseMaterials])

  // Fetch weak areas for this course
  const [weakAreas, setWeakAreas] = useState<WeakAreaRecord[]>([])
  const [generatingWeakQuiz, setGeneratingWeakQuiz] = useState(false)

  useEffect(() => {
    const loadWeakAreas = async () => {
      if (!courseId) return
      const all = await db.weakAreas.filter((w) => w.courseId === courseId).toArray()
      // Sort by worst (highest wrong %) first
      all.sort((a, b) => {
        const pctA = a.totalAttempts > 0 ? a.wrongCount / a.totalAttempts : 0
        const pctB = b.totalAttempts > 0 ? b.wrongCount / b.totalAttempts : 0
        return pctB - pctA
      })
      setWeakAreas(all)
    }
    loadWeakAreas()
  }, [courseId, quizAttempts]) // re-load when quizAttempts change (new quiz taken)

  const handlePracticeWeakAreas = async () => {
    const topWeakTopics = weakAreas
      .filter((w) => w.totalAttempts > 0 && (w.wrongCount / w.totalAttempts) > 0.3)
      .slice(0, 5)
      .map((w) => w.topic)

    if (topWeakTopics.length === 0) {
      toast({ title: 'No weak topics', description: 'Complete more quizzes first.', type: 'error' })
      return
    }

    // Find first document with text
    const doc = courseDocuments.find((d) => d.extractedText)
    if (!doc) {
      toast({ title: 'No documents', description: 'Upload a document first.', type: 'error' })
      return
    }

    try {
      setGeneratingWeakQuiz(true)
      toast({ title: 'Generating...', description: 'Creating quiz for your weak topics' })

      const quizData = await generateWeakAreaQuiz(doc.extractedText, doc.filename, topWeakTopics)

      if (!quizData.questions || quizData.questions.length === 0) {
        throw new Error('No questions generated')
      }

      const result = await addMaterial({
        documentId: doc.id,
        type: 'quiz',
        content: quizData,
      })

      if (result.success && result.material) {
        toast({ title: 'Quiz created!', description: 'Starting your weak area practice quiz.', type: 'success' })
        router.push(`/app/quiz/${result.material.id}`)
      }
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message || 'Unknown error', type: 'error' })
    } finally {
      setGeneratingWeakQuiz(false)
    }
  }

  const handleDeleteDoc = async (id: number) => {
    if (window.confirm('Delete this document and its materials?')) {
      await deleteDocument(id)
      toast({ title: 'Document deleted', type: 'success' })
    }
  }

  // Create an empty flashcard material for a document and navigate to it
  const handleGenerateFlashcards = async () => {
    if (courseDocuments.length === 0) {
      toast({ title: 'No documents', description: 'Upload a document first.', type: 'error' })
      return
    }
    const doc = courseDocuments[0]
    const result = await addMaterial({
      documentId: doc.id,
      type: 'flashcards',
      content: { title: `Flashcards: ${doc.filename?.replace(/\.[^/.]+$/, '')}`, cards: [] },
    })
    if (result.success && result.material) {
      router.push(`/app/flashcards/${result.material.id}`)
    }
  }

  if (!currentCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const notes = courseMaterials.filter((m) => m.type === 'notes')
  const flashcards = courseMaterials.filter((m) => m.type === 'flashcards')
  const quizzes = courseMaterials.filter((m) => m.type === 'quiz')

  // ─────────────────────────────────────────────
  // Progress calculations
  // ─────────────────────────────────────────────

  // Notes progress per document
  const notesProgressList: NotesProgress[] = notes.map((n) => {
    const sections = n.content?.sections || []
    const genSections = n.content?.generatedSections || {}
    const generated = Object.keys(genSections).filter((k) => genSections[k]).length
    return {
      materialId: n.id,
      title: n.content?.title || `Notes #${n.id}`,
      generated,
      total: sections.length || 1,
    }
  })

  const totalSections = notesProgressList.reduce((s, n) => s + n.total, 0)
  const completedSections = notesProgressList.reduce((s, n) => s + n.generated, 0)

  // Quiz average
  const avgQuizScore = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((s, a) => s + a.percent, 0) / quizAttempts.length)
    : 0

  // Overall completion %
  const overallPercent = totalSections > 0
    ? Math.round((completedSections / totalSections) * 100)
    : 0

  // Flashcards with cards
  const flashcardsStudied = flashcards.reduce((s, f) => s + (f.content?.cards?.length || 0), 0)

  // Calculate actual study streak (consecutive days) based on quiz attempts
  let studyStreak = 0
  if (quizAttempts.length > 0) {
    const dates = quizAttempts.map(a => new Date(a.attemptedAt).toISOString().split('T')[0])
    const uniqueDates = [...new Set(dates)].sort().reverse()

    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        studyStreak = 1
        let current = new Date(uniqueDates[0])
        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(uniqueDates[i])
          const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000)
          if (diffDays === 1) {
            studyStreak++
            current = prev
          } else {
            break
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/app/courses')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{currentCourse.courseCode}</h1>
            <p className="text-muted-foreground">{currentCourse.courseName}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/app/courses/${courseId}/tutor`} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Ask Course Tutor
          </Link>
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent-blue))]/10 flex items-center justify-center mb-2"><FileText className="h-5 w-5 text-[hsl(var(--accent-blue))]" /></div>
            <p className="text-2xl font-bold">{notes.length}</p>
            <p className="text-sm text-muted-foreground">Notes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent-purple))]/10 flex items-center justify-center mb-2"><LayoutGrid className="h-5 w-5 text-[hsl(var(--accent-purple))]" /></div>
            <p className="text-2xl font-bold">{flashcards.length}</p>
            <p className="text-sm text-muted-foreground">Flashcards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent-green))]/10 flex items-center justify-center mb-2"><Brain className="h-5 w-5 text-[hsl(var(--accent-green))]" /></div>
            <p className="text-2xl font-bold">{quizzes.length}</p>
            <p className="text-sm text-muted-foreground">Quizzes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="flex justify-center mb-2"><ProgressRing percent={overallPercent} /></div>
            <p className="text-sm text-muted-foreground">Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents ({courseDocuments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards ({flashcards.length})</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes ({quizzes.length})</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          {courseDocuments.length > 0 ? (
            <div className="space-y-3">
              {courseDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.fileType} | Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                <Button asChild>
                  <Link href="/app/upload">Upload Documents</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <MaterialList materials={notes} type="notes" />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          {flashcards.length > 0 ? (
            <MaterialList materials={flashcards} type="flashcards" />
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <LayoutGrid className="h-7 w-7 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium mb-1">No flashcards generated yet</p>
                  <p className="text-sm text-muted-foreground">Generate flashcards from your uploaded documents.</p>
                </div>
                <Button onClick={handleGenerateFlashcards} className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4" />
                  Generate Flashcards
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          {quizzes.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {quizzes.map((material) => (
                <Card key={material.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{material.content?.title || `Quiz #${material.id}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.content?.questions?.length || 0} questions · {new Date(material.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/app/quiz/${material.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> Practice
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 gap-1.5">
                        <Link href={`/app/exam/${material.id}`}>
                          <Shield className="h-3.5 w-3.5" /> Exam Mode
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-8">
              <CardContent className="text-center text-muted-foreground">
                No quizzes generated yet. Upload a document to create study materials.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Progress Tab ── */}
        <TabsContent value="progress" className="mt-4 space-y-6">
          {/* Mini stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[hsl(var(--accent-blue))] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Notes Progress</p>
                    <p className="font-semibold">{completedSections} of {totalSections} sections</p>
                  </div>
                </div>
                <Progress value={totalSections > 0 ? (completedSections / totalSections) * 100 : 0} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 h-full flex items-center">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-[hsl(var(--accent-green))] shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quiz Average</p>
                    <p className="text-2xl font-bold">{quizAttempts.length > 0 ? `${avgQuizScore}%` : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 h-full flex items-center">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="h-6 w-6 text-[hsl(var(--accent-purple))] shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Flashcards</p>
                    <p className="text-2xl font-bold">{flashcardsStudied} <span className="text-base font-normal text-muted-foreground">cards</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 h-full flex items-center">
                <div className="flex items-center gap-3">
                  <Flame className="h-6 w-6 text-[hsl(var(--accent-amber))] shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Study Streak</p>
                    <p className="text-2xl font-bold">{studyStreak > 0 ? <>{studyStreak} <span className="text-base font-normal text-muted-foreground">days</span></> : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-[hsl(var(--accent-blue))]" />
                Notes Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notesProgressList.length > 0 ? (
                notesProgressList.map((n) => {
                  const pct = n.total > 0 ? Math.round((n.generated / n.total) * 100) : 0
                  return (
                    <div key={n.materialId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium truncate mr-4">
                          {n.title.replace(/^Notes:\s*/i, '')}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {n.generated}/{n.total} sections ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet. Upload a document to get started.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quiz Score History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[hsl(var(--accent-green))]" />
                Quiz Score History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quizAttempts.length > 0 ? (
                <div className="space-y-1">
                  {/* Simple bar chart */}
                  <div className="flex items-end justify-start gap-3 h-32 mb-6 px-2 overflow-hidden border-b">
                    {quizAttempts.slice(0, 15).reverse().map((a, i) => {
                      const barColor =
                        a.percent >= 80 ? 'bg-green-500' :
                          a.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      return (
                        <div key={a.id} className="flex-1 max-w-[40px] flex flex-col items-center justify-end gap-1 h-full pt-4" title={`${a.quizTitle}: ${a.percent}%`}>
                          <span className="text-[10px] text-muted-foreground font-medium">{Math.min(a.percent, 100)}%</span>
                          <div
                            className={`w-full rounded-t-sm ${barColor} transition-all duration-300 opacity-90 hover:opacity-100`}
                            style={{ height: `${Math.max(Math.min(a.percent, 100), 4)}%` }}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* List */}
                  <div className="space-y-2">
                    {quizAttempts.map((a) => {
                      const scoreColor = a.percent >= 80 ? 'text-green-500' : a.percent >= 50 ? 'text-yellow-500' : 'text-red-500'
                      return (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-xl glass-subtle hover:bg-white/[0.04] transition-all duration-250">
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle className={`h-4 w-4 shrink-0 ${scoreColor}`} />
                            <p className="text-sm font-medium truncate">{a.quizTitle}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className={`text-sm font-semibold ${scoreColor}`}>
                              {a.score}/{a.total} ({a.percent}%)
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.attemptedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No quizzes taken yet. Complete a quiz to see your scores here.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weak Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-[hsl(var(--accent-red))]" />
                Weak Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakAreas.length > 0 ? (
                <div className="space-y-4">
                  {/* Topic list */}
                  <div className="space-y-2">
                    {weakAreas.slice(0, 12).map((w) => {
                      const wrongPct = w.totalAttempts > 0 ? w.wrongCount / w.totalAttempts : 0
                      let indicator: { emoji: string; label: string; color: string }
                      if (wrongPct > 0.6) {
                        indicator = { emoji: '🔴', label: 'Needs Work', color: 'text-red-500' }
                      } else if (wrongPct > 0.3) {
                        indicator = { emoji: '🟡', label: 'Getting Better', color: 'text-yellow-500' }
                      } else {
                        indicator = { emoji: '🟢', label: 'Strong', color: 'text-green-500' }
                      }
                      return (
                        <div
                          key={w.id}
                          className="flex items-center justify-between p-3 rounded-xl glass-subtle"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{indicator.emoji}</span>
                            <span className="text-sm font-medium truncate">{w.topic}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-medium ${indicator.color}`}>
                              {indicator.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Wrong {w.wrongCount}/{w.totalAttempts}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Suggested focus */}
                  {(() => {
                    const topWeak = weakAreas
                      .filter((w) => w.totalAttempts > 0 && (w.wrongCount / w.totalAttempts) > 0.3)
                      .slice(0, 3)
                    if (topWeak.length === 0) return null
                    return (
                      <div className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
                        <p className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-1.5">
                          <Zap className="h-4 w-4" /> Suggested Focus
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {topWeak.map((w) => (
                            <span key={w.id} className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">
                              {w.topic}
                            </span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={handlePracticeWeakAreas}
                          disabled={generatingWeakQuiz}
                          className="bg-orange-600 hover:bg-orange-700 gap-2"
                        >
                          {generatingWeakQuiz ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white" />
                          ) : (
                            <Target className="h-3.5 w-3.5" />
                          )}
                          {generatingWeakQuiz ? 'Generating...' : 'Practice Weak Areas'}
                        </Button>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Complete quizzes to identify your weak areas.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─────────────────────────────────────────────
// Reusable material list
// ─────────────────────────────────────────────

function MaterialList({ materials, type }: { materials: any[]; type: string }) {
  if (materials.length === 0) {
    return (
      <Card className="py-8 animate-fade-in">
        <CardContent className="text-center text-muted-foreground">
          No {type} generated yet. Upload a document to create study materials.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {materials.map((material, i) => (
        <Link key={material.id} href={`/app/${type}/${material.id}`}>
          <Card className={`cursor-pointer group animate-fade-in stagger-${Math.min(i + 1, 6)}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{material.content?.title || `${type} #${material.id}`}</p>
                <p className="text-sm text-muted-foreground">{new Date(material.generatedAt).toLocaleDateString()}</p>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
