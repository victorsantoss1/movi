import { Spinner } from './ui/Spinner'

export function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center text-suave" role="status">
      <Spinner className="size-6" />
      <span className="sr-only">Carregando...</span>
    </div>
  )
}
