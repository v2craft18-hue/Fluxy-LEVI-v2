'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  usePedidos, usePedidosRealtime, useCriarPedido, useEditarPedido,
  useCancelarPedido, usePedido, useMarcarPago, useClientes,
  useProdutos, useVendedores, useEntregadores, useAvancarStatus,
} from '@/hooks/usePedidos'
import { moeda, dataBR, STATUS_LABELS, STATUS_CORES, NEXT_STATUS } from '@/lib/utils'
import {
  Plus, Search, X, Trash2, Eye, Edit2, ChevronRight,
  AlertTriangle, Printer, FileDown, MessageCircle,
} from 'lucide-react'
import type { StatusPedido, PedidoFormData, FormaPag, MomentoPag, Pedido } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useReactToPrint } from 'react-to-print'
import { useAppStore } from '@/store'
import {
  gerarPDFA4, imprimirTermica, imprimirA4,
  gerarMensagemWhatsApp, abrirWhatsApp, FORMAS_PAG_LABEL,
} from '@/lib/impressao'

// ────────────────────────────────────────────────────────────
// CONSTANTES
// ────────────────────────────────────────────────────────────
const FORMAS_PAG: { value: FormaPag; label: string }[] = [
  { value: 'pix',            label: 'PIX' },
  { value: 'dinheiro',       label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'cartao_debito',  label: 'Cartão Débito' },
  { value: 'boleto',         label: 'Boleto' },
]
const FILTROS_STATUS: { value: StatusPedido | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'recebido',         label: 'Recebido' },
  { value: 'em_producao',      label: 'Em Produção' },
  { value: 'pronto_embalagem', label: 'Pronto Embalagem' },
  { value: 'embalado',         label: 'Embalado' },
  { value: 'pronto_entrega',   label: 'Pronto Entrega' },
  { value: 'entregue',         label: 'Entregue' },
  { value: 'cancelado',        label: 'Cancelado' },
]
const FILTROS_PERIODO = [
  { value: '',         label: 'Todos os períodos' },
  { value: 'hoje',     label: '📅 Hoje' },
  { value: 'semana',   label: '📅 Esta Semana' },
  { value: 'mes',      label: '📅 Este Mês' },
  { value: 'ent_hoje', label: '🚚 Entregas Hoje' },
  { value: 'atrasado', label: '⚠️ Atrasados' },
  { value: 'agendado', label: '📆 Agendados' },
]
const NAO_ENTREGUE_SET = new Set(['recebido','em_producao','pronto_embalagem','embalado','pronto_entrega'])

// ────────────────────────────────────────────────────────────
// TIPO ITEM FORMULÁRIO
// ────────────────────────────────────────────────────────────
type LinhaItem = { prod_id: string; nome: string; qtd: number; unit: number; desconto_item: number; tot: number }
const itemVazio = (): LinhaItem => ({ prod_id: '', nome: '', qtd: 1, unit: 0, desconto_item: 0, tot: 0 })

// ────────────────────────────────────────────────────────────
// HOOK: ações de impressão/PDF/WhatsApp para um pedido
// ────────────────────────────────────────────────────────────
function useAcoesImpressao(p: Pedido | null | undefined) {
  const { empresa, formatoImpressao } = useAppStore()
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: p ? `Pedido-${p.numero}` : 'Pedido',
    pageStyle: formatoImpressao === 'a4'
      ? '@page { size: A4; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'
      : '@page { size: 80mm auto; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; } }',
  })

  const acaoPDF = useCallback(async () => {
    if (!p) return
    try { await gerarPDFA4(p, empresa); toast.success(`PDF gerado: Pedido-${p.numero}.pdf`) }
    catch (err) { console.error(err); toast.error('Erro ao gerar PDF') }
  }, [p, empresa])

  const acaoImprimir = useCallback(() => {
    if (!p) return
    if (formatoImpressao === 'termica') { imprimirTermica(p, empresa); return }
    // A4: tenta react-to-print; se printRef não estiver disponível usa popup
    if (printRef.current) { handlePrint(); return }
    imprimirA4(p, empresa)
  }, [p, empresa, formatoImpressao, handlePrint])

  const acaoWhatsApp = useCallback(() => {
    if (!p) return
    const msg = gerarMensagemWhatsApp(p, empresa)
    abrirWhatsApp(p.cliente?.whats, msg)
  }, [p, empresa])

  return { printRef, acaoPDF, acaoImprimir, acaoWhatsApp }
}

// ────────────────────────────────────────────────────────────
// COMPONENTE DE CONTEÚDO PARA IMPRESSÃO (A4 inline)
// Fica hidden na tela, visível apenas quando react-to-print age
// ────────────────────────────────────────────────────────────
function PrintContent({ p, empresa }: {
  p: Pedido
  empresa: { nome: string; razao?: string; cnpj?: string; tel?: string; whats?: string; rua?: string; num?: string; bairro?: string; cidade?: string; estado?: string; logo?: string } | null
}) {
  const pag = p.pagamentos?.[0]
  const cli = p.cliente

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20mm 15mm', maxWidth: '210mm', margin: '0 auto', color: '#111', fontSize: '12px' }}>
      {/* Cabeçalho */}
      <div style={{ background: '#e85d04', color: '#fff', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          {empresa?.logo && <img src={empresa.logo} alt="logo" style={{ height: '36px', marginBottom: '4px', display: 'block' }} />}
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{empresa?.nome || 'Fluxy'}</div>
          {empresa?.razao && <div style={{ fontSize: '10px', opacity: 0.85 }}>{empresa.razao}</div>}
          {empresa?.cnpj && <div style={{ fontSize: '10px', opacity: 0.85 }}>CNPJ: {empresa.cnpj}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{p.numero}</div>
          <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.85 }}>Emitido: {dataBR(p.data_pedido)}</div>
          <div style={{ display: 'inline-block', marginTop: '5px', padding: '2px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}>
            {STATUS_LABELS[p.status]}
          </div>
        </div>
      </div>

      {/* Info empresa */}
      {(empresa?.tel || empresa?.rua) && (
        <div style={{ fontSize: '10px', color: '#555', marginBottom: '10px' }}>
          {[empresa.tel ? `Tel: ${empresa.tel}` : '', empresa.whats ? `WhatsApp: ${empresa.whats}` : '', empresa.rua ? [empresa.rua, empresa.num, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ') : ''].filter(Boolean).join('  |  ')}
        </div>
      )}

      {/* Entrega / vendedor */}
      {(p.data_ent || p.vendedor || p.entregador) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '10px', color: '#555' }}>
          {p.data_ent && <span>Entrega: <strong>{dataBR(p.data_ent)}{p.hora_ent ? ` às ${p.hora_ent}` : ''}</strong></span>}
          {p.vendedor && <span>Vendedor: <strong>{p.vendedor.nome}</strong></span>}
          {p.entregador && <span>Entregador: <strong>{p.entregador.nome}</strong></span>}
        </div>
      )}

      {/* Cliente */}
      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '10px 14px', marginBottom: '10px', background: '#fafafa' }}>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: '5px' }}>CLIENTE</div>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>{p.cliente?.nome || '—'}</div>
        {p.cliente?.cpf && <div style={{ fontSize: '10px', color: '#555' }}>CPF: {p.cliente.cpf}</div>}
        {cli?.cnpj && <div style={{ fontSize: '10px', color: '#555' }}>CNPJ: {cli.cnpj}</div>}
        {cli?.ie && <div style={{ fontSize: '10px', color: '#555' }}>IE: {cli.ie}</div>}
        {p.cliente?.tel && <div style={{ fontSize: '10px', color: '#555' }}>Tel: {p.cliente.tel}</div>}
        {p.cliente?.whats && <div style={{ fontSize: '10px', color: '#555' }}>WhatsApp: {p.cliente.whats}</div>}
        {cli?.rua && <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>{[cli.rua, cli.num, cli.bairro, cli.cidade, cli.estado].filter(Boolean).join(', ')}</div>}
      </div>

      {/* Tabela de itens */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#e85d04', color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>Produto</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, width: '50px' }}>Qtd</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, width: '90px' }}>Unit.</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, width: '80px' }}>Desc.</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, width: '95px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {p.itens?.map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '5px 8px' }}>{item.produto?.nome || '—'}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right' }}>{item.qtd}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: '#555' }}>{moeda(item.unit)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: '#c00' }}>
                {item.desconto_item > 0 ? `-${moeda(item.desconto_item)}` : '—'}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{moeda(item.tot)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totais */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <table style={{ fontSize: '11px', borderCollapse: 'collapse', minWidth: '220px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 10px 3px 0', color: '#555' }}>Subtotal</td>
              <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600 }}>{moeda(p.subtotal)}</td>
            </tr>
            {p.desconto > 0 && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#c00' }}>Desconto</td>
                <td style={{ padding: '3px 0', textAlign: 'right', color: '#c00', fontWeight: 600 }}>-{moeda(p.desconto)}</td>
              </tr>
            )}
            {p.taxa_entrega > 0 && (
              <tr>
                <td style={{ padding: '3px 10px 3px 0', color: '#555' }}>Taxa de Entrega</td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600 }}>{moeda(p.taxa_entrega)}</td>
              </tr>
            )}
            <tr style={{ borderTop: '2px solid #e85d04' }}>
              <td style={{ padding: '7px 10px 3px 0', fontSize: '14px', fontWeight: 700 }}>TOTAL</td>
              <td style={{ padding: '7px 0 3px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#e85d04' }}>{moeda(p.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagamento */}
      {pag && (
        <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '10px 14px', marginBottom: '10px', background: '#fafafa' }}>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: '5px' }}>PAGAMENTO</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{FORMAS_PAG_LABEL[pag.forma] || pag.forma}</span>
              <span style={{ color: '#555', marginLeft: '8px', fontSize: '10px' }}>{pag.momento === 'pedido' ? 'Pago no pedido' : 'A pagar na entrega'}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: 700 }}>{moeda(pag.valor)}</span>
              <span style={{ marginLeft: '8px', color: pag.status === 'pago' ? '#16a34a' : '#d97706', fontWeight: 700, fontSize: '10px' }}>
                {pag.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Observações */}
      {p.obs && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px' }}>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#92400e', fontWeight: 700, marginBottom: '4px' }}>OBSERVAÇÕES</div>
          <div style={{ fontSize: '11px', color: '#78350f' }}>{p.obs}</div>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '8px', fontSize: '9px', color: '#bbb', textAlign: 'center' }}>
        Gerado em {dataBR(new Date())} · {empresa?.nome || 'Fluxy'} · Sistema de Gestão
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// MODAL VISUALIZAR PEDIDO
// ────────────────────────────────────────────────────────────
function ModalVisualizarPedido({ pedidoId, onClose, onEditar }: {
  pedidoId: string
  onClose: () => void
  onEditar: () => void
}) {
  const { data: p, isLoading } = usePedido(pedidoId)
  const avancar = useAvancarStatus()
  const marcarPago = useMarcarPago()
  const cancelar = useCancelarPedido()
  const { printRef, acaoPDF, acaoImprimir, acaoWhatsApp } = useAcoesImpressao(p)

  if (isLoading || !p) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-8 shadow-2xl"><p className="text-gray-400">Carregando...</p></div>
    </div>
  )

  const { empresa } = useAppStore.getState()
  const cores = STATUS_CORES[p.status]
  const prox = NEXT_STATUS[p.status]
  const pag = p.pagamentos?.[0]
  const naoEntregue = NAO_ENTREGUE_SET.has(p.status)
  const cli = p.cliente

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-6" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-bold text-lg text-orange-600">{p.numero}</p>
            <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', cores.bg, cores.text)}>
              {STATUS_LABELS[p.status]}
            </span>
          </div>
          {/* Ações: PDF | Imprimir | WhatsApp | Fechar */}
          <div className="flex items-center gap-1.5">
            <button onClick={acaoPDF} title="Gerar PDF" className="flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition">
              <FileDown size={13} /><span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={acaoImprimir} title="Imprimir" className="flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
              <Printer size={13} /><span className="hidden sm:inline">Imprimir</span>
            </button>
            <button onClick={acaoWhatsApp} title="Compartilhar WhatsApp" className="flex items-center gap-1 border border-green-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 transition">
              <MessageCircle size={13} /><span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button onClick={onClose} className="ml-1 p-2 text-gray-400 hover:text-gray-700 transition"><X size={16} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Cliente + datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
              <p className="font-bold text-sm">{p.cliente?.nome || '—'}</p>
              {p.cliente?.cpf && <p className="text-xs text-gray-500 mt-0.5">CPF: {p.cliente.cpf}</p>}
              {cli?.cnpj && <p className="text-xs text-gray-500 mt-0.5">CNPJ: {cli.cnpj}</p>}
              {p.cliente?.tel && <p className="text-xs text-gray-500 mt-0.5">📞 {p.cliente.tel}</p>}
              {p.cliente?.whats && <p className="text-xs text-gray-500 mt-0.5">💬 {p.cliente.whats}</p>}
              {cli?.rua && <p className="text-xs text-gray-400 mt-1">{[cli.rua, cli.num, cli.bairro, cli.cidade].filter(Boolean).join(', ')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Criado</p>
                <p className="text-sm font-semibold">{dataBR(p.data_pedido)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Entrega</p>
                <p className="text-sm font-semibold">{p.data_ent ? dataBR(p.data_ent) : '—'}</p>
                {p.hora_ent && <p className="text-xs text-gray-400">{p.hora_ent}</p>}
              </div>
              {p.vendedor && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Vendedor</p>
                  <p className="text-sm font-semibold">{p.vendedor.nome}</p>
                </div>
              )}
              {p.entregador && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Entregador</p>
                  <p className="text-sm font-semibold">{p.entregador.nome}</p>
                </div>
              )}
            </div>
          </div>

          {/* Itens */}
          {p.itens && p.itens.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Itens do Pedido</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5 font-semibold">Produto</th>
                      <th className="text-center px-3 py-2.5 font-semibold w-16">Qtd</th>
                      <th className="text-right px-3 py-2.5 font-semibold w-28">Unit.</th>
                      <th className="text-right px-4 py-2.5 font-semibold w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.itens.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium">{item.produto?.nome || '—'}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500">{item.qtd}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{moeda(item.unit)}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{moeda(item.tot)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totais */}
          <div className="flex justify-end">
            <div className="min-w-[260px] space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800">{moeda(p.subtotal)}</span>
              </div>
              {p.desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Desconto</span>
                  <span className="font-semibold text-red-500">-{moeda(p.desconto)}</span>
                </div>
              )}
              {p.taxa_entrega > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de Entrega</span>
                  <span className="font-semibold text-gray-800">{moeda(p.taxa_entrega)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t-2 border-orange-400">
                <span className="font-bold text-base">Total</span>
                <span className="font-bold text-xl text-orange-600">{moeda(p.total)}</span>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          {pag && (
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Pagamento</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{FORMAS_PAG_LABEL[pag.forma] || pag.forma}</p>
                  <p className="text-xs text-gray-400">{pag.momento === 'pedido' ? 'Pago no pedido' : 'A pagar na entrega'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{moeda(pag.valor)}</p>
                  {pag.status === 'pago'
                    ? <span className="text-xs text-green-600 font-bold">✓ Pago</span>
                    : <span className="text-xs text-amber-600 font-semibold">⏳ Pendente</span>}
                </div>
              </div>
              {pag.status !== 'pago' && ['pronto_entrega','entregue'].includes(p.status) && (
                <button
                  onClick={() => marcarPago.mutate({ pagId: pag.id, pedId: p.id, valor: pag.valor })}
                  disabled={marcarPago.isPending}
                  className="mt-3 w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white rounded-lg py-2 text-xs font-bold transition"
                >
                  {marcarPago.isPending ? 'Registrando...' : '💰 Marcar como Pago'}
                </button>
              )}
            </div>
          )}

          {p.obs && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-amber-800">{p.obs}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 shrink-0 space-y-2">
          {prox && naoEntregue && (
            <button
              onClick={() => avancar.mutate({ id: p.id, status_atual: p.status, proximo: prox })}
              disabled={avancar.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <ChevronRight size={16} /> Avançar para {STATUS_LABELS[prox]}
            </button>
          )}
          <div className="flex gap-2">
            {p.status !== 'cancelado' && p.status !== 'entregue' && (
              <button onClick={onEditar} className="flex-1 border border-gray-300 rounded-lg py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                <Edit2 size={12} /> Editar
              </button>
            )}
            {p.status !== 'cancelado' && p.status !== 'entregue' && (
              <button
                onClick={() => { if (confirm('Cancelar este pedido?')) { cancelar.mutate(p.id); onClose() } }}
                className="flex-1 border border-red-200 text-red-500 rounded-lg py-2 text-xs font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5"
              >
                <AlertTriangle size={12} /> Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo oculto para react-to-print */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef}>
          <PrintContent p={p} empresa={empresa} />
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// BOTÕES DE AÇÃO INLINE NA TABELA (com pedido da listagem)
// Recebe pedidoId, busca o pedido completo sob demanda
// ────────────────────────────────────────────────────────────
function BotoesAcaoLinha({ pedidoId, onVisualizar }: { pedidoId: string; onVisualizar: () => void }) {
  const { empresa, formatoImpressao } = useAppStore()
  // Só busca quando o usuário interage — lazy via usePedido com enabled flag
  const [ativo, setAtivo] = useState(false)
  const { data: p } = usePedido(ativo ? pedidoId : null)



  // Quando p estiver disponível e ativo, executar a ação pendente
  const acaoPendente = useRef<'pdf' | 'imprimir' | 'whatsapp' | null>(null)
  const executouRef = useRef(false)

  const clickAcao = useCallback(async (e: React.MouseEvent, tipo: 'pdf' | 'imprimir' | 'whatsapp') => {
    e.stopPropagation()
    if (!p) {
      acaoPendente.current = tipo
      executouRef.current = false
      setAtivo(true)
      return
    }
    // já temos p, executar direto
    if (tipo === 'pdf') {
      try { await gerarPDFA4(p, empresa); toast.success(`PDF gerado: Pedido-${p.numero}.pdf`) }
      catch { toast.error('Erro ao gerar PDF') }
    } else if (tipo === 'imprimir') {
      if (formatoImpressao === 'termica') imprimirTermica(p, empresa)
      else imprimirA4(p, empresa)
    } else {
      abrirWhatsApp(p.cliente?.whats, gerarMensagemWhatsApp(p, empresa))
    }
  }, [p, empresa, formatoImpressao])

  // Quando p carregar pela primeira vez após setAtivo, executar ação pendente
  useMemo(() => {
    if (!p || !acaoPendente.current || executouRef.current) return
    executouRef.current = true
    const tipo = acaoPendente.current
    acaoPendente.current = null
    if (tipo === 'pdf') {
      gerarPDFA4(p, empresa).then(() => toast.success(`PDF gerado: Pedido-${p.numero}.pdf`)).catch(() => toast.error('Erro ao gerar PDF'))
    } else if (tipo === 'imprimir') {
      if (formatoImpressao === 'termica') imprimirTermica(p, empresa)
      else imprimirA4(p, empresa)
    } else {
      abrirWhatsApp(p.cliente?.whats, gerarMensagemWhatsApp(p, empresa))
    }
  }, [p, empresa, formatoImpressao])

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button onClick={onVisualizar} title="Visualizar" className="p-1.5 text-gray-400 hover:text-orange-500 transition rounded hover:bg-orange-50">
        <Eye size={14} />
      </button>
      <button onClick={e => clickAcao(e, 'pdf')} title="Gerar PDF" className="p-1.5 text-gray-400 hover:text-orange-600 transition rounded hover:bg-orange-50">
        <FileDown size={14} />
      </button>
      <button onClick={e => clickAcao(e, 'imprimir')} title="Imprimir" className="p-1.5 text-gray-400 hover:text-gray-700 transition rounded hover:bg-gray-100">
        <Printer size={14} />
      </button>
      <button onClick={e => clickAcao(e, 'whatsapp')} title="WhatsApp" className="p-1.5 text-gray-400 hover:text-green-600 transition rounded hover:bg-green-50">
        <MessageCircle size={14} />
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// MODAL NOVO / EDITAR PEDIDO
// ────────────────────────────────────────────────────────────
function ModalPedido({ pedidoId, onClose }: { pedidoId?: string; onClose: () => void }) {
  const { data: pedidoExistente } = usePedido(pedidoId ?? null)
  const { data: clientes = [] } = useClientes()
  const { data: produtos = [] } = useProdutos()
  const { data: vendedores = [] } = useVendedores()
  const { data: entregadores = [] } = useEntregadores()
  const criar = useCriarPedido()
  const editar = useEditarPedido()
  const isEdit = !!pedidoId

  // ── Estado do formulário — inicializa vazio; useEffect popula quando pedidoExistente chega
  const [cliId, setCliId]           = useState('')
  const [vendId, setVendId]         = useState('')
  const [entId, setEntId]           = useState('')
  const [dataEnt, setDataEnt]       = useState('')
  const [horaEnt, setHoraEnt]       = useState('')
  const [obs, setObs]               = useState('')
  const [desconto, setDesconto]     = useState('')
  const [taxaEnt, setTaxaEnt]       = useState('')
  const [momentoPag, setMomentoPag] = useState<MomentoPag>('entrega')
  const [pagForma, setPagForma]     = useState<FormaPag>('pix')
  const [busca, setBusca]           = useState('')
  const [itens, setItens]           = useState<LinhaItem[]>([itemVazio()])
  // Flag para não repopular após a primeira carga do pedido existente
  const populadoRef = useRef(false)

  useEffect(() => {
    if (!pedidoExistente || populadoRef.current) return
    populadoRef.current = true
    setCliId(pedidoExistente.cli_id ?? '')
    setVendId(pedidoExistente.vend_id ?? '')
    setEntId(pedidoExistente.ent_id ?? '')
    setDataEnt(pedidoExistente.data_ent ?? '')
    setHoraEnt(pedidoExistente.hora_ent ?? '')
    setObs(pedidoExistente.obs ?? '')
    setDesconto(String(pedidoExistente.desconto ?? 0))
    setTaxaEnt(String(pedidoExistente.taxa_entrega ?? 0))
    setMomentoPag(pedidoExistente.momento_pag ?? 'entrega')
    // Inicializar forma de pagamento a partir do pagamento existente
    const formaExistente = pedidoExistente.pagamentos?.[0]?.forma
    if (formaExistente) setPagForma(formaExistente)
    if (pedidoExistente.itens?.length) {
      setItens(pedidoExistente.itens.map(i => ({
        prod_id: i.prod_id, nome: i.produto?.nome ?? '', qtd: i.qtd,
        unit: i.unit, desconto_item: i.desconto_item, tot: i.tot,
      })))
    }
  }, [pedidoExistente])

  const subtotal  = itens.reduce((a, i) => a + i.tot, 0)
  const total     = Math.max(0, subtotal - (parseFloat(desconto) || 0) + (parseFloat(taxaEnt) || 0))
  // Se pagamento já foi confirmado (pago), bloquear mudança de momento
  const pagPago   = pedidoExistente?.pagamentos?.[0]?.status === 'pago'

  const produtosFiltrados = useMemo(() => {
    if (!busca) return []
    const q = busca.toLowerCase()
    return produtos.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 8)
  }, [busca, produtos])

  function addProduto(prod: typeof produtos[0]) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.prod_id === prod.id)
      if (idx >= 0) {
        const n = [...prev]
        n[idx].qtd += 1
        n[idx].tot = Math.max(0, n[idx].qtd * n[idx].unit - n[idx].desconto_item)
        return n
      }
      return [...prev.filter(i => i.prod_id !== ''), { prod_id: prod.id, nome: prod.nome, qtd: 1, unit: prod.preco, desconto_item: 0, tot: prod.preco }]
    })
    setBusca('')
  }

  function updateItem(idx: number, field: keyof LinhaItem, val: number | string) {
    setItens(prev => {
      const n = [...prev]
      ;(n[idx] as Record<string, unknown>)[field] = val
      n[idx].tot = Math.max(0, n[idx].qtd * n[idx].unit - n[idx].desconto_item)
      return n
    })
  }

  function removeItem(idx: number) { setItens(prev => prev.filter((_, i) => i !== idx)) }

  async function handleSalvar() {
    if (!cliId) return toast.error('Selecione um cliente.')
    const itensFiltrados = itens.filter(i => i.prod_id)
    if (!itensFiltrados.length) return toast.error('Adicione pelo menos um produto.')
    const form: PedidoFormData = {
      cli_id: cliId, vend_id: vendId || undefined, ent_id: entId || undefined,
      data_ent: dataEnt || undefined, hora_ent: horaEnt || undefined,
      desconto: parseFloat(desconto) || 0, taxa_entrega: parseFloat(taxaEnt) || 0,
      obs: obs || undefined, momento_pag: momentoPag, pag_forma: pagForma, itens: itensFiltrados,
    }
    if (isEdit && pedidoId) await editar.mutateAsync({ id: pedidoId, form })
    else await criar.mutateAsync(form)
    onClose()
  }

  const loading = criar.isPending || editar.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[96vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base">{isEdit ? 'Editar Pedido' : 'Novo Pedido'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Cliente *</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" value={cliId} onChange={e => setCliId(e.target.value)}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}{c.tel ? ` — ${c.tel}` : ''}</option>)}
            </select>
          </div>
          {/* Busca produto */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Adicionar Produto</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
              {produtosFiltrados.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {produtosFiltrados.map(prod => (
                    <button key={prod.id} onClick={() => addProduto(prod)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 flex items-center justify-between">
                      <span>{prod.nome}</span>
                      <span className="text-orange-600 font-bold text-xs">{moeda(prod.preco)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Itens */}
          {itens.filter(i => i.prod_id).length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Produto</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">Qtd</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-24">Unit</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-20">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.filter(i => i.prod_id).map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{item.nome}</td>
                      <td className="px-2 py-2">
                        <input type="number" min={0.001} step={0.001} className="w-full text-center border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:border-orange-400" value={item.qtd} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateItem(idx, 'qtd', v) }} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min={0} step={0.01} className="w-full text-right border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:border-orange-400" value={item.unit} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateItem(idx, 'unit', v) }} />
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-green-600">{moeda(item.tot)}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Totais */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold">{moeda(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Desconto (R$)</span>
              <input type="number" min={0} step={0.01} value={desconto} className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-400" onChange={e => setDesconto(e.target.value)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Taxa Entrega (R$)</span>
              <input type="number" min={0} step={0.01} value={taxaEnt} className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-400" onChange={e => setTaxaEnt(e.target.value)} />
            </div>
            <div className="flex items-center justify-between font-bold text-base border-t border-gray-200 pt-2"><span>Total</span><span className="text-orange-600">{moeda(total)}</span></div>
          </div>
          {/* Entrega / pag */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Data Entrega</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={dataEnt} onChange={e => setDataEnt(e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Hora Entrega</label><input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={horaEnt} onChange={e => setHoraEnt(e.target.value)} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Vendedor</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={vendId} onChange={e => setVendId(e.target.value)}><option value="">Nenhum</option>{vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Entregador</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={entId} onChange={e => setEntId(e.target.value)}><option value="">Nenhum</option>{entregadores.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Momento de pagamento — bloqueado se já foi pago */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Pagamento {pagPago && isEdit && <span className="text-green-600 font-normal normal-case ml-1">✓ pago</span>}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                value={momentoPag}
                onChange={e => setMomentoPag(e.target.value as MomentoPag)}
                disabled={pagPago && isEdit}
              >
                <option value="entrega">Na Entrega</option>
                <option value="pedido">No Pedido</option>
              </select>
              {pagPago && isEdit && <p className="text-[10px] text-gray-400 mt-0.5">Não é possível alterar o momento após o pagamento ser confirmado.</p>}
            </div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Forma</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={pagForma} onChange={e => setPagForma(e.target.value as FormaPag)}>{FORMAS_PAG.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Observações</label><textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações opcionais..." /></div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={handleSalvar} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition">
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ────────────────────────────────────────────────────────────
export default function PedidosPage() {
  const [busca, setBusca]               = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | ''>('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [modalAberto, setModalAberto]   = useState(false)
  const [pedidoEditId, setPedidoEditId] = useState<string | undefined>()
  const [pedidoVerId, setPedidoVerId]   = useState<string | undefined>()

  const usuarioAtual = useAppStore(s => s.usuario)
  // Vendedor vê apenas os próprios pedidos; admin vê todos.
  const filtroVend = usuarioAtual?.perfil === 'vendedor' ? (usuarioAtual.vend_id ?? '__none__') : undefined
  const { data: pedidos = [], isLoading } = usePedidos({
    ...(filtroStatus ? { status: filtroStatus } : {}),
    ...(filtroVend ? { vend_id: filtroVend } : {}),
  })
  usePedidosRealtime()

  const hoje  = new Date().toISOString().slice(0, 10)
  const semIni = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10) })()

  const filtrados = useMemo(() => pedidos.filter(p => {
    if (busca) {
      const q = busca.toLowerCase()
      if (!(p.numero?.toLowerCase().includes(q) || p.cliente?.nome?.toLowerCase().includes(q))) return false
    }
    const dc = (p.data_pedido || '').slice(0, 10)
    const de = (p.data_ent || '').slice(0, 10)
    if (filtroPeriodo === 'hoje')     return dc === hoje
    if (filtroPeriodo === 'semana')   return dc >= semIni && dc <= hoje
    if (filtroPeriodo === 'mes')      return dc.slice(0, 7) === hoje.slice(0, 7)
    if (filtroPeriodo === 'ent_hoje') return de === hoje
    if (filtroPeriodo === 'atrasado') return !!(de && de < hoje && NAO_ENTREGUE_SET.has(p.status))
    if (filtroPeriodo === 'agendado') return !!(de && de > hoje && NAO_ENTREGUE_SET.has(p.status))
    return true
  }), [pedidos, busca, filtroPeriodo, hoje, semIni])

  function abrirNovo()          { setPedidoEditId(undefined); setModalAberto(true) }
  function abrirEditar(id: string) { setPedidoVerId(undefined); setPedidoEditId(id); setModalAberto(true) }
  function fecharModal()        { setModalAberto(false); setPedidoEditId(undefined) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Pedidos</h1>
        <button onClick={abrirNovo} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="Buscar por cliente ou número..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400 bg-white" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusPedido | '')}>
          {FILTROS_STATUS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400 bg-white" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
          {FILTROS_PERIODO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nº</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Criado</th>
                <th className="text-left px-4 py-3">Entrega</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Pag.</th>
                <th className="text-right px-4 py-3 w-40">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gray-400 text-sm">Nenhum pedido encontrado</p>
                      <button onClick={abrirNovo} className="text-orange-500 text-xs font-semibold hover:underline">+ Criar primeiro pedido</button>
                    </div>
                  </td>
                </tr>
              ) : filtrados.map(p => {
                const atrasado = p.data_ent && p.data_ent < hoje && NAO_ENTREGUE_SET.has(p.status)
                const cores = STATUS_CORES[p.status]
                const pag = p.pagamentos?.[0]
                return (
                  <tr
                    key={p.id}
                    className={cn('border-t border-gray-100 hover:bg-gray-50 cursor-pointer', atrasado && 'bg-red-50')}
                    onClick={() => setPedidoVerId(p.id)}
                  >
                    <td className="px-4 py-3 font-bold text-orange-600">
                      {atrasado && <span className="mr-1 text-red-500">⚠</span>}
                      {p.numero}
                    </td>
                    <td className="px-4 py-3 font-medium">{p.cliente?.nome || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{dataBR(p.data_pedido)}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.data_ent ? dataBR(p.data_ent) : '—'}
                      {p.hora_ent && <span className="ml-1 text-gray-400">{p.hora_ent}</span>}
                    </td>
                    <td className="px-4 py-3 font-bold">{moeda(p.total)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', cores.bg, cores.text)}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {pag?.status === 'pago'
                        ? <span className="text-green-600 text-xs font-semibold">✓ Pago</span>
                        : <span className="text-amber-500 text-xs">⏳ Pendente</span>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end">
                        <BotoesAcaoLinha pedidoId={p.id} onVisualizar={() => setPedidoVerId(p.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''}
            {filtroPeriodo && ` — ${FILTROS_PERIODO.find(f => f.value === filtroPeriodo)?.label}`}
          </div>
        )}
      </div>

      {/* Modal novo/editar */}
      {modalAberto && <ModalPedido pedidoId={pedidoEditId} onClose={fecharModal} />}

      {/* Modal visualizar */}
      {pedidoVerId && !modalAberto && (
        <ModalVisualizarPedido
          pedidoId={pedidoVerId}
          onClose={() => setPedidoVerId(undefined)}
          onEditar={() => abrirEditar(pedidoVerId)}
        />
      )}
    </div>
  )
}
