'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCourseStore } from '@/stores/courseStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useMaterialStore } from '@/stores/materialStore'
import { extractPdfText, extractPptxText } from '@/lib/parsers/documentParser'
import { splitIntoSections } from '@/lib/parsers/textSplitter'
import { generateStudyMaterials } from '@/lib/ai/aiService'
import { indexDocument } from '@/lib/embeddings/indexer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MagneticButton } from '@/components/ui/magnetic-button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload as UploadIcon, FileText, Loader2, X, Sparkles, BookOpen } from 'lucide-react'
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
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const appendFiles = useCallback((incomingFiles: File[]) => {
    const validFiles = incomingFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pptx') || f.name.endsWith('.ppt'))
    if (validFiles.length !== incomingFiles.length) toast({ title: 'Some files skipped', description: 'Only PDF and PPT files are supported', type: 'error' })
    setFiles((prev) => [...prev, ...validFiles])
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false)
    appendFiles(Array.from(e.dataTransfer.files || []))
  }, [appendFiles])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    appendFiles(Array.from(e.target.files || []))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [appendFiles])

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index))

  const processFiles = async () => {
    if (!selectedCourse) { toast({ title: 'Select a course', description: 'Choose a course to upload to', type: 'error' }); return }
    if (files.length === 0) { toast({ title: 'No files', description: 'Add files to upload', type: 'error' }); return }
    setProcessing(true); setProgress(0)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; const stepBase = (i / files.length) * 100
        setCurrentStep(`Processing ${file.name}...`); setProgress(stepBase + 5)
        const docResult = await addDocument({ courseId: Number(selectedCourse), filename: file.name, fileType: file.name.endsWith('.pdf') ? 'PDF' : 'PPT', extractedText: '', status: 'processing' })
        if (!docResult.success || !docResult.document) throw new Error(docResult.error || 'Failed to save document')
        setCurrentStep(`Extracting text from ${file.name}...`); setProgress(stepBase + 20)
        let extractedText = ''
        if (file.name.endsWith('.pdf')) extractedText = await extractPdfText(file)
        else extractedText = await extractPptxText(file)
        setCurrentStep(`Splitting ${file.name} into sections...`)
        const sections = splitIntoSections(extractedText)
        console.log(`[Upload] Split "${file.name}" into ${sections.length} section(s)`)
        await updateDocument(docResult.document.id, { extractedText, sections: JSON.stringify(sections), status: 'extracted' })
        
        indexDocument(docResult.document.id, Number(selectedCourse), sections).catch(err =>
          console.error('[Tutor] Background indexing failed:', err))

        await addMaterial({ documentId: docResult.document.id, type: 'notes', content: { title: `Notes: ${file.name}`, sections, generatedSections: {}, totalSections: sections.length, markdown: '' } })
        const cleanName = file.name.replace(/\.[^/.]+$/, '')
        await addMaterial({ documentId: docResult.document.id, type: 'flashcards', content: { title: `Flashcards: ${cleanName}`, cards: [] } })
        setCurrentStep(`Generating quiz for ${file.name}...`); setProgress(stepBase + 50)
        const materials = await generateStudyMaterials(extractedText, file.name)
        setCurrentStep(`Saving ${materials.length} materials...`); setProgress(stepBase + 80)
        for (const material of materials) {
          const content = { ...material.content }
          const cn = file.name.replace(/\.[^/.]+$/, "")
          if (material.type === 'quiz') content.title = `Quiz: ${cn}`
          await addMaterial({ documentId: docResult.document.id, type: material.type, content })
        }
        await updateDocument(docResult.document.id, { status: 'completed' }); setProgress(stepBase + 100 / files.length)
      }
      setProgress(100); setCurrentStep('Complete!')
      toast({ title: 'Success!', description: 'Study materials generated', type: 'success' })
      setTimeout(() => router.push(`/app/courses/${selectedCourse}`), 1200)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed while processing files', type: 'error' }); setCurrentStep('')
    } finally { setProcessing(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm text-primary font-medium">Upload</span>
        </div>
        <h1 className="text-3xl font-bold">Upload Documents</h1>
        <p className="text-muted-foreground">Upload lecture slides to generate study materials</p>
      </div>

      <Card className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <CardHeader><CardTitle>Select Course</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
            <SelectContent>{courses.map((course: any) => (
              <SelectItem key={course.id} value={String(course.id)}>{course.courseCode} - {course.courseName}</SelectItem>
            ))}</SelectContent>
          </Select>
          {courses.length === 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03]">
              <BookOpen className="h-4 w-4 text-primary/50 shrink-0" />
              <span>
                No courses yet -{' '}
                <Link href="/app/courses" className="text-primary underline underline-offset-2">
                  create one first
                </Link>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardContent className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-white/[0.02]'
            }`}
            onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.ppt,.pptx" onChange={handleFileChange} className="hidden" />
            <div className={`h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-primary/15 scale-110' : 'bg-muted/50'}`}>
              <UploadIcon className={`h-7 w-7 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-lg font-medium mb-1">Drop files here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Supports PDF, PPT, PPTX</p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card className="animate-fade-in-scale">
          <CardHeader><CardTitle>Files to Upload ({files.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className={`flex items-center justify-between p-3 rounded-xl glass-subtle animate-slide-in-left stagger-${Math.min(index+1, 6)}`}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={processing} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {processing && (
        <Card className="animate-fade-in-scale border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <span className="text-sm font-medium">{currentStep}</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      <MagneticButton size="lg" className="w-full gap-2" intensity={6} onClick={processFiles} disabled={processing || files.length === 0 || !selectedCourse}>
        {processing ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>) : (<><UploadIcon className="mr-2 h-5 w-5" /> Generate Study Materials</>)}
      </MagneticButton>
    </div>
  )
}
