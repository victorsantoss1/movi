import type { Conversa } from '../types'

export type Periodo = 'Hoje' | 'Ontem' | 'Últimos 7 dias' | 'Mais antigas'

const ORDEM: readonly Periodo[] = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Mais antigas']
const DIA_MS = 24 * 60 * 60 * 1000

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()
}

export function periodoDe(dataIso: string, agora: Date = new Date()): Periodo {
  const dia = inicioDoDia(new Date(dataIso))
  const hoje = inicioDoDia(agora)
  if (dia >= hoje) return 'Hoje'
  if (dia >= hoje - DIA_MS) return 'Ontem'
  if (dia >= hoje - 7 * DIA_MS) return 'Últimos 7 dias'
  return 'Mais antigas'
}

export interface GrupoConversas {
  periodo: Periodo
  conversas: Conversa[]
}

/** Agrupa por período da última atividade (updated_at), mantendo a ordem recebida. */
export function agruparPorPeriodo(conversas: readonly Conversa[], agora: Date = new Date()): GrupoConversas[] {
  const grupos = new Map<Periodo, Conversa[]>()
  for (const conversa of conversas) {
    const periodo = periodoDe(conversa.updated_at, agora)
    const lista = grupos.get(periodo)
    if (lista) lista.push(conversa)
    else grupos.set(periodo, [conversa])
  }
  return ORDEM.flatMap((periodo) => {
    const lista = grupos.get(periodo)
    return lista ? [{ periodo, conversas: lista }] : []
  })
}
