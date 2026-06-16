// ================================================================
// FLUXY — Types TypeScript
// ================================================================

export type Perfil = 'admin' | 'vendedor' | 'entregador'
export type StatusPedido = 'recebido' | 'em_producao' | 'pronto_embalagem' | 'embalado' | 'pronto_entrega' | 'entregue' | 'cancelado'
export type MomentoPag = 'pedido' | 'entrega'
export type StatusPag = 'pendente' | 'pago'
export type TipoCaixa = 'abertura' | 'fechamento' | 'sangria' | 'suprimento' | 'recebimento' | 'pagamento'
export type TipoComissao = 'pct' | 'fixo'
export type TipoMeta = 'diaria' | 'semanal' | 'mensal'
export type CatMeta = 'geral' | 'vendedor' | 'entregador'
export type FormaPag = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'boleto'
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
export type DispDias = Record<DiaSemana, boolean>

export interface Empresa {
  id: string
  nome: string
  razao?: string
  cnpj?: string
  tel?: string
  whats?: string
  email?: string
  cep?: string
  rua?: string
  num?: string
  comp?: string
  bairro?: string
  cidade?: string
  estado?: string
  cor: string
  logo?: string
  criado_em: string
  atualizado_em: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  tel?: string
  whatsapp?: string
  avatar_url?: string
  ultimo_acesso?: string
  vend_id?: string
  ent_id?: string
  empresa_id?: string
  criado_em: string
  atualizado_em?: string
}

export interface Cliente {
  id: string
  nome: string
  cpf?: string
  rg?: string
  cnpj?: string
  ie?: string
  email?: string
  tel?: string
  whats?: string
  cep?: string
  rua?: string
  num?: string
  comp?: string
  bairro?: string
  cidade?: string
  estado?: string
  obs?: string
  ativo: boolean
  lgpd_ok: boolean
  criado_em: string
  vend_id?: string
}

export interface Vendedor {
  id: string
  nome: string
  tel?: string
  whats?: string
  com_tipo: TipoComissao
  com_pct: number
  com_fixo: number
  ativo: boolean
  login?: string
  user_id?: string
  disp_dias: DispDias
  criado_em: string
}

export interface Entregador {
  id: string
  nome: string
  tel?: string
  whats?: string
  veiculo?: string
  placa?: string
  ativo: boolean
  login?: string
  user_id?: string
  disp_dias: DispDias
  criado_em: string
}

export interface Categoria {
  id: string
  nome: string
  criado_em: string
}

export interface Produto {
  id: string
  nome: string
  cat_id?: string
  preco: number
  custo: number
  est: number
  min: number
  descricao?: string
  ativo: boolean
  tem_receita: boolean
  criado_em: string
  categoria?: Categoria
}

export interface Ingrediente {
  id: string
  nome: string
  un: string
  custo: number
  est: number
  min: number
  criado_em: string
}

export interface Receita {
  id: string
  prod_id: string
  ing_id: string
  qtd: number
  ingrediente?: Ingrediente
}

export interface Pedido {
  id: string
  numero: string
  cli_id?: string
  vend_id?: string
  ent_id?: string
  data_pedido: string
  empresa_id?: string
  data_ent?: string
  hora_ent?: string
  origem?: string
  status: StatusPedido
  subtotal: number
  desconto: number
  taxa_entrega: number
  total: number
  momento_pag: MomentoPag
  obs?: string
  bloqueado: boolean
  kanban_arq: boolean
  ent_oculto: boolean
  dt_entrega_conf?: string
  criado_em: string
  atualizado_em: string
  cliente?: Cliente
  vendedor?: Vendedor
  entregador?: Entregador
  itens?: PedidoItem[]
  pagamentos?: Pagamento[]
}

export interface PedidoItem {
  id: string
  ped_id: string
  prod_id: string
  qtd: number
  unit: number
  desconto_item: number
  tot: number
  produto?: Produto
}

export interface Pagamento {
  id: string
  ped_id: string
  forma: FormaPag
  valor: number
  status: StatusPag
  momento: MomentoPag
  data_pag?: string
  uid_confirmacao?: string
  criado_em: string
}

export interface MovEstoque {
  id: string
  prod_id?: string
  ing_id?: string
  tipo: string
  qtd: number
  ant?: number
  obs?: string
  uid?: string
  dt: string
}

export interface Despesa {
  id: string
  descricao: string
  cat?: string
  valor: number
  data_despesa: string
  venc?: string
  pago: boolean
  uid?: string
  criado_em: string
}

export interface Caixa {
  id: string
  tipo: TipoCaixa
  valor: number
  saldo_ant: number
  saldo: number
  obs?: string
  uid?: string
  dt: string
  numero?: string
  confirmada: boolean
}

export interface Meta {
  id: string
  tipo: TipoMeta
  categoria: CatMeta
  meta: number
  atingido: number
  periodo: string
  ref_id?: string
  ref_nome?: string
  unidade: string
  criado_em: string
}

export interface Comissao {
  id: string
  vend_id: string
  ped_id: string
  valor: number
  pct?: number
  status: string
  data_pag?: string
  criado_em: string
  vendedor?: Vendedor
  pedido?: Pedido
}

export interface Notificacao {
  id: string
  user_id?: string
  tipo: string
  titulo: string
  msg?: string
  lida: boolean
  dt: string
}

export interface Log {
  id: string
  uid?: string
  acao: string
  modulo: string
  rid?: string
  det?: string
  dt: string
  usuario?: Usuario
}

export interface Rota {
  id: string
  nome: string
  dia?: DiaSemana
  ativo: boolean
  criado_em: string
  clientes?: Cliente[]
}

export interface Horario {
  id: string
  dia: DiaSemana
  hora: string
  ativo: boolean
}

export type PedidoFormData = {
  cli_id: string
  vend_id?: string
  ent_id?: string
  data_ent?: string
  hora_ent?: string
  origem?: string
  desconto: number
  taxa_entrega: number
  obs?: string
  momento_pag: MomentoPag
  pag_forma: FormaPag
  pag_valor?: number
  itens: {
    prod_id: string
    qtd: number
    unit: number
    desconto_item: number
    tot: number
  }[]
}

export type Tables = {
  empresas: Empresa
  usuarios: Usuario
  clientes: Cliente
  vendedores: Vendedor
  entregadores: Entregador
  categorias: Categoria
  produtos: Produto
  ingredientes: Ingrediente
  receitas: Receita
  pedidos: Pedido
  pedido_itens: PedidoItem
  pagamentos: Pagamento
  mov_estoque: MovEstoque
  despesas: Despesa
  caixa: Caixa
  metas: Meta
  comissoes: Comissao
  notificacoes: Notificacao
  logs: Log
  rotas: Rota
  horarios: Horario
}
