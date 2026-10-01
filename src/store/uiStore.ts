import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Tema } from '../types'

interface UiState {
  tema: Tema
  /** Barra lateral no desktop (recolhível). */
  sidebarAberta: boolean
  /** Menu deslizante no celular. */
  menuMobileAberto: boolean
  alternarTema: () => void
  alternarSidebar: () => void
  abrirMenuMobile: () => void
  fecharMenuMobile: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      tema: 'escuro',
      sidebarAberta: true,
      menuMobileAberto: false,
      alternarTema: () => set((s) => ({ tema: s.tema === 'escuro' ? 'claro' : 'escuro' })),
      alternarSidebar: () => set((s) => ({ sidebarAberta: !s.sidebarAberta })),
      abrirMenuMobile: () => set({ menuMobileAberto: true }),
      fecharMenuMobile: () => set({ menuMobileAberto: false }),
    }),
    {
      // A mesma chave é lida no index.html para aplicar o tema antes da 1ª pintura.
      name: 'movi-tema',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tema: s.tema, sidebarAberta: s.sidebarAberta }),
    },
  ),
)

export function aplicarTemaNoDocumento(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'escuro')
}
