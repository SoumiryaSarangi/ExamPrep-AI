'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import { generateSectionNotes } from '@/lib/ai/aiService'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Copy,
  CheckCircle,
  Loader2,
  FileText,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import type { Section } from '@/lib/parsers/textSplitter'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SectionedNotesContent {
  title: string
  sections: Section[]
  generatedSections: Record<number, string>
  totalSections: number
  /** Legacy field — present on old materials that were generated in bulk */
  markdown?: string
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Notes() {
  const params = useParams<{ materialId: string }>()
  const materialId = Number(params?.materialId || 0)
  const router = useRouter()
  const { currentMaterial, getMaterial, updateMaterial } = useMaterialStore()
  const { toast } = useToast()

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [generatedSections, setGeneratedSections] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Prevent double-triggering generation on strict-mode double-mount
  const generatingRef = useRef(false)

  // ── Load material ───────────────────────────
  useEffect(() => {
    if (!Number.isFinite(materialId)) return
    getMaterial(materialId)
  }, [getMaterial, materialId])

  // ── Seed local state from persisted generatedSections ──
  useEffect(() => {
    if (!currentMaterial) return
    const content = currentMaterial.content as SectionedNotesContent
    if (content?.generatedSections) {
      setGeneratedSections(content.generatedSections)
    }
  }, [currentMaterial])

  // ── Auto-generate first section on load ────
  useEffect(() => {
    if (!currentMaterial) return
    const content = currentMaterial.content as SectionedNotesContent
    if (!content?.sections?.length) return
    if (generatedSections[0] === undefined && !generatingRef.current) {
      generateForSection(0, content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMaterial])

  // ─────────────────────────────────────────────
  // Core generation logic
  // ─────────────────────────────────────────────
  const generateForSection = useCallback(
    async (index: number, content?: SectionedNotesContent) => {
      const material = currentMaterial
      if (!material) return
      const c = content ?? (material.content as SectionedNotesContent)
      if (!c?.sections?.length) return
      if (generatingRef.current) return // already running
      if (generatedSections[index] !== undefined) return // already cached

      generatingRef.current = true
      setGenerating(true)

      try {
        const section = c.sections[index]
        console.log(`[Notes] Generating section ${index + 1}/${c.totalSections}: "${section.title}"`)

        const result = await generateSectionNotes(
          section.content,
          section.title,
          c.title,
          index,
          c.totalSections
        )

        const updated = { ...generatedSections, [index]: result.markdown }
        setGeneratedSections(updated)

        // Persist to Dexie so it survives page reloads
        const updatedContent: SectionedNotesContent = {
          ...c,
          generatedSections: updated,
        }
        await updateMaterial(material.id, { content: updatedContent })
      } catch (err: any) {
        console.error('[Notes] Section generation error:', err)
        toast({
          title: 'Generation failed',
          description: err?.message || 'Please try again.',
          type: 'error',
        })
      } finally {
        generatingRef.current = false
        setGenerating(false)
      }
    },
    [currentMaterial, generatedSections, toast, updateMaterial]
  )

  // ─────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────
  const goToSection = useCallback(
    (nextIndex: number) => {
      if (!currentMaterial) return
      const content = currentMaterial.content as SectionedNotesContent
      if (nextIndex < 0 || nextIndex >= (content?.sections?.length ?? 1)) return

      setCurrentSectionIndex(nextIndex)

      // Trigger generation if not already cached
      if (generatedSections[nextIndex] === undefined) {
        generateForSection(nextIndex)
      }
    },
    [currentMaterial, generatedSections, generateForSection]
  )

  // ─────────────────────────────────────────────
  // Copy / Download helpers
  // ─────────────────────────────────────────────
  const getAllMarkdown = useCallback(() => {
    if (!currentMaterial) return ''
    const content = currentMaterial.content as SectionedNotesContent

    // Legacy: old material with a flat markdown field
    if (!content?.sections?.length) {
      return content?.markdown || ''
    }

    // Section-based: concatenate all generated sections in order
    return content.sections
      .map((s, i) => {
        const md = generatedSections[i]
        return md ? `## ${s.title}\n\n${md}` : null
      })
      .filter(Boolean)
      .join('\n\n---\n\n')
  }, [currentMaterial, generatedSections])

  const handleCopy = async () => {
    const text = getAllMarkdown()
    if (!text) {
      toast({ title: 'Nothing to copy yet', description: 'Generate some sections first.', type: 'error' })
      return
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: 'Copied to clipboard!', type: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = getAllMarkdown()
    if (!text) {
      toast({ title: 'Nothing to download yet', description: 'Generate some sections first.', type: 'error' })
      return
    }
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentMaterial?.content?.title || 'notes'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────
  if (!currentMaterial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    )
  }

  const content = currentMaterial.content as SectionedNotesContent

  // ─────────────────────────────────────────────
  // Legacy: material has no sections (generated before this feature)
  // ─────────────────────────────────────────────
  if (!content?.sections?.length) {
    return <LegacyNotes content={content} onBack={() => router.back()} onCopy={handleCopy} onDownload={handleDownload} copied={copied} />
  }

  // ─────────────────────────────────────────────
  // Section-based view
  // ─────────────────────────────────────────────
  const totalSections = content.sections.length
  const currentSection = content.sections[currentSectionIndex]
  const currentMarkdown = generatedSections[currentSectionIndex]
  const generatedCount = Object.keys(generatedSections).length

  const progressPercent = totalSections > 0 ? Math.round((generatedCount / totalSections) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} title="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {content.title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {generatedCount} of {totalSections} section{totalSections !== 1 ? 's' : ''} generated
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copy all generated notes">
            {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} title="Download all notes as Markdown">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Section Progress Bar ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Section {currentSectionIndex + 1} of {totalSections}
            </span>
            <span className="text-sm font-medium text-primary">
              {currentSection.title}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {content.sections.map((_, i) => {
              const isGenerated = generatedSections[i] !== undefined
              const isCurrent = i === currentSectionIndex
              const isGeneratingNow = isCurrent && generating

              return (
                <button
                  key={i}
                  onClick={() => goToSection(i)}
                  title={`Go to ${content.sections[i].title}`}
                  className={`
                    rounded-full transition-all duration-200 flex items-center justify-center
                    ${isCurrent
                      ? 'w-8 h-4 bg-primary shadow-md shadow-primary/40'
                      : isGenerated
                        ? 'w-4 h-4 bg-primary/60 hover:bg-primary/80'
                        : 'w-4 h-4 bg-muted border border-border hover:border-primary/50'
                    }
                  `}
                >
                  {isGeneratingNow && (
                    <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Overall progress bar */}
          <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercent}% complete</p>
        </CardContent>
      </Card>

      {/* ── Notes Content Card ── */}
      <Card className="min-h-[400px]">
        <CardContent className="p-8">
          {generating && currentMarkdown === undefined ? (
            // First-time generation loading state
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium text-foreground">Generating detailed notes…</p>
                <p className="text-sm mt-1">
                  AI is studying <span className="text-primary font-medium">{currentSection.title}</span> for you
                </p>
              </div>
            </div>
          ) : currentMarkdown ? (
            // Render generated markdown
            <div className="markdown-content prose prose-invert max-w-none">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-lg font-semibold text-foreground">{currentSection.title}</span>
                {generating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                )}
              </div>
              <ReactMarkdown>{currentMarkdown}</ReactMarkdown>
            </div>
          ) : (
            // Not yet generated and not currently generating — shouldn't normally show,
            // but acts as a fallback with a manual trigger
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <div className="text-center">
                <p className="font-medium text-foreground">Notes not generated yet</p>
                <p className="text-sm mt-1">Click below to generate notes for {currentSection.title}</p>
              </div>
              <Button onClick={() => generateForSection(currentSectionIndex)} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Notes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Navigation Buttons ── */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => goToSection(currentSectionIndex - 1)}
          disabled={currentSectionIndex === 0 || generating}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Section
        </Button>

        <div className="text-sm text-muted-foreground text-center">
          {currentSectionIndex + 1} / {totalSections}
        </div>

        <Button
          onClick={() => goToSection(currentSectionIndex + 1)}
          disabled={currentSectionIndex === totalSections - 1 || generating}
          className="flex items-center gap-2"
        >
          {generating && currentSectionIndex < totalSections - 1 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Next Section
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Legacy view for materials generated before
// the section-by-section feature was added
// ─────────────────────────────────────────────
function LegacyNotes({
  content,
  onBack,
  onCopy,
  onDownload,
  copied,
}: {
  content: any
  onBack: () => void
  onCopy: () => void
  onDownload: () => void
  copied: boolean
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{content?.title || 'Study Notes'}</h1>
            <p className="text-muted-foreground text-sm text-yellow-500/80">
              ⚠ This note was generated with the old system. Re-upload to use section-by-section generation.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onCopy}>
            {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={onDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-8">
          <div className="markdown-content prose prose-invert max-w-none">
            <ReactMarkdown>{content?.markdown || content?.text || 'No content available.'}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
