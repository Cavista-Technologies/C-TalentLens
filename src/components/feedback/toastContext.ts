import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast (){
  const context = useContext(ToastContext) 
  if (!context) {
    throw new Error('UseToast must be used within a ToastProvider')
  }
  return context
}
