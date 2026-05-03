'use client'

import { create } from 'zustand'
import { db } from '../lib/db'

interface DocumentState {
  documents: any[]
  currentDocument: any | null
  loading: boolean
  error: string | null
  fetchDocuments: (courseId?: number | null) => Promise<void>
  getDocument: (id: number) => Promise<any | null>
  addDocument: (docData: any) => Promise<{ success: boolean; document?: any; error?: string }>
  updateDocument: (id: number, data: any) => Promise<{ success: boolean; error?: string }>
  deleteDocument: (id: number) => Promise<{ success: boolean; error?: string }>
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,

  fetchDocuments: async (courseId = null) => {
    set({ loading: true })
    try {
      let documents
      if (courseId) {
        documents = await db.documents.where('courseId').equals(Number(courseId)).toArray()
      } else {
        documents = await db.documents.toArray()
      }
      set({ documents, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  getDocument: async (id) => {
    try {
      const doc = await db.documents.get(parseInt(String(id)))
      set({ currentDocument: doc })
      return doc
    } catch (error) {
      set({ error: error.message })
      return null
    }
  },

  addDocument: async (docData) => {
    try {
      const id = await db.documents.add({
        ...docData,
        status: 'uploaded',
        uploadedAt: new Date().toISOString()
      } as any)
      const newDoc = await db.documents.get(id)
      set(state => ({ documents: [...state.documents, newDoc] }))
      return { success: true, document: newDoc }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updateDocument: async (id, data) => {
    try {
      await db.documents.update(id, data)
      set(state => ({
        documents: state.documents.map(d => d.id === id ? { ...d, ...data } : d),
        currentDocument: state.currentDocument?.id === id 
          ? { ...state.currentDocument, ...data }
          : state.currentDocument
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  deleteDocument: async (id) => {
    try {
      // Delete related materials first
      await db.materials.where('documentId').equals(id).delete()
      await db.documents.delete(id)
      
      set(state => ({
        documents: state.documents.filter(d => d.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}))
