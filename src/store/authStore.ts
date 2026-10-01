import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { getSessao, paraUsuario } from '../services/auth'
import { supabase } from '../services/supabase'
import type { Usuario } from '../types'

interface AuthState {
  usuario: Usuario | null
  /** true até sabermos se existe sessão (evita redirecionar para /login cedo demais). */
  carregando: boolean
  /** true quando o usuário chegou pelo link de redefinição de senha. */
  recuperandoSenha: boolean
  concluirRecuperacao: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  usuario: null,
  carregando: true,
  recuperandoSenha: false,
  concluirRecuperacao: () => set({ recuperandoSenha: false }),
}))

function mesmoUsuario(a: Usuario | null, b: Usuario | null): boolean {
  return a?.id === b?.id && a?.email === b?.email && a?.nome === b?.nome
}

function aplicarSessao(sessao: Session | null): void {
  const novo = sessao?.user ? paraUsuario(sessao.user) : null
  const { usuario } = useAuthStore.getState()
  useAuthStore.setState({
    usuario: mesmoUsuario(usuario, novo) ? usuario : novo,
    carregando: false,
  })
}

/** Carrega a sessão atual e acompanha login/logout/refresh. Retorna o unsubscribe. */
export function iniciarAuth(): () => void {
  const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
    if (evento === 'PASSWORD_RECOVERY') useAuthStore.setState({ recuperandoSenha: true })
    aplicarSessao(sessao)
  })

  getSessao()
    .then(aplicarSessao)
    .catch(() => aplicarSessao(null))

  return () => data.subscription.unsubscribe()
}
