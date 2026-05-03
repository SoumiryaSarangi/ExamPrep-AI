'use client'

import { create } from 'zustand'
import { db } from '../lib/db'

interface MaterialState {
  materials: any[]
  currentMaterial: any | null
  loading: boolean
  error: string | null
  fetchMaterials: (documentId?: number | null) => Promise<void>
  getMaterial: (id: number) => Promise<any | null>
  addMaterial: (materialData: any) => Promise<{ success: boolean; material?: any; error?: string }>
  updateMaterial: (id: number, data: any) => Promise<{ success: boolean; error?: string }>
  deleteMaterial: (id: number) => Promise<{ success: boolean; error?: string }>
}

export const useMaterialStore = create<MaterialState>((set) => ({
  materials: [],
  currentMaterial: null,
  loading: false,
  error: null,

  fetchMaterials: async (documentId = null) => {
    set({ loading: true })
    try {
      let materials
      if (documentId) {
        materials = await db.materials.where('documentId').equals(Number(documentId)).toArray()
      } else {
        materials = await db.materials.toArray()
      }
      set({ materials, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  getMaterial: async (id) => {
    try {
      const material = await db.materials.get(parseInt(String(id)))
      set({ currentMaterial: material })
      return material
    } catch (error) {
      set({ error: error.message })
      return null
    }
  },

  addMaterial: async (materialData) => {
    try {
      const id = await db.materials.add({
        ...materialData,
        generatedAt: new Date().toISOString()
      } as any)
      const newMaterial = await db.materials.get(id)
      set(state => ({ materials: [...state.materials, newMaterial] }))
      return { success: true, material: newMaterial }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updateMaterial: async (id, data) => {
    try {
      await db.materials.update(id, data)
      set(state => ({
        materials: state.materials.map(m => m.id === id ? { ...m, ...data } : m),
        currentMaterial:
          state.currentMaterial?.id === id
            ? { ...state.currentMaterial, ...data }
            : state.currentMaterial,
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  deleteMaterial: async (id) => {
    try {
      // Delete related flashcards if it's a flashcard material
      await db.flashcards.where('materialId').equals(id).delete()
      await db.materials.delete(id)
      
      set(state => ({
        materials: state.materials.filter(m => m.id !== id),
        currentMaterial: state.currentMaterial?.id === id ? null : state.currentMaterial
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}))
