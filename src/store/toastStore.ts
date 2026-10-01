import { create } from 'zustand'

interface ToastState {
  mensagem: string | null
  mostrar: (mensagem: string) => void
  fechar: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastState>()((set) => ({
  mensagem: null,
  mostrar: (mensagem) => {
    clearTimeout(timer)
    set({ mensagem })
    timer = setTimeout(() => set({ mensagem: null }), 4000)
  },
  fechar: () => {
    clearTimeout(timer)
    set({ mensagem: null })
  },
}))
