import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { PasswordField } from '../components/ui/PasswordField'
import { Spinner } from '../components/ui/Spinner'
import { validarNovaSenha } from '../lib/validacao'
import { ErroAutenticacao, redefinirSenha } from '../services/auth'
import { useAuthStore } from '../store/authStore'

/** Página aberta pelo link do e-mail de recuperação (o Supabase já cria a sessão). */
export default function RedefinirSenha() {
  const navigate = useNavigate()
  const carregando = useAuthStore((s) => s.carregando)
  const usuario = useAuthStore((s) => s.usuario)
  const concluirRecuperacao = useAuthStore((s) => s.concluirRecuperacao)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const novosErros = validarNovaSenha(senha, confirmacao)
    setErros(novosErros)
    setErroGeral(null)
    if (novosErros.senha || novosErros.confirmacao) return

    setEnviando(true)
    try {
      await redefinirSenha(senha)
      concluirRecuperacao()
      navigate('/chat', { replace: true })
    } catch (e) {
      setErroGeral(e instanceof ErroAutenticacao ? e.message : 'Não foi possível salvar a nova senha.')
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center text-suave" role="status">
        <Spinner className="size-6" />
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (!usuario) {
    return (
      <AuthLayout titulo="Link inválido ou expirado" descricao="Solicite um novo link de redefinição de senha.">
        <Link
          to="/esqueci-senha"
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-destaque px-4 text-sm font-medium text-sobre-destaque hover:bg-destaque-forte"
        >
          Solicitar novo link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titulo="Criar nova senha" descricao={`Defina a nova senha para ${usuario.email}.`}>
      <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}
        <PasswordField
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
        />
        <PasswordField
          label="Confirmar nova senha"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erros.confirmacao}
        />
        <Button type="submit" carregando={enviando} textoCarregando="Salvando..." className="w-full">
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  )
}
