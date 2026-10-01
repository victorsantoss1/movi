import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { listarMensagens } from '../services/conversations'
import type { Conversa, EstadoEnvio, Mensagem } from '../types'

/** Tempo máximo esperando o agente antes de liberar o envio com erro. */
export const TIMEOUT_RESPOSTA_MS = 2 * 60 * 1000

export const ESTADO_ENVIO_INICIAL: EstadoEnvio = Object.freeze({
  aguardandoResposta: false,
  enviadoEm: null,
  mensagemPendenteId: null,
  erro: null,
})

const SEM_MENSAGENS: readonly Mensagem[] = Object.freeze([])

interface ChatState {
  conversas: Conversa[]
  mensagens: Record<string, Mensagem[]>
  /** Estado de envio por conversa (bloqueio "uma mensagem por vez"). */
  envio: Record<string, EstadoEnvio>

  definirConversas: (conversas: Conversa[]) => void
  salvarConversa: (conversa: Conversa) => void
  removerConversa: (id: string) => void

  /** Adiciona/atualiza mensagens, deduplicando por id. Libera o envio se o agente respondeu. */
  mesclarMensagens: (conversationId: string, novas: readonly Mensagem[]) => void
  marcarMensagem: (conversationId: string, mensagemId: string, local: Mensagem['local']) => void

  iniciarEspera: (conversationId: string, mensagemId: string) => number
  falharEnvio: (conversationId: string, tentativa: number) => void
  /** Reconstrói o estado de envio após carregar o histórico (ex.: página recarregada). */
  restaurarEstadoEnvio: (conversationId: string) => void
  limpar: () => void
}

// Timers de timeout ficam fora do estado (não são serializáveis).
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function cancelarTimeout(conversationId: string): void {
  const timer = timers.get(conversationId)
  if (timer !== undefined) clearTimeout(timer)
  timers.delete(conversationId)
}

function agendarTimeout(conversationId: string, emMs: number): void {
  cancelarTimeout(conversationId)
  const atraso = Math.min(Math.max(emMs, 0), TIMEOUT_RESPOSTA_MS)
  timers.set(
    conversationId,
    setTimeout(() => {
      timers.delete(conversationId)
      void expirarSeSemResposta(conversationId)
    }, atraso),
  )
}

/**
 * Antes de declarar timeout, confere no banco: a resposta pode ter chegado sem
 * o Realtime avisar (ex.: a conversa não estava aberta).
 */
async function expirarSeSemResposta(conversationId: string): Promise<void> {
  const antes = useChatStore.getState().envio[conversationId]
  if (!antes?.aguardandoResposta) return

  try {
    const mensagens = await listarMensagens(conversationId)
    useChatStore.getState().mesclarMensagens(conversationId, mensagens)
  } catch {
    // Sem rede: segue para o timeout, o usuário pode tentar novamente.
  }

  const depois = useChatStore.getState().envio[conversationId]
  if (depois?.aguardandoResposta && depois.enviadoEm === antes.enviadoEm) {
    useChatStore.setState((s) => ({
      envio: { ...s.envio, [conversationId]: { ...depois, aguardandoResposta: false, erro: 'timeout' } },
    }))
  }
}

function ordenar(mensagens: Mensagem[]): Mensagem[] {
  // Mensagens confirmadas pelo banco em ordem de created_at; as ainda locais
  // (otimistas) sempre no fim — o relógio do cliente pode divergir do servidor.
  const confirmadas = mensagens.filter((m) => !m.local)
  const locais = mensagens.filter((m) => m.local)
  confirmadas.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  return [...confirmadas, ...locais]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversas: [],
      mensagens: {},
      envio: {},

      definirConversas: (conversas) => set({ conversas }),

      salvarConversa: (conversa) =>
        set((s) => {
          const outras = s.conversas.filter((c) => c.id !== conversa.id)
          return {
            conversas: [conversa, ...outras].sort(
              (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
            ),
          }
        }),

      removerConversa: (id) => {
        cancelarTimeout(id)
        set((s) => {
          const { [id]: _mensagens, ...mensagens } = s.mensagens
          const { [id]: _envio, ...envio } = s.envio
          return { conversas: s.conversas.filter((c) => c.id !== id), mensagens, envio }
        })
      },

      mesclarMensagens: (conversationId, novas) => {
        if (novas.length === 0) return
        const atuais = get().mensagens[conversationId] ?? SEM_MENSAGENS
        const porId = new Map(atuais.map((m) => [m.id, m]))
        let mudou = false

        for (const nova of novas) {
          const existente = porId.get(nova.id)
          if (existente) {
            // A versão confirmada pelo banco nunca é rebaixada para uma local.
            if (!existente.local && nova.local) continue
            const igual =
              existente.local === nova.local &&
              existente.content === nova.content &&
              existente.created_at === nova.created_at
            if (igual) continue
          }
          porId.set(nova.id, nova)
          mudou = true
        }
        if (!mudou) return

        const lista = ordenar([...porId.values()])
        const ultima = lista.at(-1)
        // A regra de desbloqueio: a última mensagem da conversa é do agente.
        const agenteRespondeu = ultima?.role === 'assistant'
        if (agenteRespondeu) cancelarTimeout(conversationId)

        set((s) => ({
          mensagens: { ...s.mensagens, [conversationId]: lista },
          envio:
            agenteRespondeu && s.envio[conversationId]
              ? { ...s.envio, [conversationId]: ESTADO_ENVIO_INICIAL }
              : s.envio,
          conversas: tocar(s.conversas, conversationId, ultima),
        }))
      },

      marcarMensagem: (conversationId, mensagemId, local) =>
        set((s) => {
          const lista = s.mensagens[conversationId]
          if (!lista) return {}
          return {
            mensagens: {
              ...s.mensagens,
              [conversationId]: ordenar(lista.map((m) => (m.id === mensagemId ? { ...m, local } : m))),
            },
          }
        }),

      iniciarEspera: (conversationId, mensagemId) => {
        const enviadoEm = Date.now()
        set((s) => ({
          envio: {
            ...s.envio,
            [conversationId]: { aguardandoResposta: true, enviadoEm, mensagemPendenteId: mensagemId, erro: null },
          },
        }))
        agendarTimeout(conversationId, TIMEOUT_RESPOSTA_MS)
        return enviadoEm
      },

      falharEnvio: (conversationId, tentativa) => {
        const atual = get().envio[conversationId]
        // Ignora falhas de tentativas antigas (o usuário já reenviou ou o agente já respondeu).
        if (!atual?.aguardandoResposta || atual.enviadoEm !== tentativa) return
        cancelarTimeout(conversationId)
        set((s) => ({
          envio: { ...s.envio, [conversationId]: { ...atual, aguardandoResposta: false, erro: 'falha_envio' } },
        }))
      },

      restaurarEstadoEnvio: (conversationId) => {
        const lista = get().mensagens[conversationId] ?? SEM_MENSAGENS
        const ultima = lista.at(-1)
        const atual = get().envio[conversationId]

        const definir = (estado: EstadoEnvio) => set((s) => ({ envio: { ...s.envio, [conversationId]: estado } }))

        if (!ultima || ultima.role === 'assistant') {
          cancelarTimeout(conversationId)
          if (atual) definir(ESTADO_ENVIO_INICIAL)
          return
        }

        // Já sabemos o que aconteceu com essa mensagem (envio em andamento,
        // ou estado salvo antes do reload): preserva.
        if (atual && atual.mensagemPendenteId === ultima.id && atual.enviadoEm !== null) {
          if (!atual.aguardandoResposta) return
          const restante = atual.enviadoEm + TIMEOUT_RESPOSTA_MS - Date.now()
          if (restante <= 0) {
            cancelarTimeout(conversationId)
            definir({ ...atual, aguardandoResposta: false, erro: 'timeout' })
          } else if (!timers.has(conversationId)) {
            agendarTimeout(conversationId, restante)
          }
          return
        }

        // Sem informação local: deduz pelo horário da última mensagem do usuário.
        const enviadoEm = Date.parse(ultima.created_at)
        const restante = enviadoEm + TIMEOUT_RESPOSTA_MS - Date.now()
        if (Number.isNaN(enviadoEm) || restante <= 0) {
          cancelarTimeout(conversationId)
          definir({ aguardandoResposta: false, enviadoEm, mensagemPendenteId: ultima.id, erro: 'timeout' })
        } else {
          definir({ aguardandoResposta: true, enviadoEm, mensagemPendenteId: ultima.id, erro: null })
          agendarTimeout(conversationId, restante)
        }
      },

      limpar: () => {
        for (const id of timers.keys()) cancelarTimeout(id)
        set({ conversas: [], mensagens: {}, envio: {} })
      },
    }),
    {
      // Só o estado de envio pendente/com erro sobrevive ao reload; o resto vem do banco.
      name: 'movi-envio',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        envio: Object.fromEntries(
          Object.entries(s.envio).filter(([, e]) => e.aguardandoResposta || e.erro !== null),
        ),
      }),
    },
  ),
)

/** Atualiza updated_at local para a conversa subir na lista ao receber/enviar mensagem. */
function tocar(conversas: Conversa[], conversationId: string, ultima: Mensagem | undefined): Conversa[] {
  if (!ultima) return conversas
  const alvo = conversas.find((c) => c.id === conversationId)
  if (!alvo || Date.parse(alvo.updated_at) >= Date.parse(ultima.created_at)) return conversas
  const atualizada = { ...alvo, updated_at: ultima.created_at }
  return [atualizada, ...conversas.filter((c) => c.id !== conversationId)]
}

export function useMensagens(conversationId: string | undefined): readonly Mensagem[] {
  return useChatStore((s) => (conversationId ? s.mensagens[conversationId] : undefined)) ?? SEM_MENSAGENS
}

export function useEstadoEnvio(conversationId: string | undefined): EstadoEnvio {
  return useChatStore((s) => (conversationId ? s.envio[conversationId] : undefined)) ?? ESTADO_ENVIO_INICIAL
}
