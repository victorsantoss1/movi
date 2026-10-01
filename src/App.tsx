import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { FullScreenLoader } from './components/FullScreenLoader'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { Toast } from './components/Toast'
import { ROTA_REDEFINIR_SENHA } from './services/auth'
import { iniciarAuth, useAuthStore } from './store/authStore'
import { useChatStore } from './store/chatStore'
import { aplicarTemaNoDocumento, useUiStore } from './store/uiStore'

const Login = lazy(() => import('./pages/Login'))
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'))
const Chat = lazy(() => import('./pages/Chat'))

/** Efeitos globais: sessão, tema, limpeza no logout e fluxo de recuperação de senha. */
function EfeitosGlobais({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const tema = useUiStore((s) => s.tema)
  const usuarioId = useAuthStore((s) => s.usuario?.id)
  const carregando = useAuthStore((s) => s.carregando)
  const recuperandoSenha = useAuthStore((s) => s.recuperandoSenha)

  useEffect(() => iniciarAuth(), [])

  useEffect(() => aplicarTemaNoDocumento(tema), [tema])

  // Sessão encerrada (logout, expiração ou outra aba): descarta dados do usuário.
  useEffect(() => {
    if (!carregando && !usuarioId) useChatStore.getState().limpar()
  }, [carregando, usuarioId])

  // Se o link do e-mail cair em outra rota (ex.: Site URL), leva para a redefinição.
  useEffect(() => {
    if (recuperandoSenha && location.pathname !== ROTA_REDEFINIR_SENHA) {
      navigate(ROTA_REDEFINIR_SENHA, { replace: true })
    }
  }, [recuperandoSenha, location.pathname, navigate])

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <EfeitosGlobais>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/esqueci-senha"
              element={
                <PublicOnlyRoute>
                  <EsqueciSenha />
                </PublicOnlyRoute>
              }
            />
            <Route path={ROTA_REDEFINIR_SENHA} element={<RedefinirSenha />} />
            {/* Uma rota só (/chat e /chat/:conversationId) para a página não remontar ao trocar de conversa */}
            <Route
              path="/chat/:conversationId?"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
        <Toast />
      </EfeitosGlobais>
    </BrowserRouter>
  )
}
