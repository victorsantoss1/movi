import { env } from '../lib/env'
import { gerarUuid } from '../lib/uuid'
import { useAuthStore } from '../store/authStore'
import { TIMEOUT_RESPOSTA_MS, useChatStore } from '../store/chatStore'
import type { Mensagem, Usuario, WebhookPayload } from '../types'
import { criarConversa, gerarTitulo, inserirMensagemUsuario } from './conversations'

interface EnviarMensagemParams {
  /** null/undefined = conversa nova (o id é gerado aqui). */
  conversationId: string | null | undefined
  texto: string
  /** Chamado assim que o id de uma conversa nova é gerado (ex.: navegar para /chat/:id). */
  aoCriarConversa?: (conversationId: string) => void
}

export interface ResultadoEnvio {
  conversationId: string
  ok: boolean
}

class ErroWebhook extends Error {
  override name = 'ErroWebhook'
}

function chat() {
  return useChatStore.getState()
}

function semEstadoLocal(m: Mensagem): Mensagem {
  return {
    id: m.id,
    conversation_id: m.conversation_id,
    user_id: m.user_id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
  }
}

/**
 * A conversa pode não existir no banco se o INSERT dela falhou e o usuário
 * enviou outra mensagem em vez de usar "Tentar novamente". Se já há alguma
 * mensagem confirmada, a conversa com certeza existe.
 */
function conversaPodeNaoExistir(conversationId: string): boolean {
  return !(chat().mensagens[conversationId] ?? []).some((m) => !m.local)
}

function paraIso(data: string): string {
  const ms = Date.parse(data)
  return Number.isNaN(ms) ? data : new Date(ms).toISOString()
}

function montarPayload(mensagem: Mensagem, usuario: Usuario): WebhookPayload {
  return {
    conversation_id: mensagem.conversation_id,
    message_id: mensagem.id,
    user_id: usuario.id,
    user_email: usuario.email,
    message: mensagem.content,
    // created_at da mensagem: o "Tentar novamente" reenvia exatamente o mesmo payload.
    timestamp: paraIso(mensagem.created_at),
  }
}

/** POST no webhook. Qualquer 2xx = recebido. O corpo da resposta não é lido. */
async function postarWebhook(payload: WebhookPayload): Promise<void> {
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), TIMEOUT_RESPOSTA_MS)
  try {
    const resposta = await fetch(env.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controle.signal,
    })
    if (!resposta.ok) throw new ErroWebhook(`Webhook respondeu HTTP ${resposta.status}`)
  } finally {
    clearTimeout(limite)
  }
}

/**
 * Grava (se ainda não gravou) e dispara o webhook. Usado no primeiro envio e
 * no "Tentar novamente" — por isso cada passo é idempotente.
 */
async function processarEnvio(
  mensagem: Mensagem,
  usuario: Usuario,
  tentativa: number,
  garantirConversa: boolean,
): Promise<boolean> {
  const conversationId = mensagem.conversation_id
  let salva = mensagem

  if (mensagem.local) {
    try {
      // 1. A conversa precisa existir ANTES do webhook: o fluxo externo grava
      //    a resposta apontando para ela.
      if (garantirConversa) {
        const titulo = chat().conversas.find((c) => c.id === conversationId)?.title ?? gerarTitulo(mensagem.content)
        await criarConversa({ id: conversationId, userId: usuario.id, titulo })
      }
      // 2. Mensagem do usuário (já exibida de forma otimista).
      const registro = await inserirMensagemUsuario({
        id: mensagem.id,
        conversationId,
        userId: usuario.id,
        conteudo: mensagem.content,
      })
      salva = registro ?? semEstadoLocal(mensagem)
      chat().mesclarMensagens(conversationId, [salva])
    } catch (erro) {
      console.error('[agent] falha ao gravar a mensagem', erro)
      chat().marcarMensagem(conversationId, mensagem.id, 'nao_salva')
      chat().falharEnvio(conversationId, tentativa)
      return false
    }
  }

  // 4. Webhook (o passo 3, bloqueio, já foi feito por quem chamou).
  try {
    await postarWebhook(montarPayload(salva, usuario))
    return true
  } catch (erro) {
    console.error('[agent] falha ao chamar o webhook', erro)
    chat().falharEnvio(conversationId, tentativa)
    return false
  }
}

/**
 * Envia uma mensagem do usuário ao agente:
 * 1. conversa nova → gera o id e grava em conversations (antes do webhook)
 * 2. grava a mensagem em messages e exibe na hora
 * 3. bloqueia o envio da conversa ("aguardando resposta")
 * 4. POST no webhook; falha → desbloqueia e mostra "Tentar novamente"
 *
 * Na prática o bloqueio é ligado já no clique (antes do passo 1), para que um
 * duplo Enter não envie duas mensagens enquanto os INSERTs estão em andamento.
 * A resposta do agente chega pelo Realtime (ver useMensagensRealtime).
 */
export async function enviarMensagem({
  conversationId,
  texto,
  aoCriarConversa,
}: EnviarMensagemParams): Promise<ResultadoEnvio | null> {
  const conteudo = texto.trim()
  const usuario = useAuthStore.getState().usuario
  if (!conteudo || !usuario) return null
  if (conversationId && chat().envio[conversationId]?.aguardandoResposta) return null

  const ehNova = !conversationId
  const id = conversationId ?? gerarUuid()
  const agora = new Date().toISOString()
  const mensagem: Mensagem = {
    id: gerarUuid(),
    conversation_id: id,
    user_id: usuario.id,
    role: 'user',
    content: conteudo,
    created_at: agora,
    local: 'enviando',
  }

  if (ehNova) {
    chat().salvarConversa({ id, user_id: usuario.id, title: gerarTitulo(conteudo), created_at: agora, updated_at: agora })
  }
  chat().mesclarMensagens(id, [mensagem])
  const tentativa = chat().iniciarEspera(id, mensagem.id)
  if (ehNova) aoCriarConversa?.(id)

  const ok = await processarEnvio(mensagem, usuario, tentativa, ehNova || conversaPodeNaoExistir(id))
  return { conversationId: id, ok }
}

/**
 * "Tentar novamente": reenvia o MESMO payload (mesmo conversation_id e
 * message_id) da mensagem que falhou ou ficou sem resposta, sem duplicá-la no banco.
 */
export async function reenviarMensagem(conversationId: string): Promise<boolean> {
  const usuario = useAuthStore.getState().usuario
  const estado = chat().envio[conversationId]
  if (!usuario || !estado || estado.aguardandoResposta || !estado.mensagemPendenteId) return false

  const mensagem = chat().mensagens[conversationId]?.find((m) => m.id === estado.mensagemPendenteId)
  if (!mensagem) return false

  if (mensagem.local) chat().marcarMensagem(conversationId, mensagem.id, 'enviando')
  const tentativa = chat().iniciarEspera(conversationId, mensagem.id)
  return processarEnvio(mensagem, usuario, tentativa, conversaPodeNaoExistir(conversationId))
}
