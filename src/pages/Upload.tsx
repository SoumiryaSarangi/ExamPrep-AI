'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCourseStore } from '@/stores/courseStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useMaterialStore } from '@/stores/materialStore'
import { extractPdfText, extractPptxText } from '@/lib/parsers/documentParser'
import { splitIntoSections } from '@/lib/parsers/textSplitter'
import { generateStudyMaterials } from '@/lib/ai/aiService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Upload as UploadIcon,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function UploadPage() {
  const router = useRouter()
  const { courses, fetchCourses } = useCourseStore()
  const { addDocument, updateDocument } = useDocumentStore()
  const { addMaterial } = useMaterialStore()
  const { toast } = useToast()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedCourse, setSelectedCourse] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const appendFiles = useCallback(
    (incomingFiles: File[]) => {
      const validFiles = incomingFiles.filter(
        (f) => f.type === 'application/pdf' || f.name.endsWith('.pptx') || f.name.endsWith('.ppt')
      )

      if (validFiles.length !== incomingFiles.length) {
        toast({ title: 'Some files skipped', description: 'Only PDF and PPT files are supported', type: 'error' })
      }

      setFiles((prev) => [...prev, ...validFiles])
    },
    [toast]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      appendFiles(Array.from(e.dataTransfer.files || []))
    },
    [appendFiles]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      appendFiles(Array.from(e.target.files || []))
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [appendFiles]
  )

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (!selectedCourse) {
      toast({ title: 'Select a course', description: 'Choose a course to upload to', type: 'error' })
      return
    }
    if (files.length === 0) {
      toast({ title: 'No files', description: 'Add files to upload', type: 'error' })
      return
    }

    setProcessing(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const stepBase = (i / files.length) * 100

        setCurrentStep(`Processing ${file.name}...`)
        setProgress(stepBase + 5)

        const docResult = await addDocument({
          courseId: Number(selectedCourse),
          filename: file.name,
          fileType: file.name.endsWith('.pdf') ? 'PDF' : 'PPT',
          extractedText: '',
          status: 'processing',
        })

        if (!docResult.success || !docResult.document) {
          throw new Error(docResult.error || 'Failed to save document')
        }

        setCurrentStep(`Extracting text from ${file.name}...`)
        setProgress(stepBase + 20)

        let extractedText = ''
        if (file.name.endsWith('.pdf')) {
          extractedText = await extractPdfText(file)
        } else {
          extractedText = await extractPptxText(file)
        }

        // ── Split into sections for per-section note generation ──
        setCurrentStep(`Splitting ${file.name} into sections...`)
        const sections = splitIntoSections(extractedText)
        console.log(`[Upload] Split "${file.name}" into ${sections.length} section(s)`)

        await updateDocument(docResult.document.id, {
          extractedText,
          sections: JSON.stringify(sections),
          status: 'extracted',
        })

        // ── Create notes container (no content yet — generated lazily) ──
        await addMaterial({
          documentId: docResult.document.id,
          type: 'notes',
          content: {
            title: `Notes: ${file.name}`,
            sections,
            generatedSections: {},
            totalSections: sections.length,
            markdown: '',
          },
        })

        // ── Create flashcards container (no cards yet — generated on-demand) ──
        const cleanName = file.name.replace(/\.[^/.]+$/, '')
        await addMaterial({
          documentId: docResult.document.id,
          type: 'flashcards',
          content: {
            title: `Flashcards: ${cleanName}`,
            cards: [],
          },
        })

        // ── Auto-generate quiz only (notes are section-by-section, flashcards are on-demand) ──
        setCurrentStep(`Generating quiz for ${file.name}...`)
        setProgress(stepBase + 50)

        const materials = await generateStudyMaterials(extractedText, file.name)

        setCurrentStep(`Saving ${materials.length} materials...`)
        setProgress(stepBase + 80)

        for (const material of materials) {
          const content = { ...material.content }
          const cleanName = file.name.replace(/\.[^/.]+$/, "")
          
          if (material.type === 'quiz') content.title = `Quiz: ${cleanName}`

          await addMaterial({
            documentId: docResult.document.id,
            type: material.type,
            content,
          })
        }


        await updateDocument(docResult.document.id, { status: 'completed' })
        setProgress(stepBase + 100 / files.length)
      }

      setProgress(100)
      setCurrentStep('Complete!')
      toast({ title: 'Success!', description: 'Study materials generated', type: 'success' })

      setTimeout(() => {
        router.push(`/app/courses/${selectedCourse}`)
      }, 1200)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed while processing files', type: 'error' })
      setCurrentStep('')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Documents</h1>
        <p className="text-muted-foreground">Upload lecture slides to generate study materials</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course: any) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.courseCode} - {course.courseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {courses.length === 0 && <p className="text-sm text-muted-foreground mt-2">No courses yet. Create one first.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Drop files here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Supports PDF, PPT, PPTX</p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Files to Upload ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={processing}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {processing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{currentStep}</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      <Button size="lg" className="w-full" onClick={processFiles} disabled={processing || files.length === 0 || !selectedCourse}>
        {processing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <UploadIcon className="mr-2 h-5 w-5" />
            Generate Study Materials
          </>
        )}
      </Button>
    </div>
  )
}
