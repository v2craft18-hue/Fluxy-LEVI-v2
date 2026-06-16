// ================================================================
// FLUXY — Engine de Impressão e PDF
// Suporta: A4 profissional | Térmica 80mm
// ================================================================

import type { Pedido, Empresa } from '@/types'

export type FormatoImpressao = 'a4' | 'termica'

export const FORMAS_PAG_LABEL: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
}

function fmtData(s: string | Date | null | undefined): string {
  if (!s) return '—'
  try {
    const d = typeof s === 'string' ? new Date(s + (String(s).length === 10 ? 'T12:00:00' : '')) : s
    return d.toLocaleDateString('pt-BR')
  } catch { return '—' }
}

function fmtMoeda(v: number | null | undefined): string {
  if (v == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ════════════════════════════════════════════════
// PDF A4 PROFISSIONAL
// ════════════════════════════════════════════════
export async function gerarPDFA4(p: Pedido, empresa: Empresa | null): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const W = 210       // largura A4
  const M = 14        // margem lateral
  const CW = W - M * 2 // conteúdo width
  let y = 0

  // helpers de cor
  const setColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    doc.setTextColor(r, g, b)
  }
  const setFill = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    doc.setFillColor(r, g, b)
  }
  const setDraw = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    doc.setDrawColor(r, g, b)
  }

  // ── BARRA DE CABEÇALHO ──────────────────────────────
  setFill('#e85d04')
  doc.rect(0, 0, W, 18, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setColor('#ffffff')
  doc.text(empresa?.nome || 'Fluxy', M, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(p.numero, W - M, 12, { align: 'right' })
  y = 25

  // ── INFO EMPRESA ────────────────────────────────────
  doc.setFontSize(8)
  setColor('#555555')
  const infoEmp: string[] = []
  if (empresa?.cnpj) infoEmp.push(`CNPJ: ${empresa.cnpj}`)
  if (empresa?.razao) infoEmp.push(`Razão: ${empresa.razao}`)
  if (empresa?.tel)   infoEmp.push(`Tel: ${empresa.tel}`)
  if (empresa?.whats) infoEmp.push(`WhatsApp: ${empresa.whats}`)
  if (infoEmp.length) { doc.text(infoEmp.join('  |  '), M, y); y += 5 }
  if (empresa?.rua) {
    const end = [empresa.rua, empresa.num, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ')
    doc.text(end, M, y); y += 5
  }

  // linha separadora laranja
  setDraw('#e85d04')
  doc.setLineWidth(0.5)
  doc.line(M, y, W - M, y)
  y += 5

  // ── STATUS + DATA ───────────────────────────────────
  const STATUS_LABELS: Record<string, string> = {
    recebido: 'Recebido', em_producao: 'Em Produção', pronto_embalagem: 'Pronto Embalagem',
    embalado: 'Embalado', pronto_entrega: 'Pronto Entrega', entregue: 'Entregue', cancelado: 'Cancelado',
  }
  doc.setFontSize(8.5)
  setColor('#444444')
  doc.text(`Status: ${STATUS_LABELS[p.status] || p.status}`, M, y)
  doc.text(`Emitido: ${fmtData(p.data_pedido)}${p.data_ent ? `  |  Entrega: ${fmtData(p.data_ent)}${p.hora_ent ? ` às ${p.hora_ent}` : ''}` : ''}`, M + 45, y)
  y += 8

  // ── CLIENTE ─────────────────────────────────────────
  setFill('#f5f5f5')
  setDraw('#dddddd')
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, CW, 26, 2, 2, 'FD')
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setColor('#888888')
  doc.text('CLIENTE', M + 4, y)
  y += 4
  doc.setFontSize(11)
  setColor('#111111')
  doc.text(p.cliente?.nome || '—', M + 4, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor('#555555')

  const cliLine2: string[] = []
  if (p.cliente?.cpf)   cliLine2.push(`CPF: ${p.cliente.cpf}`)
  if (p.cliente?.cnpj) cliLine2.push(`CNPJ: ${p.cliente.cnpj}`)
  if (p.cliente?.tel)   cliLine2.push(`Tel: ${p.cliente.tel}`)
  if (p.cliente?.whats) cliLine2.push(`WhatsApp: ${p.cliente.whats}`)
  if (cliLine2.length) { doc.text(cliLine2.join('  |  '), M + 4, y); y += 4 }

  if (p.cliente?.rua) {
    const endCli = [p.cliente.rua, p.cliente.num, p.cliente.bairro, p.cliente.cidade, p.cliente.estado].filter(Boolean).join(', ')
    doc.text(endCli, M + 4, y); y += 4
  }
  y += 5

  // ── VENDEDOR / ENTREGADOR ───────────────────────────
  if (p.vendedor || p.entregador) {
    const cols: string[] = []
    if (p.vendedor)    cols.push(`Vendedor: ${p.vendedor.nome}`)
    if (p.entregador)  cols.push(`Entregador: ${p.entregador.nome}`)
    doc.setFontSize(8)
    setColor('#555555')
    doc.text(cols.join('     '), M, y)
    y += 7
  }

  // ── TABELA DE ITENS ─────────────────────────────────
  setFill('#e85d04')
  doc.rect(M, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setColor('#ffffff')
  doc.text('PRODUTO', M + 2, y + 5)
  doc.text('QTD', M + 95, y + 5, { align: 'center' })
  doc.text('UNIT.', M + 125, y + 5, { align: 'right' })
  doc.text('DESC.', M + 152, y + 5, { align: 'right' })
  doc.text('TOTAL', M + CW - 2, y + 5, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  p.itens?.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = 15 }
    if (idx % 2 === 1) {
      setFill('#fafafa')
      doc.rect(M, y - 1, CW, 7, 'F')
    }
    setDraw('#eeeeee')
    doc.setLineWidth(0.2)
    doc.line(M, y + 5.5, M + CW, y + 5.5)
    setColor('#111111')
    const nome = doc.splitTextToSize(item.produto?.nome || '—', 85)
    doc.text(nome[0], M + 2, y + 4)
    doc.text(String(item.qtd), M + 95, y + 4, { align: 'center' })
    setColor('#555555')
    doc.text(fmtMoeda(item.unit), M + 125, y + 4, { align: 'right' })
    if (item.desconto_item > 0) {
      setColor('#cc0000')
      doc.text(`-${fmtMoeda(item.desconto_item)}`, M + 152, y + 4, { align: 'right' })
    } else {
      setColor('#aaaaaa')
      doc.text('—', M + 152, y + 4, { align: 'right' })
    }
    doc.setFont('helvetica', 'bold')
    setColor('#111111')
    doc.text(fmtMoeda(item.tot), M + CW - 2, y + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 7
  })

  y += 4

  // ── TOTAIS ──────────────────────────────────────────
  const totX = M + CW - 70
  setDraw('#dddddd')
  doc.setLineWidth(0.3)
  doc.line(totX, y, M + CW, y)
  y += 4

  const linhasTot: [string, string, boolean][] = [
    ['Subtotal', fmtMoeda(p.subtotal), false],
    ...(p.desconto > 0 ? [['Desconto', `-${fmtMoeda(p.desconto)}`, false] as [string, string, boolean]] : []),
    ...(p.taxa_entrega > 0 ? [['Taxa de Entrega', fmtMoeda(p.taxa_entrega), false] as [string, string, boolean]] : []),
  ]
  doc.setFontSize(8.5)
  linhasTot.forEach(([label, val]) => {
    if (y > 270) { doc.addPage(); y = 15 }
    setColor('#555555')
    doc.setFont('helvetica', 'normal')
    doc.text(label, totX + 2, y)
    doc.setFont('helvetica', 'bold')
    setColor('#111111')
    doc.text(val, M + CW - 2, y, { align: 'right' })
    y += 5
  })

  setDraw('#e85d04')
  doc.setLineWidth(0.5)
  doc.line(totX, y, M + CW, y)
  y += 5
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor('#555555')
  doc.text('TOTAL', totX + 2, y)
  setColor('#e85d04')
  doc.text(fmtMoeda(p.total), M + CW - 2, y, { align: 'right' })
  y += 8

  // ── PAGAMENTO ───────────────────────────────────────
  const pag = p.pagamentos?.[0]
  if (pag) {
    if (y > 250) { doc.addPage(); y = 15 }
    setDraw('#dddddd')
    doc.setLineWidth(0.3)
    doc.line(M, y, M + CW, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    setColor('#888888')
    doc.text('PAGAMENTO', M, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor('#111111')
    const pagInfo = [
      `Forma: ${FORMAS_PAG_LABEL[pag.forma] || pag.forma}`,
      `Valor: ${fmtMoeda(pag.valor)}`,
      `Quando: ${pag.momento === 'pedido' ? 'No pedido' : 'Na entrega'}`,
      `Status: ${pag.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}`,
    ]
    doc.text(pagInfo.join('   |   '), M, y)
    y += 8
  }

  // ── OBSERVAÇÕES ─────────────────────────────────────
  if (p.obs) {
    if (y > 250) { doc.addPage(); y = 15 }
    setFill('#fffbeb')
    setDraw('#fde68a')
    doc.setLineWidth(0.3)
    const obsLines = doc.splitTextToSize(p.obs, CW - 10)
    const obsH = obsLines.length * 4.5 + 10
    doc.roundedRect(M, y, CW, obsH, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    setColor('#92400e')
    doc.text('OBSERVAÇÕES', M + 4, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor('#78350f')
    doc.text(obsLines, M + 4, y + 10)
    y += obsH + 6
  }

  // ── RODAPÉ ──────────────────────────────────────────
  const rodapeY = 290
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  setColor('#bbbbbb')
  doc.text(
    `Documento gerado em ${fmtData(new Date())} · ${empresa?.nome || 'Fluxy'} · Sistema de Gestão`,
    W / 2, rodapeY, { align: 'center' }
  )

  doc.save(`Pedido-${p.numero}.pdf`)
}

// ════════════════════════════════════════════════
// IMPRESSÃO TÉRMICA 80mm — gera HTML e abre janela
// ════════════════════════════════════════════════
export function imprimirTermica(p: Pedido, empresa: Empresa | null): void {
  const STATUS_LABELS: Record<string, string> = {
    recebido: 'Recebido', em_producao: 'Em Produção', pronto_embalagem: 'Pronto Embalagem',
    embalado: 'Embalado', pronto_entrega: 'Pronto Entrega', entregue: 'Entregue', cancelado: 'Cancelado',
  }
  const pag = p.pagamentos?.[0]
  const cli = p.cliente

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Pedido ${p.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; padding: 4mm; background: white; color: #000; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .lg     { font-size: 14px; }
  .sm     { font-size: 9px; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .divider-solid { border-top: 1px solid #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { font-size: 10px; vertical-align: top; padding: 1px 2px; }
  th { font-weight: bold; border-bottom: 1px solid #000; }
  .tot-row td { font-weight: bold; border-top: 1px dashed #000; padding-top: 3px; }
  @media print {
    @page { size: 80mm auto; margin: 0; }
    body { padding: 3mm; }
  }
</style>
</head>
<body>
<div class="center bold lg">${empresa?.nome || 'Fluxy'}</div>
${empresa?.cnpj ? `<div class="center sm">CNPJ: ${empresa.cnpj}</div>` : ''}
${empresa?.tel ? `<div class="center sm">Tel: ${empresa.tel}</div>` : ''}
${empresa?.rua ? `<div class="center sm">${[empresa.rua, empresa.num, empresa.bairro, empresa.cidade].filter(Boolean).join(', ')}</div>` : ''}
<div class="divider-solid"></div>
<div class="center bold">${p.numero}</div>
<div class="center sm">${STATUS_LABELS[p.status] || p.status}</div>
<div class="center sm">Emitido: ${fmtData(p.data_pedido)}</div>
${p.data_ent ? `<div class="center sm">Entrega: ${fmtData(p.data_ent)}${p.hora_ent ? ` às ${p.hora_ent}` : ''}</div>` : ''}
<div class="divider"></div>
<div class="bold">CLIENTE</div>
<div>${p.cliente?.nome || '—'}</div>
${p.cliente?.cpf ? `<div class="sm">CPF: ${p.cliente.cpf}</div>` : ''}
${cli?.cnpj ? `<div class="sm">CNPJ: ${cli.cnpj}</div>` : ''}
${p.cliente?.tel ? `<div class="sm">Tel: ${p.cliente.tel}</div>` : ''}
${p.cliente?.whats ? `<div class="sm">WhatsApp: ${p.cliente.whats}</div>` : ''}
${cli?.rua ? `<div class="sm">${[cli.rua, cli.num, cli.bairro, cli.cidade].filter(Boolean).join(', ')}</div>` : ''}
<div class="divider"></div>
<div class="bold">ITENS</div>
<table>
  <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
  <tbody>
    ${p.itens?.map(i => `<tr>
      <td>${i.produto?.nome || '—'}</td>
      <td class="right">${i.qtd}</td>
      <td class="right">${fmtMoeda(i.unit)}</td>
      <td class="right bold">${fmtMoeda(i.tot)}</td>
    </tr>`).join('') || ''}
  </tbody>
</table>
<div class="divider"></div>
<table>
  <tr><td>Subtotal</td><td class="right">${fmtMoeda(p.subtotal)}</td></tr>
  ${p.desconto > 0 ? `<tr><td>Desconto</td><td class="right">-${fmtMoeda(p.desconto)}</td></tr>` : ''}
  ${p.taxa_entrega > 0 ? `<tr><td>Taxa Entrega</td><td class="right">${fmtMoeda(p.taxa_entrega)}</td></tr>` : ''}
  <tr class="tot-row"><td class="bold lg">TOTAL</td><td class="right bold lg">${fmtMoeda(p.total)}</td></tr>
</table>
${pag ? `
<div class="divider"></div>
<div class="bold">PAGAMENTO</div>
<div>${FORMAS_PAG_LABEL[pag.forma] || pag.forma} — ${fmtMoeda(pag.valor)}</div>
<div class="sm">${pag.momento === 'pedido' ? 'Pago no pedido' : 'A pagar na entrega'} · ${pag.status === 'pago' ? 'PAGO' : 'PENDENTE'}</div>
` : ''}
${p.obs ? `
<div class="divider"></div>
<div class="bold">OBSERVACOES</div>
<div class="sm">${p.obs}</div>
` : ''}
<div class="divider-solid"></div>
<div class="center sm">${fmtData(new Date())} · ${empresa?.nome || 'Fluxy'}</div>
<div class="center sm">Obrigado pela preferencia!</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=340,height=600')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

// ════════════════════════════════════════════════
// IMPRESSÃO A4 via janela (react-to-print fallback)
// Gera HTML e abre popup para impressão A4
// ════════════════════════════════════════════════
export function imprimirA4(p: Pedido, empresa: Empresa | null): void {
  const STATUS_LABELS: Record<string, string> = {
    recebido: 'Recebido', em_producao: 'Em Produção', pronto_embalagem: 'Pronto Embalagem',
    embalado: 'Embalado', pronto_entrega: 'Pronto Entrega', entregue: 'Entregue', cancelado: 'Cancelado',
  }
  const pag = p.pagamentos?.[0]
  const cli = p.cliente

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Pedido ${p.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20mm 15mm; color: #111; max-width: 210mm; }
  .header { background: #e85d04; color: white; padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .header h1 { font-size: 18px; margin: 0; }
  .header .num { font-size: 16px; font-weight: bold; }
  .empresa-info { font-size: 10px; color: #555; margin-bottom: 10px; }
  .section { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; background: #fafafa; }
  .section-label { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #888; font-weight: bold; margin-bottom: 6px; }
  .client-name { font-size: 15px; font-weight: bold; margin-bottom: 3px; }
  .client-detail { font-size: 10px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
  thead tr { background: #e85d04; color: white; }
  thead th { padding: 6px 8px; text-align: left; font-weight: bold; }
  thead th:not(:first-child) { text-align: right; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tbody td:not(:first-child) { text-align: right; }
  .totals { float: right; min-width: 220px; font-size: 11px; }
  .totals table td { padding: 3px 4px; }
  .totals table td:last-child { text-align: right; font-weight: 600; }
  .total-final { font-size: 14px; font-weight: bold; color: #e85d04; border-top: 2px solid #e85d04; padding-top: 6px; }
  .status-badge { display: inline-block; background: #fff3e0; color: #e85d04; border: 1px solid #e85d04; border-radius: 999px; padding: 2px 10px; font-size: 10px; font-weight: bold; }
  .obs { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #78350f; }
  .obs-label { font-size: 9px; text-transform: uppercase; color: #92400e; font-weight: bold; margin-bottom: 4px; }
  .footer { border-top: 1px solid #eee; padding-top: 8px; margin-top: 12px; font-size: 9px; color: #bbb; text-align: center; clear: both; }
  .clearfix::after { content: ''; display: table; clear: both; }
  @media print { @page { size: A4; margin: 12mm 10mm; } body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>${empresa?.nome || 'Fluxy'}</h1>
    ${empresa?.cnpj ? `<div style="font-size:10px;opacity:.85">CNPJ: ${empresa.cnpj}</div>` : ''}
  </div>
  <div class="num">${p.numero}</div>
</div>

<div class="empresa-info">
  ${[empresa?.tel ? `Tel: ${empresa.tel}` : '', empresa?.whats ? `WhatsApp: ${empresa.whats}` : '', empresa?.rua ? [empresa.rua, empresa.num, empresa.bairro, empresa.cidade, empresa.estado].filter(Boolean).join(', ') : ''].filter(Boolean).join('  |  ')}
</div>

<div style="display:flex; gap:8px; margin-bottom:10px; font-size:10px; color:#555">
  <span class="status-badge">${STATUS_LABELS[p.status] || p.status}</span>
  <span>Emitido: ${fmtData(p.data_pedido)}</span>
  ${p.data_ent ? `<span>Entrega: ${fmtData(p.data_ent)}${p.hora_ent ? ` às ${p.hora_ent}` : ''}</span>` : ''}
  ${p.vendedor ? `<span>Vendedor: ${p.vendedor.nome}</span>` : ''}
</div>

<div class="section">
  <div class="section-label">Cliente</div>
  <div class="client-name">${p.cliente?.nome || '—'}</div>
  ${[
    p.cliente?.cpf ? `CPF: ${p.cliente.cpf}` : '',
    cli?.cnpj ? `CNPJ: ${cli.cnpj}` : '',
    cli?.ie ? `IE: ${cli.ie}` : '',
    p.cliente?.tel ? `Tel: ${p.cliente.tel}` : '',
    p.cliente?.whats ? `WhatsApp: ${p.cliente.whats}` : '',
  ].filter(Boolean).map(s => `<div class="client-detail">${s}</div>`).join('')}
  ${cli?.rua ? `<div class="client-detail" style="margin-top:3px">${[cli.rua, cli.num, cli.bairro, cli.cidade, cli.estado].filter(Boolean).join(', ')}</div>` : ''}
</div>

<table>
  <thead>
    <tr>
      <th>Produto</th>
      <th style="width:50px">Qtd</th>
      <th style="width:90px">Unit.</th>
      <th style="width:80px">Desc.</th>
      <th style="width:95px">Total</th>
    </tr>
  </thead>
  <tbody>
    ${p.itens?.map(i => `<tr>
      <td>${i.produto?.nome || '—'}</td>
      <td>${i.qtd}</td>
      <td>${fmtMoeda(i.unit)}</td>
      <td>${i.desconto_item > 0 ? `-${fmtMoeda(i.desconto_item)}` : '—'}</td>
      <td style="font-weight:bold">${fmtMoeda(i.tot)}</td>
    </tr>`).join('') || ''}
  </tbody>
</table>

<div class="clearfix">
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td>${fmtMoeda(p.subtotal)}</td></tr>
      ${p.desconto > 0 ? `<tr><td style="color:#c00">Desconto</td><td style="color:#c00">-${fmtMoeda(p.desconto)}</td></tr>` : ''}
      ${p.taxa_entrega > 0 ? `<tr><td>Taxa Entrega</td><td>${fmtMoeda(p.taxa_entrega)}</td></tr>` : ''}
      <tr class="total-final"><td>TOTAL</td><td>${fmtMoeda(p.total)}</td></tr>
    </table>
  </div>
</div>

${pag ? `
<div class="section" style="clear:both; margin-top:10px">
  <div class="section-label">Pagamento</div>
  <div style="display:flex; justify-content:space-between; font-size:11px">
    <div>
      <strong>${FORMAS_PAG_LABEL[pag.forma] || pag.forma}</strong>
      <span style="color:#555; margin-left:6px">${pag.momento === 'pedido' ? 'Pago no pedido' : 'A pagar na entrega'}</span>
    </div>
    <div>
      <strong>${fmtMoeda(pag.valor)}</strong>
      <span style="margin-left:8px; color:${pag.status === 'pago' ? '#16a34a' : '#d97706'}; font-weight:bold">${pag.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}</span>
    </div>
  </div>
</div>
` : ''}

${p.obs ? `
<div class="obs">
  <div class="obs-label">Observações</div>
  ${p.obs}
</div>` : ''}

<div class="footer">Gerado em ${fmtData(new Date())} · ${empresa?.nome || 'Fluxy'} · Sistema de Gestão</div>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

// ════════════════════════════════════════════════
// MENSAGEM WHATSAPP
// ════════════════════════════════════════════════
export function gerarMensagemWhatsApp(p: Pedido, empresa: Empresa | null): string {
  const STATUS_LABELS: Record<string, string> = {
    recebido: 'Recebido', em_producao: 'Em Produção', pronto_embalagem: 'Pronto Embalagem',
    embalado: 'Embalado', pronto_entrega: 'Pronto Entrega', entregue: 'Entregue', cancelado: 'Cancelado',
  }
  const pag = p.pagamentos?.[0]
  const linhas: string[] = []

  linhas.push(`🧾 *PEDIDO ${p.numero}*`)
  if (empresa?.nome) linhas.push(`📍 ${empresa.nome}`)
  linhas.push('')
  linhas.push(`👤 *Cliente:* ${p.cliente?.nome || '—'}`)
  if (p.data_ent) linhas.push(`📅 *Entrega:* ${fmtData(p.data_ent)}${p.hora_ent ? ` às ${p.hora_ent}` : ''}`)
  linhas.push(`📌 *Status:* ${STATUS_LABELS[p.status] || p.status}`)
  linhas.push('')
  linhas.push('*🛒 ITENS:*')
  p.itens?.forEach(i => {
    linhas.push(`• ${i.produto?.nome || '—'} — ${i.qtd}x ${fmtMoeda(i.unit)} = *${fmtMoeda(i.tot)}*`)
  })
  linhas.push('')
  if (p.desconto > 0) linhas.push(`🔖 Desconto: -${fmtMoeda(p.desconto)}`)
  if (p.taxa_entrega > 0) linhas.push(`🚚 Taxa de entrega: ${fmtMoeda(p.taxa_entrega)}`)
  linhas.push(`💰 *TOTAL: ${fmtMoeda(p.total)}*`)
  if (pag) linhas.push(`💳 *Pagamento:* ${FORMAS_PAG_LABEL[pag.forma] || pag.forma} — ${pag.status === 'pago' ? '✅ Pago' : '⏳ A pagar na entrega'}`)
  if (p.obs) { linhas.push(''); linhas.push(`📝 *Obs:* ${p.obs}`) }
  linhas.push('')
  linhas.push(`_${empresa?.nome || 'Fluxy'} · Sistema de Gestão_`)

  return linhas.join('\n')
}

export function abrirWhatsApp(numero: string | null | undefined, mensagem: string): void {
  const n = (numero || '').replace(/\D/g, '')
  const com55 = n.startsWith('55') ? n : n ? '55' + n : ''
  const url = `https://wa.me/${com55}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank')
}
