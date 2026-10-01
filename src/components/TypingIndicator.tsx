import { AgentAvatar } from './AgentAvatar'

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <AgentAvatar />
      <div className="flex h-8 items-center gap-1 rounded-2xl px-1" aria-hidden="true">
        <span className="ponto-digitando size-2 rounded-full bg-suave" />
        <span className="ponto-digitando size-2 rounded-full bg-suave [animation-delay:150ms]" />
        <span className="ponto-digitando size-2 rounded-full bg-suave [animation-delay:300ms]" />
      </div>
      <span className="sr-only">O agente está digitando...</span>
    </div>
  )
}
