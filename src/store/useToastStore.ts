import { create } from 'zustand'

type ToastState = {
  message: string | null
  show: (msg: string, timeoutMs?: number) => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (msg, timeoutMs = 2000) => {
    set({ message: msg })
    window.clearTimeout((useToastStore as any)._t)
    ;(useToastStore as any)._t = window.setTimeout(() => set({ message: null }), timeoutMs)
  },
  hide: () => set({ message: null })
}))

