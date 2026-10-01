import { useEffect, useMemo, useState } from 'react'
import { buscarConversasPorConteudo } from '../services/conversations'
import type { Conversa } from '../types'

const ATRASO_BUSCA_MS = 300

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Filtra as conversas pelo título (na hora) e pelo conteúdo das mensagens
 * (consulta ao banco com debounce).
 */
export function useBuscaConversas(conversas: readonly Conversa[], termo: string) {
  const termoLimpo = termo.trim()
  const [idsPorConteudo, setIdsPorConteudo] = useState<{ termo: string; ids: Set<string> } | null>(null)

  useEffect(() => {
    if (termoLimpo.length < 2) return
    let ativo = true
    const timer = setTimeout(() => {
      buscarConversasPorConteudo(termoLimpo)
        .then((ids) => {
          if (ativo) setIdsPorConteudo({ termo: termoLimpo, ids: new Set(ids) })
        })
        .catch(() => {
          // Sem a busca por conteúdo, o filtro por título continua funcionando.
        })
    }, ATRASO_BUSCA_MS)
    return () => {
      ativo = false
      clearTimeout(timer)
    }
  }, [termoLimpo])

  const filtradas = useMemo(() => {
    if (!termoLimpo) return conversas
    const alvo = normalizar(termoLimpo)
    const ids = idsPorConteudo?.termo === termoLimpo ? idsPorConteudo.ids : null
    return conversas.filter((c) => normalizar(c.title).includes(alvo) || ids?.has(c.id) === true)
  }, [conversas, termoLimpo, idsPorConteudo])

  return filtradas
}
