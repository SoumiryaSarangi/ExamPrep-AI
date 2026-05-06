'use client'

import { useToast } from "@/hooks/useToast"
import { CheckCircle, AlertCircle, Info, X } from "lucide-react"

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl
            glass-card animate-slide-in-right cursor-pointer
            ${
              toast.type === 'error'
                ? 'border-l-4 border-l-[hsl(var(--accent-red))]'
                : toast.type === 'success'
                ? 'border-l-4 border-l-[hsl(var(--accent-green))]'
                : 'border-l-4 border-l-primary'
            }
          `}
          onClick={() => removeToast(toast.id)}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-[hsl(var(--accent-red))]" />
            ) : toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-[hsl(var(--accent-green))]" />
            ) : (
              <Info className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
            )}
          </div>
          <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
