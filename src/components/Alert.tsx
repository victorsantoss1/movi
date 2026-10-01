import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Alert({ tipo, children }: { tipo: 'erro' | 'sucesso'; children: ReactNode }) {
  const Icone = tipo === 'erro' ? CircleAlert : CircleCheck
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm',
        tipo === 'erro' ? 'bg-erro-fundo text-erro' : 'bg-sucesso-fundo text-sucesso',
      )}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
