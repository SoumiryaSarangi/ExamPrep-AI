'use client'

import { create } from 'zustand'
import { db } from '../lib/db'

interface CourseState {
  courses: any[]
  currentCourse: any | null
  loading: boolean
  error: string | null
  fetchCourses: () => Promise<void>
  getCourse: (id: number) => Promise<any | null>
  addCourse: (courseData: any) => Promise<{ success: boolean; course?: any; error?: string }>
  updateCourse: (id: number, data: any) => Promise<{ success: boolean; error?: string }>
  deleteCourse: (id: number) => Promise<{ success: boolean; error?: string }>
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true })
    try {
      const courses = await db.courses.toArray()
      set({ courses, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  getCourse: async (id) => {
    try {
      const course = await db.courses.get(parseInt(String(id)))
      set({ currentCourse: course })
      return course
    } catch (error) {
      set({ error: error.message })
      return null
    }
  },

  addCourse: async (courseData) => {
    try {
      const id = await db.courses.add({
        ...courseData,
        createdAt: new Date().toISOString()
      } as any)
      const newCourse = await db.courses.get(id)
      set(state => ({ courses: [...state.courses, newCourse] }))
      return { success: true, course: newCourse }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updateCourse: async (id, data) => {
    try {
      await db.courses.update(id, data)
      set(state => ({
        courses: state.courses.map(c => c.id === id ? { ...c, ...data } : c),
        currentCourse: state.currentCourse?.id === id 
          ? { ...state.currentCourse, ...data }
          : state.currentCourse
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  deleteCourse: async (id) => {
    try {
      await db.courses.delete(id)
      // Also delete related documents and materials
      const docs = await db.documents.where('courseId').equals(id).toArray()
      for (const doc of docs) {
        if (doc.id !== undefined) {
          await db.materials.where('documentId').equals(doc.id).delete()
        }
      }
      await db.documents.where('courseId').equals(id).delete()
      
      set(state => ({
        courses: state.courses.filter(c => c.id !== id),
        currentCourse: state.currentCourse?.id === id ? null : state.currentCourse
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}))
