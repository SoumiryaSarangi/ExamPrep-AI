'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ensureCourseIndexed } from '@/lib/embeddings/indexer'
import { embedSingle } from '@/lib/embeddings/embedder'
import { retrieveRelevantSections } from '@/lib/embeddings/retrieval'
import { generateTutorAnswer } from '@/lib/ai/aiService'
import { useCourseStore } from '@/stores/courseStore'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, Sparkles, AlertTriangle, BookOpen, User, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { Card } from '@/components/ui/card'

interface Message {
  role: 'user' | 'tutor'
  content: string
  citations?: Array<{ filename: string; sectionTitle: string }>
}

export default function CourseTutorPage() {
  const params = useParams<{ courseId: string }>()
  const courseId = Number(params?.courseId || 0)
  const router = useRouter()
  const { currentCourse, getCourse } = useCourseStore()
  const { toast } = useToast()

  const [isReady, setIsReady] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!Number.isFinite(courseId)) return
    getCourse(courseId)
    
    // One-time backfill/setup
    ensureCourseIndexed(courseId)
      .then(() => setIsReady(true))
      .catch(err => {
        console.error('[Tutor] Setup failed:', err)
        toast({ title: 'Error preparing course materials', type: 'error' })
        setIsReady(true) // Allow usage anyway, it might partially work
      })
  }, [courseId, getCourse, toast])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isSending) return
    
    const query = input.trim()
    setInput('')

    const recentHistory: Array<{ role: 'user' | 'assistant', content: string }> = messages.slice(-6).map(m => ({ 
      role: m.role === 'tutor' ? 'assistant' : 'user', 
      content: m.content 
    }))
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''

    setMessages(prev => [...prev, { role: 'user', content: query }])
    setIsSending(true)

    try {
      const [ownResults, historyResults] = await Promise.all([
        embedSingle(query).then(qVec => retrieveRelevantSections(courseId, qVec, 4)),
        lastUserMessage
          ? embedSingle(`${lastUserMessage} ${query}`).then(qVec => retrieveRelevantSections(courseId, qVec, 4))
          : Promise.resolve([]),
      ])
      
      const merged = new Map<string, typeof ownResults[number]>()
      for (const r of [...ownResults, ...historyResults]) {
        const key = `${r.documentId}-${r.sectionIndex}-${r.chunkIndex}`
        if (!merged.has(key) || merged.get(key)!.score < r.score) merged.set(key, r)
      }
      const hits = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 4)

      if (hits.length === 0 || hits[0].score < 0.35) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'tutor', 
            content: "I'm sorry, but that information is not covered in the uploaded materials for this course." 
          }
        ])
        return
      }

      const answer = await generateTutorAnswer(query, hits, recentHistory)
      
      const citations = hits.map(h => ({
        filename: h.filename,
        sectionTitle: h.sectionTitle
      }))

      // Deduplicate citations by filename + sectionTitle
      const uniqueCitations = citations.filter((v, i, a) => a.findIndex(t => (t.filename === v.filename && t.sectionTitle === v.sectionTitle)) === i)

      setMessages(prev => [
        ...prev,
        {
          role: 'tutor',
          content: answer,
          citations: uniqueCitations
        }
      ])

    } catch (err: any) {
      console.error('[Tutor] Query failed:', err)
      toast({ title: 'Error generating answer', description: err.message, type: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!currentCourse) return null

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h2 className="text-xl font-medium">Preparing your course materials…</h2>
        <p className="text-muted-foreground text-sm text-center max-w-md">
          First-visit setup might take a few seconds as we load the AI models and index your documents.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px] max-w-4xl mx-auto">
      <div className="flex items-center gap-4 animate-fade-in pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/app/courses/${courseId}`)} className="rounded-xl shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Course Tutor
          </h1>
          <p className="text-muted-foreground text-sm">{currentCourse.courseCode} - {currentCourse.courseName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Ask anything about this course</p>
              <p className="text-sm max-w-sm mt-1">
                I&apos;ll answer using only the documents you&apos;ve uploaded, and cite my sources.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {msg.role === 'tutor' && (
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'glass-card border border-primary/10 rounded-tl-sm'}`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    <MarkdownRenderer content={msg.content} />
                  </div>
                </div>
                
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground self-center mr-1 font-medium">Sourced from:</span>
                    {msg.citations.map((cit, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 text-[10px] font-medium border border-border/50 text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{cit.filename}</span>
                        <span className="opacity-50 mx-0.5">•</span>
                        <span className="truncate max-w-[120px]">{cit.sectionTitle.replace(/^(Page|Slide)s? /, '')}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-foreground/50" />
                </div>
              )}
            </div>
          ))
        )}
        {isSending && (
          <div className="flex gap-4 justify-start animate-pulse">
             <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="glass-card border border-primary/10 rounded-2xl rounded-tl-sm p-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-4 border-t mt-auto">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this course..."
            className="w-full bg-background border rounded-full pl-5 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
            disabled={isSending}
          />
          <Button 
            size="icon" 
            className="absolute right-1 top-1 rounded-full h-10 w-10" 
            disabled={!input.trim() || isSending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
