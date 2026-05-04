'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import { generateFlashcardsOnly, generateMoreFlashcards } from '@/lib/ai/aiService'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  BookOpen,
  LayoutGrid,
  Loader2,
  Sparkles,
  RefreshCw,
  XCircle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Trophy,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

function calculateNextReview(quality: number, card: any) {
  let { repetitions = 0, easeFactor = 2.5, interval = 1 } = card

  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)

    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    repetitions++
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return { repetitions, easeFactor, interval, nextReview: nextReview.toISOString() }
}

// ─────────────────────────────────────────────
// Difficulty badge
// ─────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  const d = (difficulty || 'medium').toLowerCase()
  const colors: Record<string, string> = {
    easy:   'bg-green-500/15 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    hard:   'bg-red-500/15 text-red-400 border-red-500/30',
  }
  return (
    <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border ${colors[d] || colors.medium}`}>
      {d}
    </span>
  )
}

// ─────────────────────────────────────────────
// Progress Ring SVG
// ─────────────────────────────────────────────
function ProgressRing({ percent, size = 120, stroke = 8 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const color = percent >= 80 ? '#22c55e' : percent >= 50 ? '#eab308' : '#ef4444'

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/20" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700 ease-out"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="currentColor"
        className="text-2xl font-bold rotate-90 origin-center" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Flashcards() {
  const params = useParams<{ materialId: string }>()
  const materialId = Number(params?.materialId || 0)
  const router = useRouter()
  const { currentMaterial, getMaterial, updateMaterial } = useMaterialStore()
  const { toast } = useToast()

  const [cards, setCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Know it / Don't know it tracking
  const [gotItSet, setGotItSet] = useState<Set<number>>(new Set())
  const [missedSet, setMissedSet] = useState<Set<number>>(new Set())
  const [showSummary, setShowSummary] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewCards, setReviewCards] = useState<any[]>([])

  useEffect(() => {
    if (!Number.isFinite(materialId)) return
    getMaterial(materialId)
  }, [getMaterial, materialId])

  useEffect(() => {
    if (currentMaterial?.content?.cards?.length) {
      setCards(currentMaterial.content.cards)
    }
  }, [currentMaterial])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showSummary) return
      if (event.code === 'Space') {
        event.preventDefault()
        setIsFlipped((prev) => !prev)
      } else if (event.code === 'ArrowRight') {
        handleNext()
      } else if (event.code === 'ArrowLeft') {
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, currentIndex, showSummary, reviewMode])

  // ─────────────────────────────────────────────
  // Active deck (all cards or review-only)
  // ─────────────────────────────────────────────
  const activeDeck = reviewMode ? reviewCards : cards
  const activeCard = activeDeck[currentIndex]
  const progress = activeDeck.length > 0 ? ((currentIndex + 1) / activeDeck.length) * 100 : 0

  // ─────────────────────────────────────────────
  // Generate flashcards
  // ─────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!currentMaterial) return
    setGenerating(true)
    setGenError(null)

    try {
      const doc = await db.documents.get(currentMaterial.documentId)
      if (!doc?.extractedText) throw new Error('Could not find document text. Try re-uploading.')

      const result = await generateFlashcardsOnly(doc.extractedText, doc.filename)
      if (!result?.cards?.length) throw new Error('AI returned no flashcards. Please try again.')

      const updatedContent = {
        ...currentMaterial.content,
        title: result.title || currentMaterial.content?.title,
        cards: result.cards,
      }
      await updateMaterial(currentMaterial.id, { content: updatedContent })
      resetSession(result.cards)
      toast({ title: 'Flashcards generated!', description: `${result.cards.length} cards ready.`, type: 'success' })
    } catch (err: any) {
      console.error('[Flashcards] Generation error:', err)
      setGenError(err?.message || 'Failed to generate flashcards.')
      toast({ title: 'Generation failed', description: err?.message, type: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  // ─────────────────────────────────────────────
  // Generate more (non-overlapping) cards
  // ─────────────────────────────────────────────
  const handleGenerateMore = async () => {
    if (!currentMaterial) return
    setGenerating(true)
    setShowSummary(false)

    try {
      const doc = await db.documents.get(currentMaterial.documentId)
      if (!doc?.extractedText) throw new Error('Could not find document text.')

      const previousFronts = cards.map((c, i) => `${i + 1}. ${c.front}`).join('\n')
      const result = await generateMoreFlashcards(doc.extractedText, doc.filename, previousFronts)
      if (!result?.cards?.length) throw new Error('AI returned no new flashcards.')

      const updatedContent = { ...currentMaterial.content, cards: result.cards }
      await updateMaterial(currentMaterial.id, { content: updatedContent })
      resetSession(result.cards)
      toast({ title: 'New cards generated!', description: `${result.cards.length} fresh cards.`, type: 'success' })
    } catch (err: any) {
      console.error('[Flashcards] Generate more error:', err)
      toast({ title: 'Generation failed', description: err?.message, type: 'error' })
      setShowSummary(true)
    } finally {
      setGenerating(false)
    }
  }

  // ─────────────────────────────────────────────
  // Session helpers
  // ─────────────────────────────────────────────
  const resetSession = (newCards: any[]) => {
    setCards(newCards)
    setCurrentIndex(0)
    setIsFlipped(false)
    setGotItSet(new Set())
    setMissedSet(new Set())
    setShowSummary(false)
    setReviewMode(false)
    setReviewCards([])
  }

  const handleNext = () => {
    setIsFlipped(false)
    if (currentIndex < activeDeck.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    setIsFlipped(false)
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleShuffle = () => {
    const shuffled = [...activeDeck].sort(() => Math.random() - 0.5)
    if (reviewMode) {
      setReviewCards(shuffled)
    } else {
      setCards(shuffled)
    }
    setCurrentIndex(0)
    setIsFlipped(false)
    toast({ title: 'Cards shuffled!', type: 'success' })
  }

  // ─────────────────────────────────────────────
  // Got it / Still learning
  // ─────────────────────────────────────────────
  const handleGotIt = () => {
    const cardFront = activeCard?.front
    setGotItSet((prev) => { const s = new Set(prev); s.add(currentIndex); return s })
    // Remove from missed if it was there (review mode second pass)
    setMissedSet((prev) => {
      const s = new Set(prev)
      // In review mode, map back to the original index
      if (reviewMode) {
        const origIdx = cards.findIndex((c) => c.front === cardFront)
        if (origIdx !== -1) s.delete(origIdx)
      } else {
        s.delete(currentIndex)
      }
      return s
    })
    advanceOrFinish()
  }

  const handleStillLearning = () => {
    const cardFront = activeCard?.front
    if (!reviewMode) {
      setMissedSet((prev) => { const s = new Set(prev); s.add(currentIndex); return s })
    }
    advanceOrFinish()
  }

  const advanceOrFinish = () => {
    setIsFlipped(false)
    if (currentIndex < activeDeck.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Reached end of deck
      if (reviewMode) {
        // Finished review round
        setReviewMode(false)
        setShowSummary(true)
      } else {
        setShowSummary(true)
      }
    }
  }

  const startReviewMissed = () => {
    const missed = cards.filter((_, i) => missedSet.has(i))
    if (missed.length === 0) {
      toast({ title: 'Nothing to review!', description: 'You got all cards right! 🎉', type: 'success' })
      return
    }
    setReviewCards(missed)
    setReviewMode(true)
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowSummary(false)
  }

  const startOver = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setGotItSet(new Set())
    setMissedSet(new Set())
    setShowSummary(false)
    setReviewMode(false)
    setReviewCards([])
  }

  // ─────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────
  if (!currentMaterial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Empty state — generate button
  // ─────────────────────────────────────────────
  if ((!cards || cards.length === 0) && !generating) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <Card className="border-dashed">
          <CardContent className="p-10 flex flex-col items-center text-center gap-5">
            {genError ? (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Generation failed</h2>
                  <p className="text-sm text-muted-foreground mb-4">{genError}</p>
                </div>
                <Button onClick={handleGenerate} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.back()}>Go Back</Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <LayoutGrid className="h-8 w-8 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">No flashcards generated yet</h2>
                  <p className="text-sm text-muted-foreground">Click below to generate 30 flashcards from your document.</p>
                </div>
                <Button onClick={handleGenerate} size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4" /> Generate Flashcards
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.back()}>Go Back</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Generating state (full-screen)
  // ─────────────────────────────────────────────
  if (generating) {
    return (
      <div className="max-w-lg mx-auto py-16">
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Generating flashcards…</h2>
              <p className="text-sm text-muted-foreground">AI is creating 30 study cards. This may take a moment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Session summary screen
  // ─────────────────────────────────────────────
  if (showSummary) {
    const total = reviewMode ? reviewCards.length : cards.length
    const known = reviewMode ? total : gotItSet.size
    const missed = reviewMode ? 0 : missedSet.size
    const percent = total > 0 ? Math.round((known / cards.length) * 100) : 0

    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-6">
            <ProgressRing percent={percent} />

            <div>
              <h2 className="text-2xl font-bold mb-1">
                {percent >= 80 ? '🎉 Great job!' : percent >= 50 ? '👍 Keep going!' : '💪 Keep practicing!'}
              </h2>
              <p className="text-lg text-muted-foreground">
                You knew <strong className="text-foreground">{known}</strong> of <strong className="text-foreground">{cards.length}</strong> cards
              </p>
              {missed > 0 && (
                <p className="text-sm text-yellow-500 mt-1">{missed} card{missed !== 1 ? 's' : ''} need review</p>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              {missed > 0 && (
                <Button onClick={startReviewMissed} size="lg" className="gap-2 bg-yellow-600 hover:bg-yellow-700 w-full">
                  <RotateCcw className="h-4 w-4" /> Review Missed Cards ({missed})
                </Button>
              )}
              <Button onClick={handleGenerateMore} size="lg" variant="outline" className="gap-2 w-full">
                <Sparkles className="h-4 w-4" /> Generate More Cards
              </Button>
              <Button onClick={startOver} size="lg" variant="ghost" className="gap-2 w-full">
                <RefreshCw className="h-4 w-4" /> Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Flashcard viewer
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6" tabIndex={0}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {reviewMode ? '📝 Review Mode' : (currentMaterial.content?.title || 'Flashcards')}
            </h1>
            <p className="text-muted-foreground text-sm">
              Card {currentIndex + 1} of {activeDeck.length}
              {reviewMode && <span className="text-yellow-500 ml-2">• Reviewing missed cards</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={handleShuffle} title="Shuffle cards">
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2" />

      {/* Flip card */}
      <div className={`flip-card h-80 cursor-pointer ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped((prev) => !prev)}>
        <div className="flip-card-inner relative w-full h-full">
          <Card className="flip-card-front absolute inset-0">
            <CardContent className="h-full flex flex-col items-center justify-center p-8">
              <DifficultyBadge difficulty={activeCard?.difficulty} />
              <div className="text-center mt-3">
                <p className="text-xs text-muted-foreground mb-2">QUESTION</p>
                <p className="text-xl font-medium">{activeCard?.front}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flip-card-back absolute inset-0 bg-primary/5">
            <CardContent className="h-full flex flex-col items-center justify-center p-8">
              <DifficultyBadge difficulty={activeCard?.difficulty} />
              <div className="text-center mt-3">
                <p className="text-xs text-muted-foreground mb-2">ANSWER</p>
                <p className="text-xl">{activeCard?.back}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Got it / Still learning — shown when card is flipped */}
      {isFlipped ? (
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-red-500/40 hover:bg-red-500/10 flex-1 max-w-[200px]"
            onClick={handleStillLearning}
          >
            <ThumbsDown className="h-5 w-5 text-red-500" />
            Still Learning
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-green-500/40 hover:bg-green-500/10 flex-1 max-w-[200px]"
            onClick={handleGotIt}
          >
            <ThumbsUp className="h-5 w-5 text-green-500" />
            Got It
          </Button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            <span className="text-green-500">{gotItSet.size} ✓</span>
            {' · '}
            <span className="text-red-500">{missedSet.size} ✗</span>
          </div>

          <Button variant="outline" onClick={handleNext} disabled={currentIndex === activeDeck.length - 1}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> to flip,
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">&larr;</kbd>
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">&rarr;</kbd> to navigate
      </p>
    </div>
  )
}
