import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { TextField } from './TextField'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  erro?: string | null
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(props, ref) {
  const [visivel, setVisivel] = useState(false)

  return (
    <TextField
      ref={ref}
      type={visivel ? 'text' : 'password'}
      acessorio={
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          className="rounded-md p-2 text-suave hover:bg-elevado hover:text-texto"
        >
          {visivel ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      }
      {...props}
    />
  )
})
