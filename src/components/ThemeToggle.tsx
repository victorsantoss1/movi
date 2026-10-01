import { Moon, Sun } from 'lucide-react'
import { cn } from '../lib/cn'
import { useUiStore } from '../store/uiStore'

export function ThemeToggle({ className }: { className?: string }) {
  const tema = useUiStore((s) => s.tema)
  const alternarTema = useUiStore((s) => s.alternarTema)
  const rotulo = tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={rotulo}
      title={rotulo}
      className={cn('rounded-lg p-2 text-suave transition-colors hover:bg-elevado hover:text-texto', className)}
    >
      {tema === 'escuro' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  )
}
