import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

const LARGURA_MENU = 176
const ALTURA_MENU = 92

interface ConversationMenuProps {
  ancora: RefObject<HTMLButtonElement | null>
  aoRenomear: () => void
  aoExcluir: () => void
  aoFechar: () => void
}

/**
 * Menu de contexto da conversa. Posicionado com `fixed` a partir do botão,
 * para não ser cortado pela rolagem da lista.
 */
export function ConversationMenu({ ancora, aoRenomear, aoExcluir, aoFechar }: ConversationMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const botao = ancora.current
    if (!botao) return
    const r = botao.getBoundingClientRect()
    const abreParaCima = r.bottom + ALTURA_MENU + 8 > window.innerHeight
    // Medir o DOM antes da pintura é o uso legítimo de useLayoutEffect + setState.
    // oxlint-disable-next-line react/set-state-in-effect
    setPosicao({
      top: abreParaCima ? r.top - ALTURA_MENU - 4 : r.bottom + 4,
      left: Math.max(8, Math.min(r.right - LARGURA_MENU, window.innerWidth - LARGURA_MENU - 8)),
    })
  }, [ancora])

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()

    const fecharSeFora = (e: PointerEvent) => {
      const alvo = e.target as Node
      if (!menuRef.current?.contains(alvo) && !ancora.current?.contains(alvo)) aoFechar()
    }
    const fechar = () => aoFechar()
    document.addEventListener('pointerdown', fecharSeFora)
    window.addEventListener('resize', fechar)
    window.addEventListener('scroll', fechar, true)
    return () => {
      document.removeEventListener('pointerdown', fecharSeFora)
      window.removeEventListener('resize', fechar)
      window.removeEventListener('scroll', fechar, true)
    }
  }, [ancora, aoFechar])

  function aoPressionarTecla(e: KeyboardEvent<HTMLDivElement>) {
    const itens = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const indice = itens.findIndex((item) => item === document.activeElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      aoFechar()
      ancora.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const passo = e.key === 'ArrowDown' ? 1 : -1
      itens[(indice + passo + itens.length) % itens.length]?.focus()
    } else if (e.key === 'Tab') {
      aoFechar()
    }
  }

  const classeItem =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-elevado focus-visible:bg-elevado'

  return (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label="Ações da conversa"
      onKeyDown={aoPressionarTecla}
      style={{ top: posicao?.top ?? -9999, left: posicao?.left ?? -9999, width: LARGURA_MENU }}
      className="fixed z-50 rounded-lg border border-borda bg-superficie p-1 shadow-lg"
    >
      <button type="button" role="menuitem" onClick={aoRenomear} className={classeItem}>
        <Pencil className="size-4" aria-hidden="true" />
        Renomear
      </button>
      <button type="button" role="menuitem" onClick={aoExcluir} className={`${classeItem} text-erro`}>
        <Trash2 className="size-4" aria-hidden="true" />
        Excluir
      </button>
    </div>
  )
}
