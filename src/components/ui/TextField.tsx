import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  erro?: string | null
  /** Elemento à direita dentro do campo (ex.: botão mostrar/ocultar senha). */
  acessorio?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, erro, acessorio, id, className, ...props },
  ref,
) {
  const idGerado = useId()
  const inputId = id ?? idGerado
  const erroId = `${inputId}-erro`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? erroId : undefined}
          className={cn(
            'h-11 w-full rounded-lg border bg-superficie px-3 text-sm text-texto placeholder:text-suave',
            'transition-colors focus:border-destaque focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destaque/40',
            erro ? 'border-erro' : 'border-borda',
            acessorio ? 'pr-11' : undefined,
            className,
          )}
          {...props}
        />
        {acessorio && <div className="absolute inset-y-0 right-1 flex items-center">{acessorio}</div>}
      </div>
      {erro && (
        <p id={erroId} className="text-sm text-erro">
          {erro}
        </p>
      )}
    </div>
  )
})
