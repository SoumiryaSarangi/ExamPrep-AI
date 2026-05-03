'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Shuffle, BookOpen } from 'lucide-react'
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

export default function Flashcards() {
  const params = useParams<{ materialId: string }>()
  const materialId = Number(params?.materialId || 0)
  const router = useRouter()
  const { currentMaterial, getMaterial } = useMaterialStore()
  const { toast } = useToast()

  const [cards, setCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const [reviewed, setReviewed] = useState({ correct: 0, incorrect: 0 })

  useEffect(() => {
    if (!Number.isFinite(materialId)) return
    getMaterial(materialId)
  }, [getMaterial, materialId])

  useEffect(() => {
    if (currentMaterial?.content?.cards) {
      setCards(currentMaterial.content.cards)
    }
  }, [currentMaterial])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        setIsFlipped((prev) => !prev)
      } else if (event.code === 'ArrowRight') {
        setIsFlipped(false)
        setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1))
      } else if (event.code === 'ArrowLeft') {
        setIsFlipped(false)
        setCurrentIndex((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cards.length])

  const currentCard = cards[currentIndex]
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0

  const handleNext = () => {
    setIsFlipped(false)
    if (currentIndex < cards.length - 1) {
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
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
    toast({ title: 'Cards shuffled!', type: 'success' })
  }

  const handleAnswer = async (quality: number) => {
    setReviewed((prev) => ({
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
    }))

    const updated = calculateNextReview(quality, currentCard)
    const newCards = [...cards]
    newCards[currentIndex] = { ...currentCard, ...updated }
    setCards(newCards)

    if (currentCard?.id) {
      await db.flashcards.update(currentCard.id, updated)
    }

    if (currentIndex === cards.length - 1) {
      toast({
        title: 'Study session complete!',
        description: `Correct: ${reviewed.correct + (quality >= 3 ? 1 : 0)}, Incorrect: ${reviewed.incorrect + (quality < 3 ? 1 : 0)}`,
        type: 'success',
      })
    }

    handleNext()
  }

  if (!currentMaterial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No flashcards available</h2>
        <p className="text-muted-foreground mb-4">This material does not have any flashcards.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" tabIndex={0}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentMaterial.content?.title || 'Flashcards'}</h1>
            <p className="text-muted-foreground text-sm">Card {currentIndex + 1} of {cards.length}</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={handleShuffle}>
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>

      <Progress value={progress} className="h-2" />

      <div className={`flip-card h-80 cursor-pointer ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped((prev) => !prev)}>
        <div className="flip-card-inner relative w-full h-full">
          <Card className="flip-card-front absolute inset-0">
            <CardContent className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">QUESTION</p>
                <p className="text-xl font-medium">{currentCard?.front}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flip-card-back absolute inset-0 bg-primary/5">
            <CardContent className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">ANSWER</p>
                <p className="text-xl">{currentCard?.back}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isFlipped && studyMode ? (
        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" className="gap-2 border-red-500/50 hover:bg-red-500/10" onClick={() => handleAnswer(2)}>
            <XCircle className="h-5 w-5 text-red-500" />
            Again
          </Button>
          <Button variant="outline" size="lg" className="gap-2 border-yellow-500/50 hover:bg-yellow-500/10" onClick={() => handleAnswer(3)}>
            Hard
          </Button>
          <Button variant="outline" size="lg" className="gap-2 border-green-500/50 hover:bg-green-500/10" onClick={() => handleAnswer(4)}>
            <CheckCircle className="h-5 w-5 text-green-500" />
            Good
          </Button>
          <Button variant="outline" size="lg" className="gap-2 border-blue-500/50 hover:bg-blue-500/10" onClick={() => handleAnswer(5)}>
            Easy
          </Button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button variant={studyMode ? 'secondary' : 'outline'} onClick={() => setStudyMode((prev) => !prev)}>
            {studyMode ? 'Exit Study Mode' : 'Start Study Mode'}
          </Button>

          <Button variant="outline" onClick={handleNext} disabled={currentIndex === cards.length - 1}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
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
