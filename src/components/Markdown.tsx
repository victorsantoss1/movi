import { Check, Copy } from 'lucide-react'
import { isValidElement, memo, useRef, useState, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

type PreProps = ComponentPropsWithoutRef<'pre'> & ExtraProps

function linguagemDo(children: PreProps['children']): string | null {
  if (!isValidElement<{ className?: string }>(children)) return null
  const classe = children.props.className ?? ''
  const resultado = /language-([\w+#-]+)/.exec(classe)
  return resultado?.[1] ?? null
}

function BlocoDeCodigo({ children, node: _node, ...props }: PreProps) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copiado, setCopiado] = useState(false)
  const linguagem = linguagemDo(children)

  async function copiar() {
    const texto = preRef.current?.innerText ?? ''
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) — ignora.
    }
  }

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-borda bg-elevado/50">
      <div className="flex items-center justify-between border-b border-borda px-3 py-1.5 text-xs text-suave">
        <span>{linguagem ?? 'código'}</span>
        <button
          type="button"
          onClick={() => void copiar()}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-elevado hover:text-texto"
        >
          {copiado ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre ref={preRef} className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed" {...props}>
        {children}
      </pre>
    </div>
  )
}

const componentes: Components = {
  pre: BlocoDeCodigo,
  a: ({ node: _node, children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
}

const plugins = [remarkGfm]

/** Renderiza markdown (GFM). HTML bruto é ignorado — o conteúdo vem de fora. */
export const Markdown = memo(function Markdown({ conteudo }: { conteudo: string }) {
  return (
    <div className="markdown prose prose-sm max-w-none break-words sm:prose-base">
      <ReactMarkdown remarkPlugins={plugins} components={componentes}>
        {conteudo}
      </ReactMarkdown>
    </div>
  )
})
