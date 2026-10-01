import { LogOut, PanelLeftClose, Search, SquarePen, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuscaConversas } from '../hooks/useBuscaConversas'
import { agruparPorPeriodo } from '../lib/agrupamento'
import { cn } from '../lib/cn'
import { logout } from '../services/auth'
import { listarConversas } from '../services/conversations'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import { useUiStore } from '../store/uiStore'
import { ConversationItem } from './ConversationItem'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Spinner } from './ui/Spinner'

interface SidebarProps {
  conversationIdAtual: string | undefined
}

type StatusLista = 'carregando' | 'pronto' | 'erro'

function ehDesktop(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches
}

export function Sidebar({ conversationIdAtual }: SidebarProps) {
  const navigate = useNavigate()
  const conversas = useChatStore((s) => s.conversas)
  const definirConversas = useChatStore((s) => s.definirConversas)
  const sidebarAberta = useUiStore((s) => s.sidebarAberta)
  const menuMobileAberto = useUiStore((s) => s.menuMobileAberto)
  const alternarSidebar = useUiStore((s) => s.alternarSidebar)
  const fecharMenuMobile = useUiStore((s) => s.fecharMenuMobile)

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<StatusLista>('carregando')
  const [tentativa, setTentativa] = useState(0)
  const painelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let ativo = true
    listarConversas()
      .then((lista) => {
        if (!ativo) return
        // Mantém conversas criadas localmente que ainda não chegaram ao banco.
        const locais = useChatStore.getState().conversas.filter((c) => !lista.some((l) => l.id === c.id))
        definirConversas([...locais, ...lista])
        setStatus('pronto')
      })
      .catch(() => ativo && setStatus('erro'))
    return () => {
      ativo = false
    }
  }, [definirConversas, tentativa])

  const filtradas = useBuscaConversas(conversas, busca)
  const grupos = useMemo(() => agruparPorPeriodo(filtradas), [filtradas])

  // Menu deslizante (celular): Esc fecha e o foco vai para dentro do painel.
  useEffect(() => {
    if (!menuMobileAberto) return
    painelRef.current?.querySelector<HTMLElement>('button, a, input')?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharMenuMobile()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [menuMobileAberto, fecharMenuMobile])

  const novaConversa = useCallback(() => {
    fecharMenuMobile()
    navigate('/chat')
  }, [fecharMenuMobile, navigate])

  const recolher = useCallback(() => {
    if (ehDesktop()) alternarSidebar()
    else fecharMenuMobile()
  }, [alternarSidebar, fecharMenuMobile])

  return (
    <>
      {/* Fundo escurecido do menu deslizante no celular */}
      <div
        aria-hidden="true"
        onClick={fecharMenuMobile}
        className={cn(
          'fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden',
          menuMobileAberto ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        ref={painelRef}
        aria-label="Histórico de conversas"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-borda bg-lateral',
          'transition-[transform,visibility] duration-200 ease-out',
          menuMobileAberto ? 'visible translate-x-0' : 'invisible -translate-x-full',
          'lg:visible lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          sidebarAberta ? 'lg:flex' : 'lg:hidden',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <Logo />
          <button
            type="button"
            onClick={recolher}
            aria-label="Fechar barra lateral"
            title="Fechar barra lateral"
            className="rounded-lg p-2 text-suave hover:bg-elevado hover:text-texto"
          >
            <X className="size-5 lg:hidden" aria-hidden="true" />
            <PanelLeftClose className="hidden size-5 lg:block" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-3 pb-3">
          <button
            type="button"
            onClick={novaConversa}
            className="flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-elevado"
          >
            <SquarePen className="size-4" aria-hidden="true" />
            Nova conversa
          </button>

          <div className="relative">
            <label htmlFor="busca-conversas" className="sr-only">
              Buscar no histórico
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave"
              aria-hidden="true"
            />
            <input
              id="busca-conversas"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conversas"
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-borda bg-superficie pr-3 pl-9 text-sm placeholder:text-suave focus:border-destaque focus-visible:outline-none"
            />
          </div>
        </div>

        <nav aria-label="Conversas" className="flex-1 overflow-y-auto px-2 pb-3">
          {status === 'carregando' && conversas.length === 0 && (
            <div className="flex justify-center py-6 text-suave" role="status">
              <Spinner />
              <span className="sr-only">Carregando conversas...</span>
            </div>
          )}

          {status === 'erro' && (
            <p className="px-3 py-4 text-sm text-suave">
              Não foi possível carregar o histórico.{' '}
              <button
                type="button"
                onClick={() => {
                  setStatus('carregando')
                  setTentativa((t) => t + 1)
                }}
                className="font-medium text-destaque hover:underline"
              >
                Tentar novamente
              </button>
            </p>
          )}

          {status === 'pronto' && conversas.length === 0 && (
            <p className="px-3 py-4 text-sm text-suave">Suas conversas aparecerão aqui.</p>
          )}

          {busca.trim() !== '' && filtradas.length === 0 && conversas.length > 0 && (
            <p className="px-3 py-4 text-sm text-suave" role="status">
              Nenhuma conversa encontrada.
            </p>
          )}

          {grupos.map((grupo, indice) => (
            <section key={grupo.periodo} className="mb-3" aria-labelledby={`grupo-conversas-${indice}`}>
              <h2 id={`grupo-conversas-${indice}`} className="px-3 pt-2 pb-1 text-xs font-medium text-suave">
                {grupo.periodo}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {grupo.conversas.map((conversa) => (
                  <ConversationItem
                    key={conversa.id}
                    conversa={conversa}
                    ativa={conversa.id === conversationIdAtual}
                    aoNavegar={fecharMenuMobile}
                  />
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <RodapeUsuario />
      </aside>
    </>
  )
}

function RodapeUsuario() {
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const mostrarToast = useToastStore((s) => s.mostrar)
  const [saindo, setSaindo] = useState(false)

  if (!usuario) return null
  const iniciais = usuario.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')

  async function sair() {
    setSaindo(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      mostrarToast('Não foi possível sair. Tente novamente.')
      setSaindo(false)
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-borda p-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destaque text-sm font-semibold text-sobre-destaque"
        aria-hidden="true"
      >
        {iniciais || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{usuario.nome}</p>
        <p className="truncate text-xs text-suave">{usuario.email}</p>
      </div>
      <ThemeToggle />
      <button
        type="button"
        onClick={() => void sair()}
        disabled={saindo}
        aria-label="Sair"
        title="Sair"
        className="rounded-lg p-2 text-suave hover:bg-elevado hover:text-texto disabled:opacity-50"
      >
        {saindo ? <Spinner /> : <LogOut className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
