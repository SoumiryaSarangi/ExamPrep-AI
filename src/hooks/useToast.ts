import { create } from 'zustand'

export type ToastType = 'default' | 'success' | 'error'

export interface ToastInput {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

export interface ToastMessage {
  id: number
  title: string
  description?: string
  type: ToastType
}

interface ToastState {
  toasts: ToastMessage[]
  addToast: (toast: ToastMessage) => void
  removeToast: (id: number) => void
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, toast]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  }))
}))

export function useToast() {
  const { toasts, addToast, removeToast } = useToastStore()
  
  const toast = ({ title, description, type = 'default', duration = 5000 }: ToastInput) => {
    const id = Date.now()
    addToast({ id, title, description, type })
    
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    
    return id
  }
  
  return { toasts, toast, removeToast }
}
