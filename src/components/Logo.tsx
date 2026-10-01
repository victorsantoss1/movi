import { cn } from '../lib/cn'

export const NOME_PRODUTO = 'Movi'

export function Logo({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-destaque" />
        <path
          d="M9 22V10l7 7 7-7v12"
          fill="none"
          className="stroke-sobre-destaque"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compacto && <span>{NOME_PRODUTO}</span>}
    </span>
  )
}
