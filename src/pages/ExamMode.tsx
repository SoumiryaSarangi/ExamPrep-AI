'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  Clock,
  AlertTriangle,
  RotateCcw,
  Shield,
  Target,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { updateWeakAreas } from '@/lib/weakAreaTracker'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Phase = 'setup' | 'exam' | 'results'

interface ExamConfig {
  questionCount: number
  timeLimit: number // minutes
  difficulty: 'mixed' | 'easy' | 'hard'
}

interface ExamAnswer {
  questionIndex: number
  selected: number | null
  isCorrect: boolean
}

function getGrade(percent: number): { letter: string; color: string; label: string } {
  if (percent >= 90) return { letter: 'A+', color: 'text-green-400', label: 'Outstanding' }
  if (percent >= 80) return { letter: 'A', color: 'text-green-500', label: 'Excellent' }
  if (percent >= 70) return { letter: 'B', color: 'text-blue-400', label: 'Good' }
  if (percent >= 60) return { letter: 'C', color: 'text-yellow-400', label: 'Average' }
  if (percent >= 50) return { letter: 'D', color: 'text-orange-400', label: 'Below Average' }
  return { letter: 'F', color: 'text-red-500', label: 'Needs Improvement' }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ExamMode() {
  const params = useParams<{ materialId: string }>()
  const materialId = Number(params?.materialId || 0)
  const router = useRouter()
  const { currentMaterial, getMaterial } = useMaterialStore()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>('setup')
  const [allQuestions, setAllQuestions] = useState<any[]>([])
  const [examQuestions, setExamQuestions] = useState<any[]>([])
  const [config, setConfig] = useState<ExamConfig>({ questionCount: 15, timeLimit: 30, difficulty: 'mixed' })

  // Exam state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [examFinished, setExamFinished] = useState(false)

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!Number.isFinite(materialId)) return
    getMaterial(materialId)
  }, [getMaterial, materialId])

  useEffect(() => {
    if (currentMaterial?.content?.questions) {
      setAllQuestions(currentMaterial.content.questions)
    }
  }, [currentMaterial])

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-submit
          clearInterval(timerRef.current!)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const handleAutoSubmit = useCallback(() => {
    setExamFinished(true)
    setPhase('results')
  }, [])

  // ─────────────────────────────────────────────
  // Start exam
  // ─────────────────────────────────────────────
  const startExam = () => {
    let pool = [...allQuestions]

    // Filter by difficulty if not mixed
    if (config.difficulty === 'easy') {
      const easy = pool.filter((q) => q.difficulty?.toLowerCase() === 'easy')
      if (easy.length >= 5) pool = easy
    } else if (config.difficulty === 'hard') {
      const hard = pool.filter((q) => q.difficulty?.toLowerCase() === 'hard')
      if (hard.length >= 5) pool = hard
    }

    // Shuffle and pick
    const shuffled = pool.sort(() => Math.random() - 0.5)
    const count = Math.min(config.questionCount, shuffled.length)
    const selected = shuffled.slice(0, count)

    setExamQuestions(selected)
    setAnswers(new Array(count).fill(null))
    setCurrentIndex(0)
    setTimeLeft(config.timeLimit * 60)
    setStartTime(Date.now())
    setExamFinished(false)
    setPhase('exam')
  }

  // ─────────────────────────────────────────────
  // Submit exam
  // ─────────────────────────────────────────────
  const submitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current)

    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    const finalAnswers: ExamAnswer[] = examQuestions.map((q, i) => ({
      questionIndex: i,
      selected: answers[i],
      isCorrect: answers[i] === q.correct,
    }))

    const score = finalAnswers.filter((a) => a.isCorrect).length
    const percent = Math.round((score / examQuestions.length) * 100)

    // Save to Dexie
    try {
      await db.quizAttempts.add({
        materialId,
        score: percent,
        answers: finalAnswers as any,
        attemptedAt: new Date().toISOString(),
        durationSeconds: timeTaken,
      } as any)
    } catch (err) {
      console.error('Failed to save exam result:', err)
    }

    // Track weak areas
    try {
      const mat = await db.materials.get(materialId)
      if (mat) {
        const doc = await db.documents.get(mat.documentId)
        if (doc?.courseId) {
          // Convert answers array to format expected by updateWeakAreas
          const answerObjects = examQuestions.map((q, i) => ({
            selected: answers[i],
            isCorrect: answers[i] === q.correct,
          }))
          await updateWeakAreas(doc.courseId, examQuestions, answerObjects)
        }
      }
    } catch (err) {
      console.error('[WeakAreas] Failed to update:', err)
    }

    setExamFinished(true)
    setPhase('results')
  }

  // ─────────────────────────────────────────────
  // Select answer
  // ─────────────────────────────────────────────
  const selectAnswer = (optionIndex: number) => {
    const updated = [...answers]
    updated[currentIndex] = optionIndex
    setAnswers(updated)
  }

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────
  if (!currentMaterial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (allQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No questions available</h2>
        <p className="text-muted-foreground mb-4">This quiz doesn't have any questions yet.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────
  if (phase === 'setup') {
    const maxQ = allQuestions.length
    const questionOptions = [10, 15, 20, 30].filter((n) => n <= maxQ)
    if (!questionOptions.includes(maxQ) && maxQ < 30) questionOptions.push(maxQ)

    return (
      <div className="max-w-xl mx-auto py-8 space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3 animate-glow-pulse">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Exam Mode</h1>
          <p className="text-muted-foreground mt-1">
            {currentMaterial.content?.title || 'Quiz'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exam Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question count */}
            <div>
              <label className="text-sm font-medium mb-2 block">Number of Questions</label>
              <div className="flex gap-2 flex-wrap">
                {questionOptions.map((n) => (
                  <Button
                    key={n}
                    variant={config.questionCount === n ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig({ ...config, questionCount: n })}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time limit */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time Limit</label>
              <div className="flex gap-2 flex-wrap">
                {[15, 30, 45, 60].map((t) => (
                  <Button
                    key={t}
                    variant={config.timeLimit === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig({ ...config, timeLimit: t })}
                  >
                    {t} min
                  </Button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <div className="flex gap-2 flex-wrap">
                {(['mixed', 'easy', 'hard'] as const).map((d) => (
                  <Button
                    key={d}
                    variant={config.difficulty === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfig({ ...config, difficulty: d })}
                    className="capitalize"
                  >
                    {d === 'mixed' ? '🎲 Mixed' : d === 'easy' ? '🟢 Easy Only' : '🔴 Hard Only'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card className="border-[hsl(var(--accent-amber))]/20 bg-[hsl(var(--accent-amber))]/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--accent-amber))] shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-[hsl(var(--accent-amber))]">Exam Rules</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Once started, the timer cannot be paused</li>
                  <li>• Each question is worth 1 mark</li>
                  <li>• No negative marking</li>
                  <li>• You can navigate back and change answers before submitting</li>
                  <li>• Exam auto-submits when the timer reaches 0</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button size="lg" onClick={startExam} className="gap-2 px-8">
            <Sparkles className="h-4 w-4" /> Start Exam
          </Button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // EXAM SCREEN
  // ─────────────────────────────────────────────
  if (phase === 'exam') {
    const q = examQuestions[currentIndex]
    const progress = ((currentIndex + 1) / examQuestions.length) * 100
    const isLastQuestion = currentIndex === examQuestions.length - 1
    const answeredCount = answers.filter((a) => a !== null).length
    const timerColor = timeLeft <= 60 ? 'text-red-500' : timeLeft <= 300 ? 'text-orange-400' : 'text-foreground'

    return (
      <div className="max-w-3xl mx-auto py-6 space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {examQuestions.length}</p>
            <p className="text-xs text-muted-foreground">{answeredCount} answered</p>
          </div>
          <div className={`flex items-center gap-2 text-lg font-mono font-bold ${timerColor}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        {/* Question */}
        <Card>
          <CardContent className="p-6">
            <p className="text-lg font-medium mb-6">{q?.question}</p>

            <div className="space-y-3">
              {q?.options?.map((option: string, idx: number) => {
                const isSelected = answers[currentIndex] === idx
                return (
                  <button
                    key={idx}
                    className={`w-full p-4 text-left rounded-xl border transition-all duration-250 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-primary/40'
                    }`}
                    onClick={() => selectAnswer(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-6 w-6 rounded-full border flex items-center justify-center text-sm ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : ''
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation + question dots */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {examQuestions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                i === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[i] !== null
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={() => setShowConfirm(true)}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Submit Exam
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(Math.min(examQuestions.length - 1, currentIndex + 1))}
            >
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Confirm dialog */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card className="max-w-md w-full mx-4">
              <CardContent className="p-6 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
                <h3 className="text-lg font-semibold">Submit Exam?</h3>
                <p className="text-sm text-muted-foreground">
                  You have answered <strong>{answeredCount}</strong> out of <strong>{examQuestions.length}</strong> questions.
                  {answeredCount < examQuestions.length && (
                    <span className="text-yellow-500 block mt-1">
                      {examQuestions.length - answeredCount} question(s) left unanswered.
                    </span>
                  )}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>Go Back</Button>
                  <Button onClick={() => { setShowConfirm(false); submitExam() }} className="bg-green-600 hover:bg-green-700">
                    Confirm Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RESULTS SCREEN
  // ─────────────────────────────────────────────
  if (phase === 'results') {
    const correctCount = examQuestions.filter((q, i) => answers[i] === q.correct).length
    const total = examQuestions.length
    const percent = Math.round((correctCount / total) * 100)
    const grade = getGrade(percent)
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    const incorrectCount = total - correctCount
    const unanswered = answers.filter((a) => a === null).length

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        {/* Marksheet header */}
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <Trophy className={`h-16 w-16 mx-auto mb-3 ${percent >= 70 ? 'text-yellow-400' : 'text-muted-foreground'}`} />
              <h2 className="text-2xl font-bold mb-1">Exam Complete</h2>
              <p className="text-muted-foreground">{currentMaterial.content?.title || 'Quiz'}</p>
            </div>

            {/* Score */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl glass-subtle">
                <p className="text-3xl font-bold">{correctCount}/{total}</p>
                <p className="text-xs text-muted-foreground mt-1">Score</p>
              </div>
              <div className="text-center p-4 rounded-xl glass-subtle">
                <p className={`text-3xl font-bold ${grade.color}`}>{percent}%</p>
                <p className="text-xs text-muted-foreground mt-1">Percentage</p>
              </div>
              <div className="text-center p-4 rounded-xl glass-subtle">
                <p className={`text-3xl font-bold ${grade.color}`}>{grade.letter}</p>
                <p className="text-xs text-muted-foreground mt-1">{grade.label}</p>
              </div>
              <div className="text-center p-4 rounded-xl glass-subtle">
                <p className="text-3xl font-bold">{formatTime(timeTaken)}</p>
                <p className="text-xs text-muted-foreground mt-1">Time Taken</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex justify-center gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" /> {correctCount} correct
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-500" /> {incorrectCount} wrong
              </span>
              {unanswered > 0 && (
                <span className="text-muted-foreground">{unanswered} unanswered</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Course
          </Button>
          <Button onClick={() => { setPhase('setup') }}>
            <RotateCcw className="h-4 w-4 mr-2" /> New Exam
          </Button>
          <Button variant="secondary" onClick={startExam}>
            <Sparkles className="h-4 w-4 mr-2" /> Retake Exam
          </Button>
        </div>

        {/* Review each question */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examQuestions.map((q, idx) => {
              const selected = answers[idx]
              const isCorrect = selected === q.correct
              const wasUnanswered = selected === null

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    wasUnanswered
                      ? 'border-muted glass-subtle'
                      : isCorrect
                      ? 'border-[hsl(var(--accent-green))]/30 bg-[hsl(var(--accent-green))]/5'
                      : 'border-[hsl(var(--accent-red))]/30 bg-[hsl(var(--accent-red))]/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground mt-0.5 shrink-0">
                      Q{idx + 1}
                    </span>
                    {wasUnanswered ? (
                      <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    ) : isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">{q.question}</p>
                      {wasUnanswered ? (
                        <p className="text-sm text-muted-foreground">Not answered</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Your answer: <span className={isCorrect ? 'text-green-500' : 'text-red-500'}>{q.options[selected]}</span>
                        </p>
                      )}
                      {!isCorrect && (
                        <p className="text-sm text-green-500 mt-0.5">
                          Correct: {q.options[q.correct]}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
