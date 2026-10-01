import type { ConversationRow, MessageRole, MessageRow } from './database'

export type { MessageRole }

export type Conversa = ConversationRow

/**
 * Mensagem exibida no chat. `local` só existe no front-end:
 * - 'enviando': exibida de forma otimista, INSERT ainda em andamento
 * - 'nao_salva': o INSERT falhou; o "Tentar novamente" grava antes de reenviar
 */
export interface Mensagem extends MessageRow {
  local?: 'enviando' | 'nao_salva'
}

/** Motivo pelo qual a conversa saiu do estado "aguardando resposta" com erro. */
export type ErroEnvio = 'falha_envio' | 'timeout'

/** Estado de envio por conversa (regra de "uma mensagem por vez"). */
export interface EstadoEnvio {
  aguardandoResposta: boolean
  /** Momento (epoch ms) em que o webhook foi disparado pela última vez. */
  enviadoEm: number | null
  /** Mensagem do usuário que está aguardando resposta / falhou. */
  mensagemPendenteId: string | null
  erro: ErroEnvio | null
}

/** Corpo enviado ao webhook. */
export interface WebhookPayload {
  conversation_id: string
  message_id: string
  user_id: string
  user_email: string
  message: string
  timestamp: string
}

export interface Usuario {
  id: string
  email: string
  nome: string
}

export type Tema = 'escuro' | 'claro'
