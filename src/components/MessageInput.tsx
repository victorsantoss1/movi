import { ArrowUp } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../lib/cn'

const ALTURA_MAXIMA_PX = 200

interface MessageInputProps {
  /** true enquanto a conversa aguarda a resposta do agente. */
  bloqueado: boolean
  aoEnviar: (texto: string) => void
  /** Foca o campo ao montar (só com mouse/teclado, para não abrir o teclado do celular). */
  focarAoMontar?: boolean
  placeholder?: string
}

function temPonteiroFino(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
}

export function MessageInput({
  bloqueado,
  aoEnviar,
  focarAoMontar = false,
  placeholder = 'Escreva sua mensagem...',
}: MessageInputProps) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dicaId = useId()
  const podeEnviar = !bloqueado && texto.trim().length > 0

  // Caixa cresce conforme o conteúdo, até um limite (depois rola).
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAXIMA_PX)}px`
    el.style.overflowY = el.scrollHeight > ALTURA_MAXIMA_PX ? 'auto' : 'hidden'
  }, [texto])

  // Quando a resposta chega, devolve o foco ao campo (só com mouse/teclado,
  // para não abrir o teclado virtual no celular sem o usuário pedir).
  const estavaBloqueado = useRef(bloqueado)
  useEffect(() => {
    if (estavaBloqueado.current && !bloqueado && temPonteiroFino()) textareaRef.current?.focus()
    estavaBloqueado.current = bloqueado
  }, [bloqueado])

  useEffect(() => {
    if (focarAoMontar && temPonteiroFino()) textareaRef.current?.focus()
  }, [focarAoMontar])

  function enviar() {
    if (!podeEnviar) return
    aoEnviar(texto.trim())
    setTexto('')
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra linha; ignora Enter durante composição (IME/acentos).
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      enviar()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
      className="w-full"
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border border-borda bg-superficie p-2 shadow-sm transition-colors',
          'focus-within:border-destaque/60',
          bloqueado && 'opacity-80',
        )}
      >
        <label htmlFor={`${dicaId}-campo`} className="sr-only">
          Mensagem para o agente
        </label>
        <textarea
          id={`${dicaId}-campo`}
          ref={textareaRef}
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoPressionarTecla}
          disabled={bloqueado}
          placeholder={bloqueado ? 'Aguardando resposta do agente...' : placeholder}
          aria-describedby={dicaId}
          className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-texto placeholder:text-suave focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!podeEnviar}
          aria-label="Enviar mensagem"
          title="Enviar mensagem"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destaque text-sobre-destaque transition-colors hover:bg-destaque-forte disabled:cursor-not-allowed disabled:bg-elevado disabled:text-suave"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p id={dicaId} aria-live="polite" className="mt-1.5 min-h-4 px-1 text-center text-xs text-suave">
        {bloqueado ? (
          'Aguardando resposta do agente...'
        ) : (
          <span className="hidden sm:inline">Enter para enviar · Shift+Enter para quebrar linha</span>
        )}
      </p>
    </form>
  )
}
