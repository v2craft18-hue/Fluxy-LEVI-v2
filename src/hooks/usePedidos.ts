// FLUXY — Hooks de Pedidos + Entidades Multi-Tenant
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient, queries } from '@/lib/supabase'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Pedido, PedidoFormData, StatusPedido, Cliente, Produto, Vendedor, Entregador } from '@/types'
import { useAppStore } from '@/store'

const supabase = createClient()

// ──────────────────────────────────────────────
// PEDIDOS
// ──────────────────────────────────────────────
export function usePedidos(filtros?: {
  status?: StatusPedido; data_inicio?: string; data_fim?: string
  cli_id?: string; vend_id?: string; ent_id?: string
}) {
  return useQuery({
    queryKey: ['pedidos', filtros],
    queryFn: async () => {
      let q = supabase.from('pedidos').select(queries.pedidoLista).order('criado_em', { ascending: false })
      if (filtros?.status)      q = q.eq('status', filtros.status)
      if (filtros?.cli_id)      q = q.eq('cli_id', filtros.cli_id)
      if (filtros?.vend_id)     q = q.eq('vend_id', filtros.vend_id)
      if (filtros?.ent_id)      q = q.eq('ent_id', filtros.ent_id)
      if (filtros?.data_inicio) q = q.gte('data_pedido', filtros.data_inicio)
      if (filtros?.data_fim)    q = q.lte('data_pedido', filtros.data_fim)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as Pedido[]
    },
  })
}

export function usePedido(id: string | null) {
  return useQuery({
    queryKey: ['pedido', id], enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos').select(queries.pedidoCompleto).eq('id', id!).single()
      if (error) throw error
      return data as unknown as Pedido
    },
  })
}

export function useCriarPedido() {
  const qc = useQueryClient()
  const { usuario, empresaId } = useAppStore()
  return useMutation({
    mutationFn: async (form: PedidoFormData) => {
      if (!empresaId) throw new Error('Empresa não identificada.')
      const subtotal = form.itens.reduce((a, i) => a + i.tot, 0)
      const total = Math.max(0, subtotal - form.desconto + form.taxa_entrega)
      const { data: ped, error } = await supabase.from('pedidos').insert({
        empresa_id: empresaId, cli_id: form.cli_id, vend_id: form.vend_id || null,
        ent_id: form.ent_id || null, data_ent: form.data_ent || null,
        hora_ent: form.hora_ent || null, origem: form.origem || 'balcao',
        subtotal, desconto: form.desconto, taxa_entrega: form.taxa_entrega,
        total, momento_pag: form.momento_pag, obs: form.obs || null,
      }).select().single()
      if (error) throw error
      const { error: errItens } = await supabase.from('pedido_itens').insert(
        form.itens.map(i => ({ ped_id: ped.id, prod_id: i.prod_id, qtd: i.qtd, unit: i.unit, desconto_item: i.desconto_item, tot: i.tot }))
      )
      if (errItens) throw errItens
      const pago = form.momento_pag === 'pedido'
      await supabase.from('pagamentos').insert({
        ped_id: ped.id, empresa_id: empresaId, forma: form.pag_forma,
        valor: form.pag_valor || total, momento: form.momento_pag,
        status: pago ? 'pago' : 'pendente',
        data_pag: pago ? new Date().toISOString() : null,
        uid_confirmacao: pago ? usuario?.id : null,
      })
      if (pago) {
        const { data: ult } = await supabase.from('caixa').select('saldo').eq('empresa_id', empresaId).order('dt', { ascending: false }).limit(1).single()
        const sal = (ult?.saldo || 0) + (form.pag_valor || total)
        await supabase.from('caixa').insert({ empresa_id: empresaId, tipo: 'recebimento', valor: form.pag_valor || total, saldo_ant: ult?.saldo || 0, saldo: sal, obs: `Pgto ${ped.numero}`, uid: usuario?.id })
      }
      await supabase.from('logs').insert({ empresa_id: empresaId, uid: usuario?.id, acao: 'criar', modulo: 'pedidos', rid: ped.id, det: `Criado: ${ped.numero}` })
      return ped
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Pedido criado!') },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  })
}

export function useEditarPedido() {
  const qc = useQueryClient()
  const { usuario, empresaId } = useAppStore()
  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: PedidoFormData }) => {
      // ── 1. Calcular novos totais ──────────────────────────────
      const subtotal = form.itens.reduce((a, i) => a + i.tot, 0)
      const total    = Math.max(0, subtotal - form.desconto + form.taxa_entrega)

      // ── 2. Buscar pagamento atual antes de qualquer alteração ─
      const { data: pagAtual, error: errPag } = await supabase
        .from('pagamentos')
        .select('id, valor, forma, momento, status')
        .eq('ped_id', id)
        .single()
      if (errPag) throw new Error('Pagamento não encontrado: ' + errPag.message)

      const estaPago      = pagAtual.status === 'pago'
      const valorAnterior = pagAtual.valor as number
      const agora         = new Date().toISOString()

      // ── 3. Atualizar pedido ───────────────────────────────────
      const { error: errPed } = await supabase.from('pedidos').update({
        cli_id: form.cli_id, vend_id: form.vend_id || null, ent_id: form.ent_id || null,
        data_ent: form.data_ent || null, hora_ent: form.hora_ent || null,
        origem: form.origem || 'balcao', subtotal, desconto: form.desconto,
        taxa_entrega: form.taxa_entrega, total, momento_pag: form.momento_pag, obs: form.obs || null,
      }).eq('id', id)
      if (errPed) throw errPed

      // ── 4. Recriar itens ──────────────────────────────────────
      const { error: errDel } = await supabase.from('pedido_itens').delete().eq('ped_id', id)
      if (errDel) throw errDel
      const { error: errIns } = await supabase.from('pedido_itens').insert(
        form.itens.map(i => ({ ped_id: id, prod_id: i.prod_id, qtd: i.qtd, unit: i.unit, desconto_item: i.desconto_item, tot: i.tot }))
      )
      if (errIns) throw errIns

      // ── 5. Sincronizar pagamento ──────────────────────────────
      if (!estaPago) {
        // PAGAMENTO PENDENTE — pode atualizar tudo livremente
        const novoPago = form.momento_pag === 'pedido'

        const { error: errUpPag } = await supabase.from('pagamentos').update({
          valor:   total,
          forma:   form.pag_forma,
          momento: form.momento_pag,
          // Se o momento mudou para 'pedido', marcar como pago agora
          ...(novoPago ? {
            status:           'pago',
            data_pag:         agora,
            uid_confirmacao:  usuario?.id ?? null,
          } : {
            status:           'pendente',
            data_pag:         null,
            uid_confirmacao:  null,
          }),
        }).eq('id', pagAtual.id)
        if (errUpPag) throw errUpPag

        // Se acabou de se tornar pago, lançar no caixa
        if (novoPago) {
          const { data: ult } = await supabase
            .from('caixa').select('saldo')
            .eq('empresa_id', empresaId!).order('dt', { ascending: false }).limit(1).single()
          const saldoAnt = ult?.saldo ?? 0
          const { error: errCaixa } = await supabase.from('caixa').insert({
            empresa_id: empresaId,
            tipo:       'recebimento',
            valor:      total,
            saldo_ant:  saldoAnt,
            saldo:      saldoAnt + total,
            obs:        `Pgto (edição) ped ${id.slice(0, 8)}`,
            uid:        usuario?.id,
          })
          if (errCaixa) throw errCaixa
        }
      } else {
        // PAGAMENTO JÁ PAGO — atualizar valor e forma; momento permanece 'pedido'
        const { error: errUpPag } = await supabase.from('pagamentos').update({
          valor: total,
          forma: form.pag_forma,
          // momento não muda (já pago = sempre 'pedido')
        }).eq('id', pagAtual.id)
        if (errUpPag) throw errUpPag

        // Se o valor mudou, lançar ajuste no caixa
        const diff = total - valorAnterior
        if (Math.abs(diff) >= 0.01) {
          const { data: ult } = await supabase
            .from('caixa').select('saldo')
            .eq('empresa_id', empresaId!).order('dt', { ascending: false }).limit(1).single()
          const saldoAnt = ult?.saldo ?? 0
          // diff > 0 = valor aumentou → suprimento; diff < 0 = valor reduziu → sangria
          const tipo: 'suprimento' | 'sangria' = diff > 0 ? 'suprimento' : 'sangria'
          const { error: errCaixa } = await supabase.from('caixa').insert({
            empresa_id: empresaId,
            tipo,
            valor:      Math.abs(diff),
            saldo_ant:  saldoAnt,
            saldo:      saldoAnt + diff,
            obs:        `Ajuste valor (edição) ped ${id.slice(0, 8)}`,
            uid:        usuario?.id,
          })
          if (errCaixa) throw errCaixa
        }
      }

      // ── 6. Log ───────────────────────────────────────────────
      await supabase.from('logs').insert({
        empresa_id: empresaId,
        uid:        usuario?.id,
        acao:       'editar',
        modulo:     'pedidos',
        rid:        id,
        det:        `Editado | total: R$ ${total.toFixed(2)} | forma: ${form.pag_forma} | momento: ${form.momento_pag}`,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['financeiro-resumo'] })
      qc.invalidateQueries({ queryKey: ['caixa'] })
      toast.success('Pedido atualizado!')
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  })
}

export function useCancelarPedido() {
  const qc = useQueryClient()
  const { usuario, empresaId } = useAppStore()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', id)
      if (error) throw error
      await supabase.from('logs').insert({ empresa_id: empresaId, uid: usuario?.id, acao: 'cancelar', modulo: 'pedidos', rid: id })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); toast.success('Pedido cancelado.') },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  })
}

export function useAvancarStatus() {
  const qc = useQueryClient()
  const { usuario, empresaId } = useAppStore()
  return useMutation({
    mutationFn: async ({ id, status_atual, proximo }: { id: string; status_atual: StatusPedido; proximo: StatusPedido }) => {
      const { error } = await supabase.from('pedidos').update({ status: proximo }).eq('id', id)
      if (error) throw error
      await supabase.from('logs').insert({ empresa_id: empresaId, uid: usuario?.id, acao: 'editar', modulo: 'kanban', rid: id, det: `${status_atual} → ${proximo}` })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); qc.invalidateQueries({ queryKey: ['kanban'] }) },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  })
}

export function useMarcarPago() {
  const qc = useQueryClient()
  const { usuario, empresaId } = useAppStore()
  return useMutation({
    mutationFn: async ({ pagId, pedId, valor }: { pagId: string; pedId: string; valor: number }) => {
      const { data: ped } = await supabase.from('pedidos').select('status, numero').eq('id', pedId).single()
      if (!ped || !['pronto_entrega','entregue'].includes(ped.status))
        throw new Error(`Bloqueado: pedido em "${ped?.status}". Finalize a produção primeiro.`)
      const agora = new Date().toISOString()
      await supabase.from('pagamentos').update({ status: 'pago', data_pag: agora, uid_confirmacao: usuario?.id }).eq('id', pagId)
      await supabase.from('pedidos').update({ momento_pag: 'pedido' }).eq('id', pedId)
      const { data: ult } = await supabase.from('caixa').select('saldo').eq('empresa_id', empresaId!).order('dt', { ascending: false }).limit(1).single()
      const sal = (ult?.saldo || 0) + valor
      await supabase.from('caixa').insert({ empresa_id: empresaId, tipo: 'recebimento', valor, saldo_ant: ult?.saldo || 0, saldo: sal, obs: `Pgto — ${ped.numero}`, uid: usuario?.id })
      await supabase.from('logs').insert({ empresa_id: empresaId, uid: usuario?.id, acao: 'editar', modulo: 'pagamentos', rid: pagId, det: `Pago | ${ped.numero} | R$ ${valor}` })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); qc.invalidateQueries({ queryKey: ['financeiro'] }); toast.success('Pagamento registrado!') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function usePedidosRealtime() {
  const qc = useQueryClient()
  const empresaId = useAppStore(s => s.empresaId)
  useEffect(() => {
    if (!empresaId) return
    const ch = supabase.channel(`pedidos-${empresaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `empresa_id=eq.${empresaId}` }, () => {
        qc.invalidateQueries({ queryKey: ['pedidos'] })
        qc.invalidateQueries({ queryKey: ['kanban'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, empresaId])
}

// ──────────────────────────────────────────────
// CLIENTES
// ──────────────────────────────────────────────
export function useClientes(filtros?: { vend_id?: string }) {
  return useQuery({
    queryKey: ['clientes', filtros],
    queryFn: async () => {
      let q = supabase.from('clientes').select('*').eq('ativo', true).order('nome')
      if (filtros?.vend_id) q = q.eq('vend_id', filtros.vend_id)
      const { data, error } = await q
      if (error) throw error
      return data as Cliente[]
    },
  })
}

export function useSalvarCliente() {
  const qc = useQueryClient()
  const { empresaId, usuario } = useAppStore()
  return useMutation({
    mutationFn: async (form: Partial<Cliente> & { id?: string }) => {
      if (form.id) {
        const { id, ...rest } = form
        const { error } = await supabase.from('clientes').update(rest).eq('id', id!)
        if (error) throw error
      } else {
        // Se quem cria é vendedor, vincula o cliente a ele (clientes.vend_id = usuarios.id)
        const vend_id = usuario?.perfil === 'vendedor' ? usuario.id : (form.vend_id ?? null)
        const { error } = await supabase.from('clientes').insert({ ...form, vend_id, empresa_id: empresaId, ativo: true })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Cliente salvo!') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useExcluirCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); toast.success('Cliente removido.') },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ──────────────────────────────────────────────
// PRODUTOS
// ──────────────────────────────────────────────
export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('*, categoria:categorias(nome)').eq('ativo', true).order('nome')
      if (error) throw error
      return data as unknown as Produto[]
    },
  })
}

export function useSalvarProduto() {
  const qc = useQueryClient()
  const { empresaId } = useAppStore()
  return useMutation({
    mutationFn: async (form: Partial<Produto> & { id?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, categoria: _cat, ...rest } = { ...form } as Partial<Produto> & { id?: string; categoria?: unknown }
      if (id) {
        const { error } = await supabase.from('produtos').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('produtos').insert({ ...rest, empresa_id: empresaId, ativo: true })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos'] }); toast.success('Produto salvo!') },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ──────────────────────────────────────────────
// VENDEDORES
// ──────────────────────────────────────────────
export function useVendedores() {
  return useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendedores').select('*').eq('ativo', true).order('nome')
      if (error) throw error
      return data as Vendedor[]
    },
  })
}

export function useSalvarVendedor() {
  const qc = useQueryClient()
  const { empresaId } = useAppStore()
  return useMutation({
    mutationFn: async (form: Partial<Vendedor> & { id?: string }) => {
      if (form.id) {
        const { id, ...rest } = form
        const { error } = await supabase.from('vendedores').update(rest).eq('id', id!)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vendedores').insert({ ...form, empresa_id: empresaId, ativo: true })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendedores'] }); toast.success('Vendedor salvo!') },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ──────────────────────────────────────────────
// ENTREGADORES
// ──────────────────────────────────────────────
export function useEntregadores() {
  return useQuery({
    queryKey: ['entregadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('entregadores').select('*').eq('ativo', true).order('nome')
      if (error) throw error
      return data as Entregador[]
    },
  })
}

export function useSalvarEntregador() {
  const qc = useQueryClient()
  const { empresaId } = useAppStore()
  return useMutation({
    mutationFn: async (form: Partial<Entregador> & { id?: string }) => {
      if (form.id) {
        const { id, ...rest } = form
        const { error } = await supabase.from('entregadores').update(rest).eq('id', id!)
        if (error) throw error
      } else {
        const { error } = await supabase.from('entregadores').insert({ ...form, empresa_id: empresaId, ativo: true })
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entregadores'] }); toast.success('Entregador salvo!') },
    onError: (e: Error) => toast.error(e.message),
  })
}
