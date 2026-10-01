function obrigatoria(nome: keyof ImportMetaEnv): string {
  const valor = import.meta.env[nome]
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ${nome} não definida. Copie .env.example para .env e preencha os valores.`,
    )
  }
  return valor.trim()
}

export const env = {
  supabaseUrl: obrigatoria('VITE_SUPABASE_URL'),
  supabaseAnonKey: obrigatoria('VITE_SUPABASE_ANON_KEY'),
  webhookUrl: obrigatoria('VITE_WEBHOOK_URL'),
} as const
