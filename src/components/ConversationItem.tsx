import { Ellipsis } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'
import { excluirConversa, renomearConversa } from '../services/conversations'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import type { Conversa } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { ConversationMenu } from './ConversationMenu'

const TAMANHO_MAXIMO_TITULO = 120

interface ConversationItemProps {
  conversa: Conversa
  ativa: boolean
  aoNavegar: () => void
}

export const ConversationItem = memo(function ConversationItem({ conversa, ativa, aoNavegar }: ConversationItemProps) {
  const navigate = useNavigate()
  const salvarConversa = useChatStore((s) => s.salvarConversa)
  const removerConversa = useChatStore((s) => s.removerConversa)
  const mostrarToast = useToastStore((s) => s.mostrar)

  const [menuAberto, setMenuAberto] = useState(false)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(conversa.title)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const editandoRef = useRef(false)
  const botaoMenuRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fecharMenu = useCallback(() => setMenuAberto(false), [])

  useEffect(() => {
    if (editando) inputRef.current?.select()
  }, [editando])

  function iniciarRenomear() {
    setMenuAberto(false)
    setRascunho(conversa.title)
    editandoRef.current = true
    setEditando(true)
  }

  async function salvarTitulo() {
    if (!editandoRef.current) return
    editandoRef.current = false
    setEditando(false)
    const titulo = rascunho.replace(/\s+/g, ' ').trim().slice(0, TAMANHO_MAXIMO_TITULO)
    if (!titulo || titulo === conversa.title) return

    const anterior = conversa
    salvarConversa({ ...conversa, title: titulo })
    try {
      salvarConversa(await renomearConversa(conversa.id, titulo))
    } catch {
      salvarConversa(anterior)
      mostrarToast('Não foi possível renomear a conversa.')
    }
  }

  function aoTeclarNoTitulo(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void salvarTitulo()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      editandoRef.current = false
      setEditando(false)
      botaoMenuRef.current?.focus()
    }
  }

  async function confirmarExclusao() {
    setExcluindo(true)
    try {
      await excluirConversa(conversa.id)
      setConfirmandoExclusao(false)
      removerConversa(conversa.id)
      if (ativa) navigate('/chat', { replace: true })
    } catch {
      mostrarToast('Não foi possível excluir a conversa.')
      setExcluindo(false)
    }
  }

  return (
    <li className="group relative">
      {editando ? (
        <div className="px-1 py-0.5">
          <label htmlFor={`titulo-${conversa.id}`} className="sr-only">
            Novo título da conversa
          </label>
          <input
            id={`titulo-${conversa.id}`}
            ref={inputRef}
            value={rascunho}
            maxLength={TAMANHO_MAXIMO_TITULO}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={aoTeclarNoTitulo}
            onBlur={() => void salvarTitulo()}
            className="h-8 w-full rounded-md border border-destaque bg-superficie px-2 text-sm focus-visible:outline-none"
          />
        </div>
      ) : (
        <Link
          to={`/chat/${conversa.id}`}
          onClick={aoNavegar}
          aria-current={ativa ? 'page' : undefined}
          title={conversa.title}
          className={cn(
            'block truncate rounded-lg py-2 pr-9 pl-3 text-sm transition-colors',
            ativa ? 'bg-elevado font-medium text-texto' : 'text-texto/85 hover:bg-elevado/70',
          )}
        >
          {conversa.title}
        </Link>
      )}

      {!editando && (
        <button
          ref={botaoMenuRef}
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          aria-label={`Ações da conversa ${conversa.title}`}
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          className={cn(
            'absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1.5 text-suave hover:bg-borda/60 hover:text-texto',
            'focus-visible:opacity-100',
            menuAberto || ativa ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
          )}
        >
          <Ellipsis className="size-4" aria-hidden="true" />
        </button>
      )}

      {menuAberto && (
        <ConversationMenu
          ancora={botaoMenuRef}
          aoRenomear={iniciarRenomear}
          aoExcluir={() => {
            setMenuAberto(false)
            setConfirmandoExclusao(true)
          }}
          aoFechar={fecharMenu}
        />
      )}

      {confirmandoExclusao && (
        <ConfirmDialog
          aberto
          titulo="Excluir conversa?"
          descricao={`"${conversa.title}" e todas as mensagens serão excluídas. Esta ação não pode ser desfeita.`}
          textoConfirmar="Excluir"
          carregando={excluindo}
          aoConfirmar={() => void confirmarExclusao()}
          aoCancelar={() => setConfirmandoExclusao(false)}
        />
      )}
    </li>
  )
})
