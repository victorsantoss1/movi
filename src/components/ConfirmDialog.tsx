import { useEffect, useId, useRef } from 'react'
import { Button } from './ui/Button'

interface ConfirmDialogProps {
  aberto: boolean
  titulo: string
  descricao: string
  textoConfirmar: string
  carregando?: boolean
  aoConfirmar: () => void
  aoCancelar: () => void
}

/** Diálogo modal nativo (<dialog>): foco preso, Esc fecha e fundo bloqueado. */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar,
  carregando = false,
  aoConfirmar,
  aoCancelar,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (aberto && !dialog.open) dialog.showModal()
    if (!aberto && dialog.open) dialog.close()
  }, [aberto])

  return (
    // Clique no fundo é atalho de mouse; pelo teclado o Esc já fecha (onCancel).
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        if (!carregando) aoCancelar()
      }}
      onClick={(e) => {
        // Clique no fundo (fora do conteúdo) fecha.
        if (e.target === dialogRef.current && !carregando) aoCancelar()
      }}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-descricao`}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-borda bg-superficie p-0 text-texto shadow-xl backdrop:bg-black/50"
    >
      <div className="p-6">
        <h2 id={`${id}-titulo`} className="text-lg font-semibold">
          {titulo}
        </h2>
        <p id={`${id}-descricao`} className="mt-2 text-sm text-suave">
          {descricao}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secundario" onClick={aoCancelar} disabled={carregando} autoFocus>
            Cancelar
          </Button>
          <Button variante="perigo" onClick={aoConfirmar} carregando={carregando}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
