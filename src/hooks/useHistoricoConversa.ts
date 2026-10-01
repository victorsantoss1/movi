import { useCallback, useEffect, useState } from 'react'
import { buscarConversa, listarMensagens } from '../services/conversations'
import { useChatStore } from '../store/chatStore'

export type StatusHistorico = 'ocioso' | 'carregando' | 'pronto' | 'nao_encontrada' | 'erro'

interface Estado {
  conversationId: string | undefined
  status: StatusHistorico
}

function statusInicial(conversationId: string | undefined): StatusHistorico {
  if (!conversationId) return 'ocioso'
  return useChatStore.getState().mensagens[conversationId] !== undefined ? 'pronto' : 'carregando'
}

/**
 * Carrega o histórico (ordenado por created_at) ao abrir uma conversa existente
 * e reconstrói o estado de "aguardando resposta"/timeout.
 */
export function useHistoricoConversa(conversationId: string | undefined) {
  const [estado, setEstado] = useState<Estado>(() => ({ conversationId, status: statusInicial(conversationId) }))
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const definir = (status: StatusHistorico) => setEstado({ conversationId, status })
    if (!conversationId) {
      definir('ocioso')
      return
    }

    let ativo = true
    const jaEmMemoria = useChatStore.getState().mensagens[conversationId] !== undefined
    definir(jaEmMemoria ? 'pronto' : 'carregando')

    Promise.all([buscarConversa(conversationId), listarMensagens(conversationId)])
      .then(([conversa, mensagens]) => {
        if (!ativo) return
        const store = useChatStore.getState()
        // Conversa recém-criada neste navegador pode ainda não ter sido gravada.
        const existeLocalmente = store.conversas.some((c) => c.id === conversationId)
        if (!conversa && !existeLocalmente) {
          definir('nao_encontrada')
          return
        }
        if (conversa) store.salvarConversa(conversa)
        store.mesclarMensagens(conversationId, mensagens)
        store.restaurarEstadoEnvio(conversationId)
        definir('pronto')
      })
      .catch((erro: unknown) => {
        console.error('[historico] falha ao carregar a conversa', erro)
        if (ativo) definir(jaEmMemoria ? 'pronto' : 'erro')
      })

    return () => {
      ativo = false
    }
  }, [conversationId, tentativa])

  const recarregar = useCallback(() => setTentativa((t) => t + 1), [])

  // Evita exibir, por um frame, o status da conversa anterior ao trocar de conversa.
  const status = estado.conversationId === conversationId ? estado.status : statusInicial(conversationId)
  return { status, recarregar }
}
