'use client'

import Dexie, { type Table } from 'dexie'

export interface CourseRecord {
  id?: number
  courseCode: string
  courseName: string
  semester?: string
  createdAt: string
}

export interface DocumentRecord {
  id?: number
  courseId: number
  filename: string
  fileType: string
  extractedText: string
  /** JSON-stringified Section[] — populated after upload */
  sections?: string
  status: string
  uploadedAt: string
}

export interface MaterialRecord {
  id?: number
  documentId: number
  type: string
  content: Record<string, any>
  generatedAt: string
}

export interface FlashcardRecord {
  id?: number
  materialId: number
  front: string
  back: string
  difficulty?: string
  nextReview?: string
  repetitions?: number
  easeFactor?: number
  interval?: number
}

export interface QuizAttemptRecord {
  id?: number
  materialId: number
  score: number
  answers: Array<Record<string, any>>
  attemptedAt: string
  durationSeconds?: number
}

export interface StudySessionRecord {
  id?: number
  date: string
  duration?: number
  cardsReviewed?: number
  quizzesTaken?: number
}

export interface WeakAreaRecord {
  id?: number
  courseId: number
  topic: string
  wrongCount: number
  totalAttempts: number
  lastUpdated: string
}

class ExamHelperDB extends Dexie {
  courses!: Table<CourseRecord, number>
  documents!: Table<DocumentRecord, number>
  materials!: Table<MaterialRecord, number>
  flashcards!: Table<FlashcardRecord, number>
  quizAttempts!: Table<QuizAttemptRecord, number>
  studySessions!: Table<StudySessionRecord, number>
  weakAreas!: Table<WeakAreaRecord, number>

  constructor() {
    super('ExamHelperDB')

    this.version(1).stores({
      courses: '++id, courseCode, courseName, semester, createdAt',
      documents: '++id, courseId, filename, fileType, extractedText, status, uploadedAt',
      materials: '++id, documentId, type, content, generatedAt',
      flashcards: '++id, materialId, front, back, difficulty, nextReview, repetitions, easeFactor',
      quizAttempts: '++id, materialId, score, answers, attemptedAt',
      studySessions: '++id, date, duration, cardsReviewed, quizzesTaken',
    })

    // v2: adds sections field to documents for section-by-section note generation
    this.version(2).stores({
      courses: '++id, courseCode, courseName, semester, createdAt',
      documents: '++id, courseId, filename, fileType, extractedText, sections, status, uploadedAt',
      materials: '++id, documentId, type, content, generatedAt',
      flashcards: '++id, materialId, front, back, difficulty, nextReview, repetitions, easeFactor',
      quizAttempts: '++id, materialId, score, answers, attemptedAt',
      studySessions: '++id, date, duration, cardsReviewed, quizzesTaken',
    })

    // v3: adds weakAreas table for tracking per-topic quiz performance
    this.version(3).stores({
      courses: '++id, courseCode, courseName, semester, createdAt',
      documents: '++id, courseId, filename, fileType, extractedText, sections, status, uploadedAt',
      materials: '++id, documentId, type, content, generatedAt',
      flashcards: '++id, materialId, front, back, difficulty, nextReview, repetitions, easeFactor',
      quizAttempts: '++id, materialId, score, answers, attemptedAt',
      studySessions: '++id, date, duration, cardsReviewed, quizzesTaken',
      weakAreas: '++id, courseId, topic, wrongCount, totalAttempts, lastUpdated',
    })

    // v4: adds compound index [courseId+topic] to weakAreas
    this.version(4).stores({
      courses: '++id, courseCode, courseName, semester, createdAt',
      documents: '++id, courseId, filename, fileType, extractedText, sections, status, uploadedAt',
      materials: '++id, documentId, type, content, generatedAt',
      flashcards: '++id, materialId, front, back, difficulty, nextReview, repetitions, easeFactor',
      quizAttempts: '++id, materialId, score, answers, attemptedAt',
      studySessions: '++id, date, duration, cardsReviewed, quizzesTaken',
      weakAreas: '++id, courseId, topic, wrongCount, totalAttempts, lastUpdated, [courseId+topic]',
    })
  }
}

export const db = new ExamHelperDB()

// Initialize with demo data if empty
export async function initializeDB() {
  const courseCount = await db.courses.count()
  if (courseCount === 0) {
    // Add sample course
    await db.courses.add({
      courseCode: 'CS101',
      courseName: 'Introduction to Programming',
      semester: 'Fall 2024',
      createdAt: new Date().toISOString()
    })
  }
}
