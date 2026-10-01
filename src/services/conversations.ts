import { supabase } from './supabase'
import type { Conversa, Mensagem } from '../types'
import type { MessageRow } from '../types/database'

const TAMANHO_TITULO = 40

/** Código Postgres de violação de unicidade (registro com o mesmo id já existe). */
const UNIQUE_VIOLATION = '23505'

/** Título da conversa = primeiros ~40 caracteres da primeira mensagem. */
export function gerarTitulo(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (limpo.length <= TAMANHO_TITULO) return limpo
  return `${limpo.slice(0, TAMANHO_TITULO).trimEnd()}…`
}

export async function listarConversas(): Promise<Conversa[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function buscarConversa(id: string): Promise<Conversa | null> {
  const { data, error } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/**
 * Cria a conversa com o id gerado no front-end. Idempotente: se o registro já
 * existir (ex.: "Tentar novamente" após falha de rede), não faz nada.
 */
export async function criarConversa(conversa: { id: string; userId: string; titulo: string }): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .insert({ id: conversa.id, user_id: conversa.userId, title: conversa.titulo })
  if (error && error.code !== UNIQUE_VIOLATION) throw error
}

export async function renomearConversa(id: string, titulo: string): Promise<Conversa> {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title: titulo })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function excluirConversa(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id)
  if (error) throw error
}

export async function listarMensagens(conversationId: string): Promise<Mensagem[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Grava a mensagem do usuário com o id gerado no front-end. Idempotente: se a
 * mensagem já existir, devolve null e não duplica (usado no "Tentar novamente").
 */
export async function inserirMensagemUsuario(mensagem: {
  id: string
  conversationId: string
  userId: string
  conteudo: string
}): Promise<MessageRow | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      id: mensagem.id,
      conversation_id: mensagem.conversationId,
      user_id: mensagem.userId,
      role: 'user',
      content: mensagem.conteudo,
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null
    throw error
  }
  return data
}

/** Valida em tempo de execução um registro de mensagem vindo do Realtime. */
export function ehMensagemRow(valor: unknown): valor is MessageRow {
  if (typeof valor !== 'object' || valor === null) return false
  const v = valor as Record<string, unknown>
  return (
    typeof v['id'] === 'string' &&
    typeof v['conversation_id'] === 'string' &&
    typeof v['user_id'] === 'string' &&
    (v['role'] === 'user' || v['role'] === 'assistant') &&
    typeof v['content'] === 'string' &&
    typeof v['created_at'] === 'string'
  )
}

/** Ids das conversas que têm alguma mensagem contendo o termo (busca no histórico). */
export async function buscarConversasPorConteudo(termo: string): Promise<string[]> {
  // Remove curingas do LIKE/PostgREST para o termo ser tratado como texto literal.
  const limpo = termo.replace(/[\\%_*]/g, ' ').trim()
  if (limpo.length < 2) return []
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .ilike('content', `%${limpo}%`)
    .limit(500)
  if (error) throw error
  return [...new Set(data.map((m) => m.conversation_id))]
}
