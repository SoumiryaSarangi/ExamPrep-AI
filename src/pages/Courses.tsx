'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCourseStore } from '@/stores/courseStore'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, BookOpen, Trash2, FolderOpen } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function Courses() {
  const { courses, loading, fetchCourses, addCourse, deleteCourse } = useCourseStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({ courseCode: '', courseName: '', semester: '' })
  const { toast } = useToast()

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const handleAddCourse = async () => {
    if (!newCourse.courseCode || !newCourse.courseName) {
      toast({ title: 'Missing fields', description: 'Course code and name are required', type: 'error' }); return
    }
    const result = await addCourse(newCourse)
    if (result.success) {
      toast({ title: 'Course created!', type: 'success' })
      setNewCourse({ courseCode: '', courseName: '', semester: '' }); setIsDialogOpen(false); fetchCourses()
    } else { toast({ title: 'Error', description: result.error, type: 'error' }) }
  }

  const handleDelete = async (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation()
    if (window.confirm('Delete this course and all its materials?')) {
      await deleteCourse(id); toast({ title: 'Course deleted', type: 'success' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Organize your study materials by course</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Course</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code</Label>
                <Input id="courseCode" placeholder="CS101" value={newCourse.courseCode}
                  onChange={(e) => setNewCourse({ ...newCourse, courseCode: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name</Label>
                <Input id="courseName" placeholder="Introduction to Programming" value={newCourse.courseName}
                  onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester (Optional)</Label>
                <Input id="semester" placeholder="Fall 2024" value={newCourse.semester}
                  onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCourse}>Create Course</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any, index: number) => (
            <Link key={course.id} href={`/app/courses/${course.id}`}>
              <Card className={`cursor-pointer group animate-fade-in stagger-${Math.min(index + 1, 6)}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <Button variant="ghost" size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => handleDelete(course.id, e)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <CardTitle>{course.courseCode}</CardTitle>
                  <CardDescription>{course.courseName}</CardDescription>
                  {course.semester && <p className="text-xs text-muted-foreground mt-1">{course.semester}</p>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="No courses yet"
          description="Create your first course to start organizing your study materials and unlock AI-generated notes, flashcards & quizzes."
          actionLabel="Create Course"
          onAction={() => setIsDialogOpen(true)}
        />
      )}
    </div>
  )
}
