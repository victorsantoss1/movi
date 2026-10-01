import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

interface AuthLayoutProps {
  titulo: string
  descricao?: string
  children: ReactNode
}

/** Moldura das telas de autenticação: logo no topo e cartão centralizado. */
export function AuthLayout({ titulo, descricao, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute top-4 right-4" />
      <main className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="text-2xl" />
        </div>
        <div className="rounded-2xl border border-borda bg-superficie p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold">{titulo}</h1>
          {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
