import { ArrowLeft } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { validarEmail } from '../lib/validacao'
import { ErroAutenticacao, recuperarSenha } from '../services/auth'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erroCampo, setErroCampo] = useState<string | null>(null)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const erro = validarEmail(email)
    setErroCampo(erro)
    setErroGeral(null)
    if (erro) return emailRef.current?.focus()

    setEnviando(true)
    try {
      await recuperarSenha(email)
      setEnviado(true)
    } catch (e) {
      setErroGeral(e instanceof ErroAutenticacao ? e.message : 'Não foi possível enviar o link. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Esqueci minha senha"
      descricao="Informe seu e-mail e enviaremos um link para você criar uma nova senha."
    >
      {enviado ? (
        <Alert tipo="sucesso">
          Se existir uma conta para <strong>{email.trim()}</strong>, você receberá um e-mail com o link de
          redefinição em instantes. Confira também a caixa de spam.
        </Alert>
      ) : (
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
            erro={erroCampo}
            placeholder="voce@exemplo.com"
          />
          <Button type="submit" carregando={enviando} textoCarregando="Enviando..." className="w-full">
            Enviar link
          </Button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 rounded text-sm text-suave hover:text-texto"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para o login
      </Link>
    </AuthLayout>
  )
}
