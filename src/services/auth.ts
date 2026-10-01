import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Usuario } from '../types'

export const ROTA_REDEFINIR_SENHA = '/redefinir-senha'

/** Erro com mensagem já pronta para exibir ao usuário. */
export class ErroAutenticacao extends Error {
  override name = 'ErroAutenticacao'
}

function traduzirErro(erro: AuthError): ErroAutenticacao {
  const codigo = erro.code ?? ''
  const msg = erro.message.toLowerCase()

  // Supabase não diferencia "e-mail inexistente" de "senha errada" (proteção
  // contra enumeração de usuários) — e nós também não devemos.
  if (codigo === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return new ErroAutenticacao('E-mail ou senha incorretos.')
  }
  if (codigo === 'email_not_confirmed') {
    return new ErroAutenticacao('Confirme seu e-mail antes de entrar.')
  }
  if (codigo === 'over_request_rate_limit' || codigo === 'over_email_send_rate_limit' || erro.status === 429) {
    return new ErroAutenticacao('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
  }
  if (codigo === 'same_password') {
    return new ErroAutenticacao('A nova senha precisa ser diferente da atual.')
  }
  if (codigo === 'weak_password') {
    return new ErroAutenticacao('Senha fraca. Use uma senha mais longa e difícil de adivinhar.')
  }
  if (erro.name === 'AuthRetryableFetchError' || msg.includes('failed to fetch')) {
    return new ErroAutenticacao('Não foi possível conectar. Verifique sua internet.')
  }
  return new ErroAutenticacao('Algo deu errado. Tente novamente em instantes.')
}

export function paraUsuario(user: User): Usuario {
  const email = user.email ?? ''
  const meta: Record<string, unknown> = user.user_metadata
  const nomeMeta = meta['full_name'] ?? meta['name']
  const nome = typeof nomeMeta === 'string' && nomeMeta.trim() !== '' ? nomeMeta.trim() : email.split('@')[0] ?? email
  return { id: user.id, email, nome }
}

export async function login(email: string, senha: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) throw traduzirErro(error)
  return data.session
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw traduzirErro(error)
}

/** Envia o e-mail com o link de redefinição de senha. */
export async function recuperarSenha(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${ROTA_REDEFINIR_SENHA}`,
  })
  if (error) throw traduzirErro(error)
}

/** Define a nova senha (usado na página aberta pelo link do e-mail). */
export async function redefinirSenha(novaSenha: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw traduzirErro(error)
}

export async function getSessao(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw traduzirErro(error)
  return data.session
}
