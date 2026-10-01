import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { FullScreenLoader } from './FullScreenLoader'

/** Rotas /chat: sem sessão, redireciona para /login (guardando o destino). */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario)
  const carregando = useAuthStore((s) => s.carregando)
  const location = useLocation()

  if (carregando) return <FullScreenLoader />
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  return <>{children}</>
}

/** Rotas públicas (login, esqueci-senha): quem já está logado vai direto ao chat. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario)
  const carregando = useAuthStore((s) => s.carregando)

  if (carregando) return <FullScreenLoader />
  if (usuario) return <Navigate to="/chat" replace />
  return <>{children}</>
}
