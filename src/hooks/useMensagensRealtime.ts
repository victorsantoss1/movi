import { useEffect } from 'react'
import { gerarUuid } from '../lib/uuid'
import { ehMensagemRow, listarMensagens } from '../services/conversations'
import { supabase } from '../services/supabase'
import { useChatStore } from '../store/chatStore'

const INTERVALO_POLLING_MS = 3000

/**
 * Assina os INSERTs em messages da conversa aberta via Supabase Realtime.
 * Se o canal cair, faz polling a cada 3 s até reconectar. Ao (re)conectar e ao
 * voltar para a aba, sincroniza com o banco para não perder nada no intervalo.
 */
export function useMensagensRealtime(conversationId: string | undefined): void {
  useEffect(() => {
    if (!conversationId) return

    let ativo = true
    let polling: ReturnType<typeof setInterval> | undefined

    const sincronizar = async () => {
      try {
        const mensagens = await listarMensagens(conversationId)
        if (ativo) useChatStore.getState().mesclarMensagens(conversationId, mensagens)
      } catch {
        // Falha pontual de rede: a próxima sincronização tenta de novo.
      }
    }

    const iniciarPolling = () => {
      if (polling !== undefined) return
      polling = setInterval(() => void sincronizar(), INTERVALO_POLLING_MS)
    }

    const pararPolling = () => {
      clearInterval(polling)
      polling = undefined
    }

    const canal = supabase
      .channel(`messages:${conversationId}:${gerarUuid()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (ehMensagemRow(payload.new)) {
            useChatStore.getState().mesclarMensagens(conversationId, [payload.new])
          }
        },
      )
      .subscribe((status) => {
        if (!ativo) return
        if (status === 'SUBSCRIBED') {
          pararPolling()
          void sincronizar()
        } else {
          // CHANNEL_ERROR | TIMED_OUT | CLOSED
          iniciarPolling()
        }
      })

    const aoVoltarParaAba = () => {
      if (document.visibilityState === 'visible') void sincronizar()
    }
    document.addEventListener('visibilitychange', aoVoltarParaAba)
    window.addEventListener('online', aoVoltarParaAba)

    return () => {
      ativo = false
      pararPolling()
      document.removeEventListener('visibilitychange', aoVoltarParaAba)
      window.removeEventListener('online', aoVoltarParaAba)
      void supabase.removeChannel(canal)
    }
  }, [conversationId])
}
