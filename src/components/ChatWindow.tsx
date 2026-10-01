import { Menu, MessageSquareOff, PanelLeftOpen, SquarePen, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHistoricoConversa } from '../hooks/useHistoricoConversa'
import { useMensagensRealtime } from '../hooks/useMensagensRealtime'
import { enviarMensagem, reenviarMensagem } from '../services/agent'
import { useAuthStore } from '../store/authStore'
import { useChatStore, useEstadoEnvio, useMensagens } from '../store/chatStore'
import { useUiStore } from '../store/uiStore'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { SendErrorNotice } from './SendErrorNotice'
import { TypingIndicator } from './TypingIndicator'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'

interface ChatWindowProps {
  conversationId: string | undefined
}

function prefereMenosMovimento(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const navigate = useNavigate()
  const nome = useAuthStore((s) => s.usuario?.nome ?? '')
  const titulo = useChatStore((s) => s.conversas.find((c) => c.id === conversationId)?.title)
  const { status, recarregar } = useHistoricoConversa(conversationId)
  const mensagens = useMensagens(conversationId)
  const envio = useEstadoEnvio(conversationId)

  useMensagensRealtime(status === 'nao_encontrada' ? undefined : conversationId)

  const aoEnviar = useCallback(
    (texto: string) => {
      void enviarMensagem({
        conversationId,
        texto,
        aoCriarConversa: (id) => navigate(`/chat/${id}`),
      })
    },
    [conversationId, navigate],
  )

  const aoTentarNovamente = useCallback(() => {
    if (conversationId) void reenviarMensagem(conversationId)
  }, [conversationId])

  // Rolagem automática para a última mensagem (instantânea ao abrir a conversa).
  const fimRef = useRef<HTMLDivElement>(null)
  const rolagemInicial = useRef(true)
  useEffect(() => {
    rolagemInicial.current = true
  }, [conversationId])
  useEffect(() => {
    if (mensagens.length === 0) return
    const suave = !rolagemInicial.current && !prefereMenosMovimento()
    fimRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'end' })
    rolagemInicial.current = false
  }, [mensagens, envio.aguardandoResposta, envio.erro])

  const vazia = !conversationId || (status === 'pronto' && mensagens.length === 0 && !envio.aguardandoResposta)
  const carregando = status === 'carregando' && mensagens.length === 0

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ChatHeader titulo={conversationId ? titulo : undefined} />

      {vazia ? (
        <EstadoVazio nome={nome} bloqueado={envio.aguardandoResposta} aoEnviar={aoEnviar} chave={conversationId} />
      ) : (
        <>
          <main className="flex-1 overflow-y-auto" aria-busy={carregando}>
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
              {carregando && (
                <div className="flex justify-center py-10 text-suave" role="status">
                  <Spinner className="size-6" />
                  <span className="sr-only">Carregando conversa...</span>
                </div>
              )}

              {status === 'nao_encontrada' && (
                <EstadoInformativo
                  icone={<MessageSquareOff className="size-6" aria-hidden="true" />}
                  titulo="Conversa não encontrada"
                  descricao="Ela pode ter sido excluída ou o link está incorreto."
                  acao={
                    <Link to="/chat" className="text-sm font-medium text-destaque hover:underline">
                      Começar uma nova conversa
                    </Link>
                  }
                />
              )}

              {status === 'erro' && (
                <EstadoInformativo
                  icone={<TriangleAlert className="size-6" aria-hidden="true" />}
                  titulo="Não foi possível carregar a conversa"
                  descricao="Verifique sua conexão."
                  acao={
                    <Button variante="secundario" onClick={recarregar}>
                      Tentar novamente
                    </Button>
                  }
                />
              )}

              {mensagens.map((mensagem) => (
                <MessageBubble
                  key={mensagem.id}
                  mensagem={mensagem}
                  erro={envio.mensagemPendenteId === mensagem.id ? envio.erro : null}
                />
              ))}

              {envio.aguardandoResposta && <TypingIndicator />}
              {envio.erro && <SendErrorNotice erro={envio.erro} aoTentarNovamente={aoTentarNovamente} />}
              <div ref={fimRef} aria-hidden="true" />
            </div>
          </main>

          {status === 'pronto' && (
            <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
              <MessageInput key={conversationId} bloqueado={envio.aguardandoResposta} aoEnviar={aoEnviar} focarAoMontar />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChatHeader({ titulo }: { titulo: string | undefined }) {
  const navigate = useNavigate()
  const sidebarAberta = useUiStore((s) => s.sidebarAberta)
  const alternarSidebar = useUiStore((s) => s.alternarSidebar)
  const abrirMenuMobile = useUiStore((s) => s.abrirMenuMobile)

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-borda px-2 sm:px-3">
      <button
        type="button"
        onClick={abrirMenuMobile}
        aria-label="Abrir menu"
        className="rounded-lg p-2 text-suave hover:bg-elevado hover:text-texto lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {!sidebarAberta && (
        <>
          <button
            type="button"
            onClick={alternarSidebar}
            aria-label="Abrir barra lateral"
            title="Abrir barra lateral"
            className="hidden rounded-lg p-2 text-suave hover:bg-elevado hover:text-texto lg:block"
          >
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            aria-label="Nova conversa"
            title="Nova conversa"
            className="hidden rounded-lg p-2 text-suave hover:bg-elevado hover:text-texto lg:block"
          >
            <SquarePen className="size-5" aria-hidden="true" />
          </button>
        </>
      )}
      <h1 className="min-w-0 truncate px-2 text-sm font-medium">{titulo ?? 'Nova conversa'}</h1>
    </header>
  )
}

interface EstadoVazioProps {
  nome: string
  bloqueado: boolean
  aoEnviar: (texto: string) => void
  chave: string | undefined
}

function EstadoVazio({ nome, bloqueado, aoEnviar, chave }: EstadoVazioProps) {
  const primeiroNome = nome.split(/\s+/)[0] ?? ''
  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-[10vh]">
      <div className="w-full max-w-2xl">
        <h2 className="mb-2 text-center text-2xl font-semibold sm:text-3xl">
          {primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'}
        </h2>
        <p className="mb-8 text-center text-suave">Como posso ajudar hoje?</p>
        <MessageInput key={chave ?? 'nova'} bloqueado={bloqueado} aoEnviar={aoEnviar} focarAoMontar />
      </div>
    </main>
  )
}

interface EstadoInformativoProps {
  icone: ReactNode
  titulo: string
  descricao: string
  acao: ReactNode
}

function EstadoInformativo({ icone, titulo, descricao, acao }: EstadoInformativoProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-suave">{icone}</div>
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-suave">{descricao}</p>
      </div>
      {acao}
    </div>
  )
}
