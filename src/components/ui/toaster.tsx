'use client'

import { useToast } from "@/hooks/useToast"

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right fade-in duration-300 ${
            toast.type === 'error' ? 'bg-destructive text-destructive-foreground' :
            toast.type === 'success' ? 'bg-green-600 text-white' :
            'bg-card text-card-foreground border'
          }`}
          onClick={() => removeToast(toast.id)}
        >
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.description && (
            <p className="text-sm opacity-90">{toast.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
