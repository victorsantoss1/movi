import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  carregando?: boolean
  textoCarregando?: string
}

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-destaque text-sobre-destaque hover:bg-destaque-forte',
  secundario: 'border border-borda bg-superficie text-texto hover:bg-elevado',
  fantasma: 'text-texto hover:bg-elevado',
  perigo: 'bg-erro text-white hover:opacity-90 dark:text-fundo',
}

export function Button({
  variante = 'primario',
  carregando = false,
  textoCarregando,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        ESTILOS[variante],
        className,
      )}
      {...props}
    >
      {carregando && <Spinner />}
      {carregando && textoCarregando ? textoCarregando : children}
    </button>
  )
}
