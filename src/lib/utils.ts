// ================================================================
// FLUXY — Utilitários
// ================================================================

import { format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DiaSemana, DispDias, StatusPedido } from '@/types'

export function moeda(valor: number | null | undefined): string {
  if (valor == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function dataBR(data: string | Date | null | undefined): string {
  if (!data) return '—'
  try {
    const d = typeof data === 'string' ? new Date(data + (data.length === 10 ? 'T12:00:00' : '')) : data
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch { return '—' }
}

export function dataHoraBR(data: string | Date | null | undefined): string {
  if (!data) return '—'
  try {
    const d = typeof data === 'string' ? new Date(data) : data
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch { return '—' }
}

export function waLink(numero: string | null | undefined): string {
  if (!numero) return '#'
  const n = numero.replace(/\D/g, '')
  if (n.length < 10) return '#'
  const com55 = n.startsWith('55') ? n : '55' + n
  return `https://wa.me/${com55}`
}

export function mapsLink(rua?: string, num?: string, cidade?: string, estado?: string): string {
  const end = [rua, num, cidade, estado].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`
}

const JS_DIA_DISP: DiaSemana[] = ['dom','seg','ter','qua','qui','sex','sab']

export function estaDisponivel(disp_dias: DispDias | null | undefined, data?: string | null): boolean {
  if (!disp_dias) return true
  const d = data ? new Date(data + 'T12:00:00') : new Date()
  const chave = JS_DIA_DISP[d.getDay()]
  return disp_dias[chave] !== false
}

export const STATUS_LABELS: Record<StatusPedido, string> = {
  recebido:         'Recebido',
  em_producao:      'Em Produção',
  pronto_embalagem: 'Pronto Embalagem',
  embalado:         'Embalado',
  pronto_entrega:   'Pronto Entrega',
  entregue:         'Entregue',
  cancelado:        'Cancelado',
}

export const STATUS_CORES: Record<StatusPedido, { bg: string; text: string }> = {
  recebido:         { bg: 'bg-blue-100',    text: 'text-blue-700' },
  em_producao:      { bg: 'bg-orange-100',  text: 'text-orange-700' },
  pronto_embalagem: { bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  embalado:         { bg: 'bg-green-100',   text: 'text-green-700' },
  pronto_entrega:   { bg: 'bg-purple-100',  text: 'text-purple-700' },
  entregue:         { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelado:        { bg: 'bg-red-100',     text: 'text-red-700' },
}

export const NEXT_STATUS: Partial<Record<StatusPedido, StatusPedido>> = {
  recebido:         'em_producao',
  em_producao:      'pronto_embalagem',
  pronto_embalagem: 'embalado',
  embalado:         'pronto_entrega',
  pronto_entrega:   'entregue',
}

export const STATUS_LIBERAM_PAG: StatusPedido[] = ['pronto_entrega', 'entregue']

export function filtrarPorPeriodo(data: string, periodo: string): boolean {
  const hoje = new Date()
  const hojeStr = format(hoje, 'yyyy-MM-dd')
  const d = data?.slice(0, 10)
  if (!d) return false
  switch (periodo) {
    case 'hoje':   return d === hojeStr
    case 'amanha': return d === format(new Date(Date.now() + 864e5), 'yyyy-MM-dd')
    case 'semana': {
      const ini = format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      return d >= ini && d <= hojeStr
    }
    case 'mes':    return d.slice(0, 7) === hojeStr.slice(0, 7)
    default:       return true
  }
}

export function gerarNumeroPedido(seq: number): string {
  return 'PED' + seq.toString().padStart(6, '0')
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
