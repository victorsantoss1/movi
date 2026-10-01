import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { PasswordField } from '../components/ui/PasswordField'
import { TextField } from '../components/ui/TextField'
import { validarEmail, validarSenha } from '../lib/validacao'
import { ErroAutenticacao, login } from '../services/auth'

interface ErrosCampos {
  email?: string
  senha?: string
}

function destinoAposLogin(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'de' in state) {
    const de = (state as { de: unknown }).de
    if (typeof de === 'string' && de.startsWith('/chat')) return de
  }
  return '/chat'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<ErrosCampos>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const senhaRef = useRef<HTMLInputElement>(null)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const novosErros: ErrosCampos = {}
    const erroEmail = validarEmail(email)
    const erroSenha = validarSenha(senha)
    if (erroEmail) novosErros.email = erroEmail
    if (erroSenha) novosErros.senha = erroSenha
    setErros(novosErros)
    setErroGeral(null)

    if (erroEmail) return emailRef.current?.focus()
    if (erroSenha) return senhaRef.current?.focus()

    setEnviando(true)
    try {
      await login(email, senha)
      navigate(destinoAposLogin(location.state), { replace: true })
    } catch (erro) {
      setErroGeral(erro instanceof ErroAutenticacao ? erro.message : 'Não foi possível entrar. Tente novamente.')
      setEnviando(false)
      // O botão desabilitado durante o envio tira o foco; devolve para a senha.
      requestAnimationFrame(() => senhaRef.current?.select())
    }
  }

  return (
    <AuthLayout titulo="Entrar" descricao="Acesse sua conta para conversar com o agente.">
      <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
        {erroGeral && <Alert tipo="erro">{erroGeral}</Alert>}

        <TextField
          ref={emailRef}
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
          placeholder="voce@exemplo.com"
        />

        <PasswordField
          ref={senhaRef}
          label="Senha"
          name="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
        />

        <div className="-mt-1 flex justify-end">
          <Link to="/esqueci-senha" className="rounded text-sm text-destaque hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" carregando={enviando} textoCarregando="Entrando..." className="w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
