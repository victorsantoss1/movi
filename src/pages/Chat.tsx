import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ChatWindow } from '../components/ChatWindow'
import { Sidebar } from '../components/Sidebar'
import { ehUuid } from '../lib/uuid'
import { useUiStore } from '../store/uiStore'

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const fecharMenuMobile = useUiStore((s) => s.fecharMenuMobile)

  // Ao trocar de conversa, fecha o menu deslizante do celular.
  useEffect(() => {
    fecharMenuMobile()
  }, [conversationId, fecharMenuMobile])

  if (conversationId !== undefined && !ehUuid(conversationId)) return <Navigate to="/chat" replace />

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar conversationIdAtual={conversationId} />
      <ChatWindow conversationId={conversationId} />
    </div>
  )
}
