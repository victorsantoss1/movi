const OBRIGATORIAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_WEBHOOK_URL'] as const

/** Lista as variáveis de ambiente obrigatórias que não foram definidas. */
export function variaveisFaltando(): string[] {
  return OBRIGATORIAS.filter((nome) => {
    const valor: unknown = import.meta.env[nome]
    return typeof valor !== 'string' || valor.trim() === ''
  })
}
