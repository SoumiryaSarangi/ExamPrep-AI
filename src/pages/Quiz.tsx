'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, CheckCircle, XCircle, Trophy, RotateCcw, Target, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { generateMoreQuizQuestions } from '@/lib/ai/aiService'
import { updateWeakAreas } from '@/lib/weakAreaTracker'

export default function Quiz() {
  const params = useParams<{ materialId: string }>()
  const materialId = Number(params?.materialId || 0)
  const router = useRouter()
  const { currentMaterial, getMaterial, updateMaterial } = useMaterialStore()
  const { toast } = useToast()

  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<any[]>([])
  const [quizComplete, setQuizComplete] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(materialId)) return
    getMaterial(materialId)
  }, [getMaterial, materialId])

  useEffect(() => {
    if (currentMaterial?.content?.questions) {
      setQuestions(currentMaterial.content.questions)
    }
  }, [currentMaterial])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const currentScore = useMemo(() => answers.filter((a) => a.isCorrect).length, [answers])

  const handleSelect = (index: number) => {
    if (!showResult) {
      setSelectedAnswer(index)
    }
  }

  const handleSubmit = () => {
    if (selectedAnswer === null) {
      toast({ title: 'Select an answer', type: 'error' })
      return
    }

    const isCorrect = selectedAnswer === currentQuestion.correct
    setAnswers([...answers, { questionId: currentIndex, selected: selectedAnswer, isCorrect }])
    setShowResult(true)
  }

  const finishQuiz = async () => {
    const finalAnswers = [
      ...answers,
      { questionId: currentIndex, selected: selectedAnswer, isCorrect: selectedAnswer === currentQuestion.correct },
    ]
    const score = finalAnswers.filter((a) => a.isCorrect).length

    await db.quizAttempts.add({
      materialId,
      score: Math.round((score / questions.length) * 100),
      answers: finalAnswers,
      attemptedAt: new Date().toISOString(),
      durationSeconds: Math.round((Date.now() - startTime) / 1000),
    } as any)

    // Track weak areas
    try {
      const mat = await db.materials.get(materialId)
      if (mat) {
        const doc = await db.documents.get(mat.documentId)
        if (doc?.courseId) {
          await updateWeakAreas(doc.courseId, questions, finalAnswers)
        }
      }
    } catch (err) {
      console.error('[WeakAreas] Failed to update:', err)
    }

    setQuizComplete(true)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      finishQuiz()
    }
  }

  const restartQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setAnswers([])
    setQuizComplete(false)
    setStartTime(Date.now())
  }

  const handleGenerateMore = async () => {
    try {
      setIsGenerating(true)
      const doc = await db.documents.get(currentMaterial.documentId)
      if (!doc || !doc.extractedText) throw new Error('Document text not found')

      const previousQuestionsText = questions.map(q => q.question).join('\n')
      toast({ title: 'Generating...', description: 'Creating 15 new questions' })
      
      const newQuizData = await generateMoreQuizQuestions(doc.extractedText, doc.filename, previousQuestionsText)
      
      if (!newQuizData.questions || newQuizData.questions.length === 0) {
        throw new Error('Failed to generate valid questions')
      }
      
      const updatedContent = { ...currentMaterial.content, questions: newQuizData.questions }
      await updateMaterial(materialId, { content: updatedContent })
      
      setQuestions(newQuizData.questions)
      setCurrentIndex(0)
      setSelectedAnswer(null)
      setShowResult(false)
      setAnswers([])
      setQuizComplete(false)
      setStartTime(Date.now())
      toast({ title: 'Success', description: 'New questions generated!', type: 'success' })
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err?.message || 'Unknown error', type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!currentMaterial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 animate-float"><Target className="h-8 w-8 text-muted-foreground/50" /></div>
        <h2 className="text-xl font-semibold mb-2">No quiz available</h2>
        <p className="text-muted-foreground mb-4">This material does not have any quiz questions.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  if (quizComplete) {
    const score = Math.round((currentScore / questions.length) * 100)

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-scale">
        <Card className="text-center py-12">
          <CardContent>
            <div className={`h-20 w-20 rounded-3xl mx-auto mb-6 flex items-center justify-center ${score >= 70 ? 'bg-[hsl(var(--accent-amber))]/15' : 'bg-muted/50'}`}><Trophy className={`h-10 w-10 ${score >= 70 ? 'text-[hsl(var(--accent-amber))]' : 'text-muted-foreground'}`} /></div>
            <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-5xl font-bold text-primary mb-4">{score}%</p>
            <p className="text-muted-foreground mb-6">
              You got {currentScore} out of {questions.length} questions correct
            </p>

            <div className="flex justify-center gap-4 flex-wrap">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={restartQuiz} disabled={isGenerating}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="secondary" onClick={handleGenerateMore} disabled={isGenerating}>
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary mr-2"></div>
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate More Questions'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, idx) => {
              const answer = answers[idx]
              const isCorrect = answer?.isCorrect
              return (
                <div key={idx} className={`p-4 rounded-xl transition-all ${isCorrect ? 'bg-[hsl(var(--accent-green))]/10 border border-[hsl(var(--accent-green))]/20' : 'bg-[hsl(var(--accent-red))]/10 border border-[hsl(var(--accent-red))]/20'}`}>
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{q.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">Your answer: {q.options[answer?.selected]}</p>
                      {!isCorrect && <p className="text-sm text-green-500 mt-1">Correct: {q.options[q.correct]}</p>}
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentMaterial.content?.title || 'Quiz'}</h1>
            <p className="text-muted-foreground text-sm">Question {currentIndex + 1} of {questions.length}</p>
          </div>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-medium mb-6">{currentQuestion?.question}</p>

          <div className="space-y-3">
            {currentQuestion?.options?.map((option: string, idx: number) => {
              let className = 'w-full p-4 text-left rounded-xl border transition-all duration-250 '

              if (showResult) {
                if (idx === currentQuestion.correct) {
                  className += 'border-green-500 bg-green-500/10'
                } else if (idx === selectedAnswer && idx !== currentQuestion.correct) {
                  className += 'border-red-500 bg-red-500/10'
                } else {
                  className += 'border-muted opacity-50'
                }
              } else {
                className += selectedAnswer === idx ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
              }

              return (
                <button key={idx} className={className} onClick={() => handleSelect(idx)} disabled={showResult}>
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full border flex items-center justify-center text-sm">{String.fromCharCode(65 + idx)}</span>
                    <span>{option}</span>
                    {showResult && idx === currentQuestion.correct && <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />}
                    {showResult && idx === selectedAnswer && idx !== currentQuestion.correct && (
                      <XCircle className="h-5 w-5 text-red-500 ml-auto" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {showResult && currentQuestion?.explanation && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Explanation:</p>
              <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        {!showResult ? (
          <Button onClick={handleSubmit} disabled={selectedAnswer === null}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>{currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</Button>
        )}
      </div>
    </div>
  )
}
