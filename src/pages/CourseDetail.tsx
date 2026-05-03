'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCourseStore } from '@/stores/courseStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useMaterialStore } from '@/stores/materialStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Upload, FileText, LayoutGrid, Brain, GitBranch, Trash2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function CourseDetail() {
  const params = useParams<{ courseId: string }>()
  const courseId = Number(params?.courseId || 0)
  const router = useRouter()
  const { currentCourse, getCourse } = useCourseStore()
  const { documents, fetchDocuments, deleteDocument } = useDocumentStore()
  const { materials, fetchMaterials } = useMaterialStore()
  const { toast } = useToast()
  const [courseDocuments, setCourseDocuments] = useState<any[]>([])
  const [courseMaterials, setCourseMaterials] = useState<any[]>([])

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

  const handleDeleteDoc = async (id: number) => {
    if (window.confirm('Delete this document and its materials?')) {
      await deleteDocument(id)
      toast({ title: 'Document deleted', type: 'success' })
    }
  }

  if (!currentCourse) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  const notes = courseMaterials.filter((m) => m.type === 'notes')
  const flashcards = courseMaterials.filter((m) => m.type === 'flashcards')
  const quizzes = courseMaterials.filter((m) => m.type === 'quiz')
  const diagrams = courseMaterials.filter((m) => m.type === 'diagram')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/courses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{currentCourse.courseCode}</h1>
          <p className="text-muted-foreground">{currentCourse.courseName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{notes.length}</p>
            <p className="text-sm text-muted-foreground">Notes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <LayoutGrid className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{flashcards.length}</p>
            <p className="text-sm text-muted-foreground">Flashcards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{quizzes.length}</p>
            <p className="text-sm text-muted-foreground">Quizzes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <GitBranch className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{diagrams.length}</p>
            <p className="text-sm text-muted-foreground">Diagrams</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents ({courseDocuments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards ({flashcards.length})</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes ({quizzes.length})</TabsTrigger>
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
          <MaterialList materials={flashcards} type="flashcards" />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <MaterialList materials={quizzes} type="quiz" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MaterialList({ materials, type }: { materials: any[]; type: string }) {
  if (materials.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center text-muted-foreground">
          No {type} generated yet. Upload a document to create study materials.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {materials.map((material) => (
        <Link key={material.id} href={`/app/${type}/${material.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{material.content?.title || `${type} #${material.id}`}</p>
                <p className="text-sm text-muted-foreground">{new Date(material.generatedAt).toLocaleDateString()}</p>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
