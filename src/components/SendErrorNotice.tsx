import { CircleAlert, RotateCw } from 'lucide-react'
import type { ErroEnvio } from '../types'
import { Button } from './ui/Button'

const TEXTOS: Record<ErroEnvio, { titulo: string; detalhe: string }> = {
  falha_envio: {
    titulo: 'Não foi possível enviar sua mensagem.',
    detalhe: 'Verifique sua conexão e tente novamente.',
  },
  timeout: {
    titulo: 'O agente não respondeu.',
    detalhe: 'Você pode reenviar a mesma mensagem.',
  },
}

interface SendErrorNoticeProps {
  erro: ErroEnvio
  aoTentarNovamente: () => void
}

export function SendErrorNotice({ erro, aoTentarNovamente }: SendErrorNoticeProps) {
  const { titulo, detalhe } = TEXTOS[erro]
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-erro/40 bg-erro-fundo px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2 text-erro">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">{titulo}</p>
          <p className="opacity-90">{detalhe}</p>
        </div>
      </div>
      <Button variante="secundario" onClick={aoTentarNovamente} className="h-9 shrink-0">
        <RotateCw className="size-4" aria-hidden="true" />
        Tentar novamente
      </Button>
    </div>
  )
}
