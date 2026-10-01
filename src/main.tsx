import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { variaveisFaltando } from './lib/envCheck'

const raiz = createRoot(document.getElementById('root') as HTMLElement)
const faltando = variaveisFaltando()

if (faltando.length > 0) {
  // Sem configuração não dá para criar o client do Supabase: mostra o motivo em vez de tela branca.
  raiz.render(
    <StrictMode>
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-xl font-semibold">Configuração incompleta</h1>
        <p className="mt-2 text-sm text-suave">
          Copie <code>.env.example</code> para <code>.env</code>, preencha as variáveis abaixo e reinicie o servidor:
        </p>
        <ul className="mt-4 list-disc pl-6 font-mono text-sm">
          {faltando.map((nome) => (
            <li key={nome}>{nome}</li>
          ))}
        </ul>
      </main>
    </StrictMode>,
  )
} else {
  // Import dinâmico: o client do Supabase só é criado com o .env válido.
  void import('./App').then(({ default: App }) => {
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}
