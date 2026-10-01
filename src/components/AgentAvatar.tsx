import { Sparkles } from 'lucide-react'

export function AgentAvatar() {
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destaque/15 text-destaque"
      aria-hidden="true"
    >
      <Sparkles className="size-4" />
    </div>
  )
}
