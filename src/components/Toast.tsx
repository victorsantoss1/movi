import { X } from 'lucide-react'
import { useToastStore } from '../store/toastStore'

export function Toast() {
  const mensagem = useToastStore((s) => s.mensagem)
  const fechar = useToastStore((s) => s.fechar)

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {mensagem && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-texto px-4 py-2.5 text-sm text-fundo shadow-lg">
          <span>{mensagem}</span>
          <button type="button" onClick={fechar} aria-label="Fechar aviso" className="rounded p-0.5 opacity-80 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
