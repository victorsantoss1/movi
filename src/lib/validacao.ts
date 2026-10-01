const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validarEmail(email: string): string | null {
  const valor = email.trim()
  if (!valor) return 'Informe seu e-mail.'
  if (!EMAIL_REGEX.test(valor)) return 'E-mail inválido.'
  return null
}

export function validarSenha(senha: string): string | null {
  if (!senha) return 'Informe sua senha.'
  return null
}

export const TAMANHO_MINIMO_SENHA = 8

export function validarNovaSenha(senha: string, confirmacao: string): { senha?: string; confirmacao?: string } {
  const erros: { senha?: string; confirmacao?: string } = {}
  if (!senha) erros.senha = 'Informe a nova senha.'
  else if (senha.length < TAMANHO_MINIMO_SENHA) erros.senha = `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  if (!confirmacao) erros.confirmacao = 'Confirme a nova senha.'
  else if (senha && confirmacao !== senha) erros.confirmacao = 'As senhas não conferem.'
  return erros
}
