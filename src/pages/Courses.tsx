'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCourseStore } from '@/stores/courseStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleAddCourse = async () => {
    if (!newCourse.courseCode || !newCourse.courseName) {
      toast({ title: 'Missing fields', description: 'Course code and name are required', type: 'error' })
      return
    }

    const result = await addCourse(newCourse)
    if (result.success) {
      toast({ title: 'Course created!', type: 'success' })
      setNewCourse({ courseCode: '', courseName: '', semester: '' })
      setIsDialogOpen(false)
      fetchCourses()
    } else {
      toast({ title: 'Error', description: result.error, type: 'error' })
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm('Delete this course and all its materials?')) {
      await deleteCourse(id)
      toast({ title: 'Course deleted', type: 'success' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Organize your study materials by course</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code</Label>
                <Input
                  id="courseCode"
                  placeholder="CS101"
                  value={newCourse.courseCode}
                  onChange={(e) => setNewCourse({ ...newCourse, courseCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name</Label>
                <Input
                  id="courseName"
                  placeholder="Introduction to Programming"
                  value={newCourse.courseName}
                  onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester (Optional)</Label>
                <Input
                  id="semester"
                  placeholder="Fall 2024"
                  value={newCourse.semester}
                  onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCourse}>Create Course</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => (
            <Link key={course.id} href={`/app/courses/${course.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(course.id, e)}
                    >
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
        <Card className="py-12">
          <CardContent className="text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">Create your first course to start organizing your study materials.</p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
