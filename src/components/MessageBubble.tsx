import { CircleAlert } from 'lucide-react'
import { memo } from 'react'
import { cn } from '../lib/cn'
import type { ErroEnvio, Mensagem } from '../types'
import { AgentAvatar } from './AgentAvatar'
import { Markdown } from './Markdown'

interface MessageBubbleProps {
  mensagem: Mensagem
  /** Erro associado a esta mensagem do usuário (falha no envio ou sem resposta). */
  erro?: ErroEnvio | null
}

const TEXTO_ERRO: Record<ErroEnvio, string> = {
  falha_envio: 'Não enviada',
  timeout: 'Sem resposta do agente',
}

export const MessageBubble = memo(function MessageBubble({ mensagem, erro: erroEnvio }: MessageBubbleProps) {
  // Uma mensagem que nunca chegou ao banco continua marcada mesmo que o
  // usuário tenha enviado outra depois.
  const erro = erroEnvio ?? (mensagem.local === 'nao_salva' ? 'falha_envio' : null)

  if (mensagem.role === 'assistant') {
    return (
      <article className="flex items-start gap-3" aria-label="Resposta do agente">
        <AgentAvatar />
        <div className="min-w-0 flex-1 pt-1">
          <Markdown conteudo={mensagem.content} />
        </div>
      </article>
    )
  }

  return (
    <article className="flex flex-col items-end gap-1" aria-label="Sua mensagem">
      <div
        className={cn(
          'max-w-[85%] rounded-2xl rounded-br-md bg-bolha px-4 py-2.5 whitespace-pre-wrap break-words sm:max-w-[75%]',
          mensagem.local === 'enviando' && 'opacity-70',
          erro && 'ring-1 ring-erro/60',
        )}
      >
        {mensagem.content}
      </div>
      {erro && (
        <p className="flex items-center gap-1 text-xs text-erro">
          <CircleAlert className="size-3.5" aria-hidden="true" />
          {TEXTO_ERRO[erro]}
        </p>
      )}
    </article>
  )
})
