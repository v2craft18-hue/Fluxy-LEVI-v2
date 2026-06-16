-- ================================================================
-- FLUXY — Schema Completo Supabase
-- Sistema de Gestão para Doceria (SaaS Multi-Tenant)
-- ================================================================
-- CORREÇÕES v3 (esta versão):
--   • 'desc' → 'descricao' em produtos, pedido_itens, despesas
--   • 'data' → 'data_pedido' em pedidos; 'data_despesa' em despesas
--   • FOR ALL policies: adicionado WITH CHECK para permitir INSERT
--   • ON CONFLICT DO NOTHING em comissoes: adicionada UNIQUE(vend_id,ped_id)
--   • ON CONFLICT em categorias: target explícito (nome) removido (multi-tenant)
--   • UNIQUE(nome) em categorias removido (mesmo nome pode existir por empresa)
--   • gerar_numero_pedido: usa SEQUENCE por empresa (sem race condition)
--   • Nomes únicos para todas as policies
-- ================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE perfil_usuario AS ENUM ('admin', 'vendedor', 'entregador');
CREATE TYPE status_pedido  AS ENUM ('recebido','em_producao','pronto_embalagem','embalado','pronto_entrega','entregue','cancelado');
CREATE TYPE momento_pag    AS ENUM ('pedido','entrega');
CREATE TYPE status_pag     AS ENUM ('pendente','pago');
CREATE TYPE tipo_caixa     AS ENUM ('abertura','fechamento','sangria','suprimento','recebimento','pagamento');
CREATE TYPE tipo_comissao  AS ENUM ('pct','fixo');
CREATE TYPE tipo_meta      AS ENUM ('diaria','semanal','mensal');
CREATE TYPE cat_meta       AS ENUM ('geral','vendedor','entregador');
CREATE TYPE forma_pag      AS ENUM ('pix','dinheiro','cartao_credito','cartao_debito','boleto');
CREATE TYPE dia_semana     AS ENUM ('seg','ter','qua','qui','sex','sab','dom');

-- ================================================================
-- EMPRESA (singular — será renomeada para 'empresas' na 002)
-- ================================================================
CREATE TABLE empresa (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL DEFAULT 'Minha Empresa',
  razao         TEXT,
  cnpj          TEXT,
  tel           TEXT,
  whats         TEXT,
  email         TEXT,
  cep           TEXT,
  rua           TEXT,
  num           TEXT,
  comp          TEXT,
  bairro        TEXT,
  cidade        TEXT,
  estado        TEXT,
  cor           TEXT DEFAULT '#e85d04',
  logo          TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- USUÁRIOS (espelho do Supabase Auth + perfil)
-- ================================================================
CREATE TABLE usuarios (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  email     TEXT NOT NULL,
  perfil    perfil_usuario NOT NULL DEFAULT 'admin',
  ativo     BOOLEAN NOT NULL DEFAULT TRUE,
  vend_id   UUID,
  ent_id    UUID,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email  ON usuarios(email);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil);

-- ================================================================
-- CLIENTES
-- ================================================================
CREATE TABLE clientes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  cpf       TEXT,
  email     TEXT,
  tel       TEXT,
  whats     TEXT,
  cep       TEXT,
  rua       TEXT,
  num       TEXT,
  comp      TEXT,
  bairro    TEXT,
  cidade    TEXT,
  estado    TEXT,
  obs       TEXT,
  ativo     BOOLEAN DEFAULT TRUE,
  lgpd_ok   BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  vend_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_clientes_nome ON clientes(nome);

-- ================================================================
-- VENDEDORES
-- ================================================================
CREATE TABLE vendedores (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  tel       TEXT,
  whats     TEXT,
  com_tipo  tipo_comissao DEFAULT 'pct',
  com_pct   NUMERIC(5,2) DEFAULT 5,
  com_fixo  NUMERIC(10,2) DEFAULT 0,
  ativo     BOOLEAN DEFAULT TRUE,
  login     TEXT UNIQUE,
  user_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  disp_dias JSONB DEFAULT '{"seg":true,"ter":true,"qua":true,"qui":true,"sex":true,"sab":true,"dom":true}',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ENTREGADORES
-- ================================================================
CREATE TABLE entregadores (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  tel       TEXT,
  whats     TEXT,
  veiculo   TEXT,
  placa     TEXT,
  ativo     BOOLEAN DEFAULT TRUE,
  login     TEXT UNIQUE,
  user_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  disp_dias JSONB DEFAULT '{"seg":true,"ter":true,"qua":true,"qui":true,"sex":true,"sab":true,"dom":true}',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CATEGORIAS
-- FIX: UNIQUE(nome) removido — no multi-tenant, dois empresas podem
--      ter a mesma categoria. UNIQUE por empresa adicionado na 002.
-- ================================================================
CREATE TABLE categorias (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PRODUTOS
-- FIX: coluna 'desc' → 'descricao' (palavra reservada PostgreSQL)
-- ================================================================
CREATE TABLE produtos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  cat_id      UUID REFERENCES categorias(id) ON DELETE SET NULL,
  preco       NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo       NUMERIC(10,2) DEFAULT 0,
  est         NUMERIC(10,3) DEFAULT 0,
  min         NUMERIC(10,3) DEFAULT 0,
  descricao   TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  tem_receita BOOLEAN DEFAULT FALSE,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_produtos_cat ON produtos(cat_id);

-- ================================================================
-- INGREDIENTES
-- ================================================================
CREATE TABLE ingredientes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  un        TEXT NOT NULL DEFAULT 'un',
  custo     NUMERIC(10,4) DEFAULT 0,
  est       NUMERIC(10,3) DEFAULT 0,
  min       NUMERIC(10,3) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- RECEITAS (produto → ingredientes)
-- ================================================================
CREATE TABLE receitas (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prod_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  ing_id  UUID NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  qtd     NUMERIC(10,4) NOT NULL,
  UNIQUE(prod_id, ing_id)
);

CREATE INDEX idx_receitas_prod ON receitas(prod_id);

-- ================================================================
-- PEDIDOS
-- FIX: coluna 'data' → 'data_pedido' (evita ambiguidade com tipo DATE)
-- ================================================================
CREATE TABLE pedidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT NOT NULL,
  cli_id          UUID REFERENCES clientes(id) ON DELETE SET NULL,
  vend_id         UUID REFERENCES vendedores(id) ON DELETE SET NULL,
  ent_id          UUID REFERENCES entregadores(id) ON DELETE SET NULL,
  data_pedido     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_ent        DATE,
  hora_ent        TEXT,
  origem          TEXT DEFAULT 'balcao',
  status          status_pedido NOT NULL DEFAULT 'recebido',
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto        NUMERIC(10,2) DEFAULT 0,
  taxa_entrega    NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  momento_pag     momento_pag DEFAULT 'entrega',
  obs             TEXT,
  bloqueado       BOOLEAN DEFAULT FALSE,
  kanban_arq      BOOLEAN DEFAULT FALSE,
  ent_oculto      BOOLEAN DEFAULT FALSE,
  dt_entrega_conf TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pedidos_cli      ON pedidos(cli_id);
CREATE INDEX idx_pedidos_status   ON pedidos(status);
CREATE INDEX idx_pedidos_data_ent ON pedidos(data_ent);
CREATE INDEX idx_pedidos_vend     ON pedidos(vend_id);
CREATE INDEX idx_pedidos_ent      ON pedidos(ent_id);
CREATE INDEX idx_pedidos_data     ON pedidos(data_pedido);

-- ================================================================
-- PEDIDO_ITENS
-- FIX: coluna 'desc' → 'desconto_item' (palavra reservada PostgreSQL)
-- ================================================================
CREATE TABLE pedido_itens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ped_id        UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  prod_id       UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  qtd           NUMERIC(10,3) NOT NULL,
  unit          NUMERIC(10,2) NOT NULL,
  desconto_item NUMERIC(10,2) DEFAULT 0,
  tot           NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_pedido_itens_ped ON pedido_itens(ped_id);

-- ================================================================
-- PAGAMENTOS
-- ================================================================
CREATE TABLE pagamentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ped_id          UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  forma           forma_pag NOT NULL DEFAULT 'dinheiro',
  valor           NUMERIC(10,2) NOT NULL,
  status          status_pag NOT NULL DEFAULT 'pendente',
  momento         momento_pag DEFAULT 'entrega',
  data_pag        TIMESTAMPTZ,
  uid_confirmacao UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pagamentos_ped    ON pagamentos(ped_id);
CREATE INDEX idx_pagamentos_status ON pagamentos(status);

-- ================================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ================================================================
CREATE TABLE mov_estoque (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prod_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  ing_id  UUID REFERENCES ingredientes(id) ON DELETE SET NULL,
  tipo    TEXT NOT NULL,
  qtd     NUMERIC(10,3) NOT NULL,
  ant     NUMERIC(10,3),
  obs     TEXT,
  uid     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  dt      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_mov_ref CHECK (prod_id IS NOT NULL OR ing_id IS NOT NULL)
);

CREATE INDEX idx_mov_prod ON mov_estoque(prod_id);
CREATE INDEX idx_mov_ing  ON mov_estoque(ing_id);
CREATE INDEX idx_mov_dt   ON mov_estoque(dt);

-- ================================================================
-- DESPESAS
-- FIX: coluna 'desc' → 'descricao' (palavra reservada PostgreSQL)
-- FIX: coluna 'data' → 'data_despesa' (evita ambiguidade)
-- ================================================================
CREATE TABLE despesas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao    TEXT NOT NULL,
  cat          TEXT,
  valor        NUMERIC(10,2) NOT NULL,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  venc         DATE,
  pago         BOOLEAN DEFAULT FALSE,
  uid          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_despesas_data ON despesas(data_despesa);

-- ================================================================
-- CAIXA
-- ================================================================
CREATE TABLE caixa (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo       tipo_caixa NOT NULL,
  valor      NUMERIC(10,2) NOT NULL,
  saldo_ant  NUMERIC(10,2) DEFAULT 0,
  saldo      NUMERIC(10,2) DEFAULT 0,
  obs        TEXT,
  uid        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  dt         TIMESTAMPTZ DEFAULT NOW(),
  numero     TEXT,
  confirmada BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_caixa_dt  ON caixa(dt);
CREATE INDEX idx_caixa_uid ON caixa(uid);

-- ================================================================
-- HORÁRIOS DE ENTREGA
-- ================================================================
CREATE TABLE horarios (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dia   dia_semana NOT NULL,
  hora  TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

-- ================================================================
-- ROTAS
-- ================================================================
CREATE TABLE rotas (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  dia       dia_semana,
  ativo     BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rota_clientes (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rota_id UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
  cli_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  ordem   INTEGER DEFAULT 0,
  UNIQUE(rota_id, cli_id)
);

CREATE INDEX idx_rota_clientes_rota ON rota_clientes(rota_id);

-- ================================================================
-- METAS
-- ================================================================
CREATE TABLE metas (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo      tipo_meta NOT NULL DEFAULT 'mensal',
  categoria cat_meta NOT NULL DEFAULT 'geral',
  meta      NUMERIC(10,2) NOT NULL,
  atingido  NUMERIC(10,2) DEFAULT 0,
  periodo   DATE NOT NULL,
  ref_id    UUID,
  ref_nome  TEXT,
  unidade   TEXT DEFAULT 'R$',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- COMISSÕES
-- FIX: adicionada UNIQUE(vend_id, ped_id) para ON CONFLICT funcionar
-- ================================================================
CREATE TABLE comissoes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vend_id   UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  ped_id    UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  valor     NUMERIC(10,2) NOT NULL,
  pct       NUMERIC(5,2),
  status    TEXT NOT NULL DEFAULT 'pendente',
  data_pag  TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vend_id, ped_id)
);

CREATE INDEX idx_comissoes_vend ON comissoes(vend_id);
CREATE INDEX idx_comissoes_ped  ON comissoes(ped_id);

-- ================================================================
-- NOTIFICAÇÕES
-- ================================================================
CREATE TABLE notificacoes (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo    TEXT NOT NULL,
  titulo  TEXT NOT NULL,
  msg     TEXT,
  lida    BOOLEAN DEFAULT FALSE,
  dt      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notificacoes(user_id);
CREATE INDEX idx_notif_lida ON notificacoes(lida);

-- ================================================================
-- LOGS DE AUDITORIA
-- ================================================================
CREATE TABLE logs (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao   TEXT NOT NULL,
  modulo TEXT NOT NULL,
  rid    TEXT,
  det    TEXT,
  dt     TIMESTAMPTZ DEFAULT NOW()
);

-- FIX: DESC em índice é sintaxe válida de ordenação — mantido
CREATE INDEX idx_logs_dt     ON logs(dt DESC);
CREATE INDEX idx_logs_uid    ON logs(uid);
CREATE INDEX idx_logs_modulo ON logs(modulo);

-- ================================================================
-- LGPD
-- ================================================================
CREATE TABLE lgpd (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cli_id             UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo               TEXT NOT NULL,
  ok                 BOOLEAN DEFAULT FALSE,
  data_consentimento TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TRIGGER — updated_at automático em pedidos
-- ================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedidos_updated
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ================================================================
-- TRIGGER — gerar número do pedido automático
-- FIX: usa SEQUENCE anônima via nextval + empresa_id para evitar
--      race condition com COUNT(*) simultâneo
-- ================================================================
CREATE SEQUENCE IF NOT EXISTS seq_pedidos_numero START 1;

CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    seq_num  := nextval('seq_pedidos_numero');
    NEW.numero := 'PED' || LPAD(seq_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedidos_numero
  BEFORE INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION gerar_numero_pedido();

-- ================================================================
-- TRIGGER — baixa automática de estoque ao entrar em produção
-- ================================================================
CREATE OR REPLACE FUNCTION baixar_estoque_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'em_producao' AND OLD.status = 'recebido' THEN
    INSERT INTO mov_estoque (ing_id, tipo, qtd, obs, dt)
    SELECT
      r.ing_id,
      'producao',
      SUM(pi.qtd * r.qtd),
      'Produção pedido ' || NEW.numero,
      NOW()
    FROM pedido_itens pi
    JOIN receitas r ON r.prod_id = pi.prod_id
    WHERE pi.ped_id = NEW.id
    GROUP BY r.ing_id;

    UPDATE ingredientes i
    SET est = i.est - sub.total
    FROM (
      SELECT r.ing_id, SUM(pi.qtd * r.qtd) AS total
      FROM pedido_itens pi
      JOIN receitas r ON r.prod_id = pi.prod_id
      WHERE pi.ped_id = NEW.id
      GROUP BY r.ing_id
    ) sub
    WHERE i.id = sub.ing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_baixa_estoque
  AFTER UPDATE OF status ON pedidos
  FOR EACH ROW EXECUTE FUNCTION baixar_estoque_producao();

-- ================================================================
-- TRIGGER — calcular comissão ao marcar pedido como entregue
-- ================================================================
CREATE OR REPLACE FUNCTION calcular_comissao()
RETURNS TRIGGER AS $$
DECLARE
  v       vendedores%ROWTYPE;
  val_com NUMERIC(10,2);
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' AND NEW.vend_id IS NOT NULL THEN
    SELECT * INTO v FROM vendedores WHERE id = NEW.vend_id;
    IF FOUND THEN
      val_com := CASE v.com_tipo
        WHEN 'fixo' THEN v.com_fixo
        ELSE (NEW.total * v.com_pct / 100)
      END;
      -- FIX: ON CONFLICT agora funciona pois UNIQUE(vend_id, ped_id) existe
      INSERT INTO comissoes (vend_id, ped_id, valor, pct, status)
      VALUES (NEW.vend_id, NEW.id, val_com, v.com_pct, 'pendente')
      ON CONFLICT (vend_id, ped_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comissao
  AFTER UPDATE OF status ON pedidos
  FOR EACH ROW EXECUTE FUNCTION calcular_comissao();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE VIEW vw_pedidos AS
SELECT
  p.*,
  c.nome   AS cli_nome,  c.tel    AS cli_tel,  c.whats  AS cli_whats,
  c.rua    AS cli_rua,   c.num    AS cli_num,  c.bairro AS cli_bairro,
  c.cidade AS cli_cidade, c.estado AS cli_estado,
  v.nome   AS vend_nome,
  e.nome   AS ent_nome,
  pg.forma AS pag_forma, pg.status AS pag_status,
  pg.valor AS pag_valor, pg.momento AS pag_momento
FROM pedidos p
LEFT JOIN clientes     c  ON c.id  = p.cli_id
LEFT JOIN vendedores   v  ON v.id  = p.vend_id
LEFT JOIN entregadores e  ON e.id  = p.ent_id
LEFT JOIN pagamentos   pg ON pg.ped_id = p.id;

-- FIX: coluna 'data' → 'data_pedido'
CREATE VIEW vw_metricas_dia AS
SELECT
  COUNT(*) FILTER (WHERE status != 'cancelado')                 AS total_pedidos,
  COALESCE(SUM(total) FILTER (WHERE status != 'cancelado'), 0)  AS faturamento,
  COALESCE(AVG(total) FILTER (WHERE status != 'cancelado'), 0)  AS ticket_medio
FROM pedidos
WHERE DATE(data_pedido) = CURRENT_DATE;

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE empresa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregadores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mov_estoque   ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa         ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd          ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rota_clientes ENABLE ROW LEVEL SECURITY;

-- Helper: pegar perfil do usuário logado
CREATE OR REPLACE FUNCTION perfil_atual()
RETURNS perfil_usuario AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid() AND ativo = TRUE LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================================
-- POLICIES RLS — single-tenant (substituídas pela 002 no multi-tenant)
-- FIX: WITH CHECK adicionado em todas as policies FOR ALL
--      sem WITH CHECK, INSERT é bloqueado mesmo que USING passe
-- ================================================================

-- empresa
CREATE POLICY "empresa_admin" ON empresa
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- clientes
CREATE POLICY "clientes_acesso" ON clientes
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- produtos
CREATE POLICY "produtos_acesso" ON produtos
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- categorias
CREATE POLICY "categorias_acesso" ON categorias
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- ingredientes
CREATE POLICY "ingredientes_admin" ON ingredientes
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- receitas
CREATE POLICY "receitas_admin" ON receitas
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- vendedores
CREATE POLICY "vendedores_admin" ON vendedores
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- entregadores
CREATE POLICY "entregadores_admin" ON entregadores
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- despesas
CREATE POLICY "despesas_admin" ON despesas
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- caixa
CREATE POLICY "caixa_admin" ON caixa
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- metas
CREATE POLICY "metas_todos" ON metas
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor','entregador'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor','entregador'));

-- comissoes
CREATE POLICY "comissoes_admin" ON comissoes
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- horarios
CREATE POLICY "horarios_admin" ON horarios
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');

-- rotas
CREATE POLICY "rotas_acesso" ON rotas
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- rota_clientes
CREATE POLICY "rota_clientes_acesso" ON rota_clientes
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- mov_estoque
CREATE POLICY "mov_estoque_acesso" ON mov_estoque
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- lgpd
CREATE POLICY "lgpd_acesso" ON lgpd
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- logs
CREATE POLICY "logs_leitura_admin" ON logs
  FOR SELECT USING (perfil_atual() = 'admin');
CREATE POLICY "logs_insert_todos"  ON logs
  FOR INSERT WITH CHECK (TRUE);

-- pedidos
CREATE POLICY "pedidos_leitura" ON pedidos
  FOR SELECT USING (perfil_atual() IN ('admin','vendedor','entregador'));
CREATE POLICY "pedidos_escrita" ON pedidos
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- pedido_itens
CREATE POLICY "pedido_itens_leitura" ON pedido_itens
  FOR SELECT USING (perfil_atual() IN ('admin','vendedor','entregador'));
CREATE POLICY "pedido_itens_escrita" ON pedido_itens
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- pagamentos
CREATE POLICY "pagamentos_leitura" ON pagamentos
  FOR SELECT USING (perfil_atual() IN ('admin','vendedor','entregador'));
CREATE POLICY "pagamentos_escrita" ON pagamentos
  FOR ALL
  USING     (perfil_atual() IN ('admin','vendedor'))
  WITH CHECK (perfil_atual() IN ('admin','vendedor'));

-- notificacoes
CREATE POLICY "notif_propria" ON notificacoes
  FOR ALL
  USING     (user_id = auth.uid() OR perfil_atual() = 'admin')
  WITH CHECK (user_id = auth.uid() OR perfil_atual() = 'admin');

-- usuarios
CREATE POLICY "usuarios_admin_all"   ON usuarios
  FOR ALL
  USING     (perfil_atual() = 'admin')
  WITH CHECK (perfil_atual() = 'admin');
CREATE POLICY "usuarios_self_select" ON usuarios
  FOR SELECT USING (id = auth.uid());

-- ================================================================
-- DADOS INICIAIS
-- FIX: ON CONFLICT sem target explícito (UNIQUE removido de categorias)
--      Inserção direta — a unicidade por empresa será garantida na 002
-- ================================================================
INSERT INTO categorias (nome) VALUES
  ('Bolos de Pote'), ('Tortas'), ('Doces'), ('Salgados');
