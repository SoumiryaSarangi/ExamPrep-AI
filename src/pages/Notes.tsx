'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import { useAuthStore } from '@/stores/authStore'
import { generateSectionNotes } from '@/lib/ai/aiService'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SelectionMenu } from '@/components/ui/selection-menu'
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
import { useTextScramble } from '@/hooks/useTextScramble'
import { useTextSelection } from '@/hooks/useTextSelection'
import type { Section } from '@/lib/parsers/textSplitter'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [generatedSections, setGeneratedSections] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Prevent double-triggering generation on strict-mode double-mount
  const generatingRef = useRef(false)
  // Track which section indexes are currently in-flight — avoids stale-closure race
  const inFlightRef   = useRef<Set<number>>(new Set())
  // Guard so the auto-generate on first load only fires once
  const autoStartedRef = useRef(false)
  const markdownRef = useRef<HTMLDivElement>(null)
  const selection = useTextSelection(markdownRef)

  // Compute values for useTextScramble safely before early returns
  const _content = currentMaterial?.content as SectionedNotesContent | undefined
  const _sectionTitle = _content?.sections?.[currentSectionIndex]?.title || 'this section'
  const _currentMarkdown = _content?.sections?.length ? generatedSections[currentSectionIndex] : undefined
  const _scrambleActive = generating && _currentMarkdown === undefined
  const scrambledText = useTextScramble(
    `AI is studying "${_sectionTitle}" for you...`,
    { active: _scrambleActive }
  )

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

  // ── Auto-generate first section on load — fires ONCE only ──
  useEffect(() => {
    if (!currentMaterial) return
    if (autoStartedRef.current) return   // already kicked off — do not re-run
    const content = currentMaterial.content as SectionedNotesContent
    if (!content?.sections?.length) return

    // Only auto-start if section 0 has never been generated
    if (content.generatedSections?.[0] === undefined) {
      autoStartedRef.current = true
      generateForSection(0, content)
    } else {
      autoStartedRef.current = true   // already cached, mark as done
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

      // Strict single-section guards — no parallel generation allowed
      if (generatingRef.current) {
        console.log(`[Notes] Skipping section ${index + 1} — another section is already generating`)
        return
      }
      if (inFlightRef.current.has(index)) {
        console.log(`[Notes] Skipping section ${index + 1} — already in-flight`)
        return
      }
      // Use the persisted generatedSections from the DB content, not the potentially stale local state
      const persistedSections = (material.content as SectionedNotesContent).generatedSections ?? {}
      if (persistedSections[index] !== undefined) {
        console.log(`[Notes] Section ${index + 1} already cached — skipping`)
        return
      }

      console.log(`[Notes] ✅ Generating section ${index + 1} ONLY — no other sections will be touched`)

      generatingRef.current = true
      inFlightRef.current.add(index)
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

        const updatedSections = {
          ...((material.content as SectionedNotesContent).generatedSections ?? {}),
          [index]: result.markdown,
        }
        setGeneratedSections(updatedSections)

        // Persist to Dexie so it survives page reloads
        const updatedContent: SectionedNotesContent = {
          ...c,
          generatedSections: updatedSections,
        }
        await updateMaterial(material.id, { content: updatedContent })
        console.log(`[Notes] ✅ Section ${index + 1} saved to DB`)
      } catch (err: any) {
        console.error('[Notes] Section generation error:', err)
        toast({
          title: 'Generation failed',
          description: err?.message || 'Please try again.',
          type: 'error',
        })
      } finally {
        generatingRef.current = false
        inFlightRef.current.delete(index)
        setGenerating(false)
      }
    },
    // Only depend on currentMaterial — avoid re-creating on every generatedSections state update
    // (we read persisted state from material.content directly, not from React state)
    [currentMaterial, toast, updateMaterial]
  )

  // ─────────────────────────────────────────────
  // Navigation — auto-generates if section not cached
  // ─────────────────────────────────────────────
  const goToSection = useCallback(
    (nextIndex: number) => {
      if (!currentMaterial) return
      const content = currentMaterial.content as SectionedNotesContent
      if (nextIndex < 0 || nextIndex >= (content?.sections?.length ?? 1)) return

      setCurrentSectionIndex(nextIndex)

      // Auto-generate if this section hasn't been generated yet
      const persistedSections = content.generatedSections ?? {}
      if (persistedSections[nextIndex] === undefined && !generatingRef.current) {
        console.log(`[Notes] Navigated to section ${nextIndex + 1} — auto-generating`)
        generateForSection(nextIndex, content)
      } else {
        console.log(`[Notes] Navigated to section ${nextIndex + 1} — already cached`)
      }
    },
    [currentMaterial, generateForSection]
  )


  // ─────────────────────────────────────────────
  // Safe markdown extractor — handles cases where
  // stored content is accidentally a JSON string
  // ─────────────────────────────────────────────
  const safeMarkdown = useCallback((raw: string | undefined): string => {
    if (!raw) return ''
    const trimmed = raw.trim()

    // If it looks like JSON with a "markdown" field, extract it
    if (trimmed.startsWith('{') && trimmed.includes('"markdown"')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed?.markdown) return parsed.markdown
      } catch {
        // Not valid JSON — fall through
      }
    }

    // Strip accidental code fences
    return trimmed
      .replace(/^```(?:markdown)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
  }, [])

  // ─────────────────────────────────────────────
  // Copy / Download helpers
  // ─────────────────────────────────────────────
  const getAllMarkdown = useCallback(() => {
    if (!currentMaterial) return ''
    const content = currentMaterial.content as SectionedNotesContent

    // Legacy: old material with a flat markdown field
    if (!content?.sections?.length) {
      return safeMarkdown(content?.markdown || '')
    }

    // Section-based: concatenate all generated sections in order
    return content.sections
      .map((s, i) => {
        const md = safeMarkdown(generatedSections[i])
        return md ? `## ${s.title}\n\n${md}` : null
      })
      .filter(Boolean)
      .join('\n\n---\n\n')
  }, [currentMaterial, generatedSections, safeMarkdown])

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

  const handleDownload = async () => {
    if (!currentMaterial) return
    const content = currentMaterial.content as SectionedNotesContent
    const title = content?.title || 'Notes'

    // Gather all generated markdown in section order
    const sectionsToRender: { title: string; markdown: string }[] = []

    if (content?.sections?.length) {
      content.sections.forEach((s, i) => {
        const md = safeMarkdown(generatedSections[i])
        if (md) sectionsToRender.push({ title: s.title, markdown: md })
      })
    } else {
      const md = safeMarkdown(content?.markdown || '')
      if (md) sectionsToRender.push({ title, markdown: md })
    }

    if (sectionsToRender.length === 0) {
      toast({ title: 'Nothing to download yet', description: 'Generate some sections first.', type: 'error' })
      return
    }

    setDownloading(true)
    toast({ title: 'Generating PDF...', description: 'This may take a few seconds.', type: 'success' })

    try {
      // ── Hidden white-themed container (never visible to user) ──
      const container = document.createElement('div')
      container.style.cssText = `
        position: fixed; top: -99999px; left: -99999px;
        width: 700px; padding: 40px 60px;
        background: #ffffff; color: #111111;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 13px; line-height: 1.75;
      `

      // ── Cover page ──
      const cover = document.createElement('div')
      cover.style.cssText = `
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        min-height: 920px; text-align: center;
      `
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
      const authorName = (user as any)?.user_metadata?.name || user?.name || user?.email || 'Student'
      cover.innerHTML = `
        <div>
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; line-height: 1.3;">${title}</div>
          <div style="width: 60px; height: 2px; background: #1a1a2e; margin: 28px auto;"></div>
          <div style="font-family: Georgia, serif; font-size: 15px; color: #444; margin-top: 28px;">Created by: <strong style="color: #111;">${authorName}</strong></div>
          <div style="font-family: Georgia, serif; font-size: 13px; color: #666; margin-top: 6px;">Generated on ${dateStr}</div>
          <div style="font-family: Arial, sans-serif; font-size: 11px; color: #999; margin-top: 48px; letter-spacing: 0.5px;">SenseiAI</div>
        </div>
      `
      container.appendChild(cover)

      // ── Section content ──
      for (const section of sectionsToRender) {
        const sectionDiv = document.createElement('div')
        sectionDiv.style.cssText = 'margin-top: 24px; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid #e0e0e0;'

        const htmlContent = section.markdown
          // Headings — must be processed h3 before h2 to avoid double-matching
          .replace(/^### (.+)$/gm,
            '<h3 style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#1a1a2e;margin:18px 0 6px;">$1</h3>')
          .replace(/^## (.+)$/gm,
            '<h2 style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#1a1a2e;margin:24px 0 10px;border-bottom:1px solid #ddd;padding-bottom:6px;">$1</h2>')
          // Inline formatting
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          // Bullet points — tight spacing
          .replace(/^- (.+)$/gm,
            '<div style="padding-left:24px;margin:0 0 4px 0;text-indent:-14px;">• $1</div>')
          // Numbered lists — tight spacing
          .replace(/^(\d+)\. (.+)$/gm,
            '<div style="padding-left:24px;margin:0 0 4px 0;">$1. $2</div>')
          // Paragraph breaks
          .replace(/\n\n/g, '<div style="margin:8px 0;"></div>')
          .replace(/\n/g, '<br/>')

        sectionDiv.innerHTML = htmlContent
        container.appendChild(sectionDiv)
      }

      document.body.appendChild(container)

      // ── Capture as one tall canvas ──
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      document.body.removeChild(container)

      // ── Smart pagination: slice at whitespace gaps, never through text ──
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfPageWidthMm = pdf.internal.pageSize.getWidth()
      const pdfPageHeightMm = pdf.internal.pageSize.getHeight()

      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      // How many canvas pixels correspond to one PDF page height
      const pageHeightPx = Math.floor((pdfPageHeightMm / pdfPageWidthMm) * canvasWidth)

      const ctx = canvas.getContext('2d')!
      const bgR = 255, bgG = 255, bgB = 255 // white background

      /**
       * Scan upward from `startY` looking for a horizontal row that is
       * entirely background-colored (whitespace gap between elements).
       * Returns the y-coordinate of the best cut point.
       */
      function findWhitespaceGap(startY: number): number {
        // Don't scan more than 20% of a page upward
        const maxScanUp = Math.floor(pageHeightPx * 0.2)
        const minY = Math.max(0, startY - maxScanUp)

        for (let y = startY; y > minY; y--) {
          const row = ctx.getImageData(0, y, canvasWidth, 1).data
          let isBlank = true
          // Sample every 4th pixel for speed (still accurate enough)
          for (let x = 0; x < canvasWidth * 4; x += 16) {
            const r = row[x], g = row[x + 1], b = row[x + 2]
            if (Math.abs(r - bgR) > 8 || Math.abs(g - bgG) > 8 || Math.abs(b - bgB) > 8) {
              isBlank = false
              break
            }
          }
          if (isBlank) return y
        }
        // No gap found — fall back to the original cut point
        return startY
      }

      // Build list of slice points
      const slicePoints: number[] = [0]
      let currentY = 0

      while (currentY + pageHeightPx < canvasHeight) {
        const idealCut = currentY + pageHeightPx
        const smartCut = findWhitespaceGap(idealCut)
        slicePoints.push(smartCut)
        currentY = smartCut
      }

      // Render each slice as a PDF page
      for (let i = 0; i < slicePoints.length; i++) {
        const sliceTop = slicePoints[i]
        const sliceBottom = i + 1 < slicePoints.length ? slicePoints[i + 1] : canvasHeight
        const sliceHeight = sliceBottom - sliceTop

        if (sliceHeight <= 0) continue

        // Extract this slice from the big canvas
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvasWidth
        pageCanvas.height = sliceHeight
        const pageCtx = pageCanvas.getContext('2d')!
        pageCtx.drawImage(canvas, 0, sliceTop, canvasWidth, sliceHeight, 0, 0, canvasWidth, sliceHeight)

        const pageImg = pageCanvas.toDataURL('image/png')
        const pageHeightMm = (sliceHeight / canvasWidth) * pdfPageWidthMm

        if (i > 0) pdf.addPage()
        pdf.addImage(pageImg, 'PNG', 0, 0, pdfPageWidthMm, pageHeightMm)
      }

      pdf.save(`${title}.pdf`)
      toast({ title: 'PDF downloaded!', type: 'success' })
    } catch (err: any) {
      console.error('[Notes] PDF generation error:', err)
      toast({ title: 'PDF generation failed', description: err?.message || 'Please try again.', type: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  const handleExplain = async () => {
    if (!selection.text) return
    selection.dismiss()
    toast({ title: 'Explaining...', type: 'success' })
  }

  const handleMakeFlashcard = async () => {
    if (!selection.text) return
    selection.dismiss()
    toast({ title: 'Creating flashcard...', type: 'success' })
  }

  const handleSummarize = async () => {
    if (!selection.text) return
    selection.dismiss()
    toast({ title: 'Summarizing...', type: 'success' })
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
  const sectionTitle = content?.sections?.[currentSectionIndex]?.title || 'this section'
  const currentMarkdown = content?.sections?.length ? generatedSections[currentSectionIndex] : undefined

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
  const generatedCount = Object.keys(generatedSections).length

  const progressPercent = totalSections > 0 ? Math.round((generatedCount / totalSections) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} title="Go back" className="rounded-xl">
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
          <Button variant="outline" size="icon" onClick={handleDownload} disabled={downloading} title="Download all notes as PDF">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
          <div className="mt-6 p-4 glass-subtle rounded-xl">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">{progressPercent}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes Content Card ── */}
      <Card className="min-h-[400px] animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardContent className="p-8">
          {generating && currentMarkdown === undefined ? (
            // First-time generation loading state
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium text-foreground">Generating detailed notes...</p>
                <p className="text-sm mt-1 font-mono text-primary/80">{scrambledText}</p>
              </div>
            </div>
          ) : currentMarkdown ? (
            // Render generated markdown
            <div ref={markdownRef} className="markdown-content prose prose-invert max-w-none">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-lg font-semibold text-foreground">{currentSection.title}</span>
                {generating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                )}
              </div>
              <ReactMarkdown>{safeMarkdown(currentMarkdown)}</ReactMarkdown>
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
          <SelectionMenu
            x={selection.x}
            y={selection.y}
            visible={selection.visible}
            onExplain={handleExplain}
            onFlashcard={handleMakeFlashcard}
            onSummarize={handleSummarize}
          />
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
  // Safely extract markdown — handles JSON-wrapped content
  let markdown = content?.markdown || content?.text || 'No content available.'
  if (typeof markdown === 'string') {
    const trimmed = markdown.trim()
    if (trimmed.startsWith('{') && trimmed.includes('"markdown"')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed?.markdown) markdown = parsed.markdown
      } catch { /* not JSON — use as-is */ }
    }
    markdown = markdown
      .replace(/^```(?:markdown)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
  }

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
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
