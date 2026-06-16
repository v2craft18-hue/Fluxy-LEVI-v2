-- ================================================================
-- FLUXY — Migração Multi-Tenant (002)
-- Converte arquitetura single-tenant para SaaS multiempresa
--
-- ESTRATÉGIA:
--   1. Renomear tabela 'empresa' para 'empresas' (catálogo)
--   2. Adicionar empresa_id em 17 tabelas
--   3. Criar função empresa_atual() para RLS automático
--   4. Substituir todas as policies por versões tenant-aware
--   5. Criar tabela planos + onboarding
--
-- EXECUTE APÓS: 001_schema_completo.sql
-- ================================================================
-- CORREÇÕES v3 (esta versão):
--   • Removido ADD CONSTRAINT empresas_numero_pedido_unique inválido
--   • Nomes de policies únicos sem colisão com 001
--   • WITH CHECK adicionado em todas as policies FOR ALL
--   • UNIQUE(nome, empresa_id) em categorias (multi-tenant safe)
--   • gerar_numero_pedido usa SEQUENCE por empresa (sem race condition)
--   • perfil_atual() agora verifica ativo = TRUE
-- ================================================================

-- ================================================================
-- PASSO 1 — Renomear 'empresa' para 'empresas'
-- ================================================================

ALTER TABLE empresa RENAME TO empresas;

-- Campos de plano e controle SaaS
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS slug      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plano     TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS ativo     BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS trial_ate TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');

-- Slug automático a partir do nome
CREATE OR REPLACE FUNCTION gerar_slug(nome TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(
    translate(nome,
      'àáâãäçèéêëìíîïñòóôõöùúûüýÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
      'aaaaaceeeeiiiinoooooouuuuyAAAAAACEEEEIIIINOOOOOUUUUY'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PASSO 2 — Adicionar empresa_id em usuarios
-- ================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);

-- ================================================================
-- PASSO 3 — Adicionar empresa_id em todas as entidades de negócio
-- ================================================================

ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE vendedores   ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE categorias   ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE produtos     ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE ingredientes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE pedidos      ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE mov_estoque  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE despesas     ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE caixa        ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE metas        ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE logs         ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE rotas        ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE horarios     ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE lgpd         ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;

-- ================================================================
-- PASSO 3B — UNIQUE por empresa em categorias
-- FIX: A 001 removeu UNIQUE(nome) global para suportar multi-tenant.
--      Aqui adicionamos UNIQUE(nome, empresa_id) para garantir unicidade
--      dentro de cada empresa, mas permitir o mesmo nome entre empresas.
-- ================================================================

ALTER TABLE categorias
  ADD CONSTRAINT categorias_nome_empresa_unique UNIQUE (nome, empresa_id);

-- ================================================================
-- PASSO 4 — Índices de performance por empresa_id
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_clientes_empresa      ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendedores_empresa     ON vendedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entregadores_empresa   ON entregadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa     ON categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa       ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ingredientes_empresa   ON ingredientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa        ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_status ON pedidos(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_data   ON pedidos(empresa_id, data_ent);
CREATE INDEX IF NOT EXISTS idx_mov_empresa            ON mov_estoque(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_empresa       ON despesas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_empresa          ON caixa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metas_empresa          ON metas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notif_empresa          ON notificacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_empresa           ON logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_rotas_empresa          ON rotas(empresa_id);

-- ================================================================
-- PASSO 5 — Funções centrais de multi-tenant
-- FIX: ambas verificam ativo = TRUE
-- ================================================================

CREATE OR REPLACE FUNCTION empresa_atual()
RETURNS UUID AS $$
  SELECT empresa_id
  FROM usuarios
  WHERE id = auth.uid()
    AND ativo = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION perfil_atual()
RETURNS perfil_usuario AS $$
  SELECT perfil
  FROM usuarios
  WHERE id = auth.uid()
    AND ativo = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================================
-- PASSO 6 — Remover TODAS as policies antigas (single-tenant)
-- ================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- ================================================================
-- PASSO 7 — Helper: verificar acesso por perfil na empresa atual
-- ================================================================

CREATE OR REPLACE FUNCTION tem_acesso(perfis perfil_usuario[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id         = auth.uid()
      AND empresa_id = empresa_atual()
      AND perfil     = ANY(perfis)
      AND ativo      = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================================
-- PASSO 8 — Políticas RLS Multi-Tenant
-- FIX: WITH CHECK adicionado em todas as policies FOR ALL
-- ================================================================

-- ── empresas ──
CREATE POLICY "mt_empresas_select" ON empresas
  FOR SELECT USING (id = empresa_atual());
CREATE POLICY "mt_empresas_update" ON empresas
  FOR UPDATE
  USING     (id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (id = empresa_atual() AND perfil_atual() = 'admin');

-- ── usuarios ──
CREATE POLICY "mt_usuarios_select" ON usuarios
  FOR SELECT USING (empresa_id = empresa_atual() OR id = auth.uid());
CREATE POLICY "mt_usuarios_admin" ON usuarios
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── clientes ──
CREATE POLICY "mt_clientes_select" ON clientes
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_clientes_write" ON clientes
  FOR ALL
  USING     (empresa_id = empresa_atual() AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[]))
  WITH CHECK (empresa_id = empresa_atual() AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[]));

-- ── vendedores ──
CREATE POLICY "mt_vendedores_select" ON vendedores
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_vendedores_admin" ON vendedores
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── entregadores ──
CREATE POLICY "mt_entregadores_select" ON entregadores
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_entregadores_admin" ON entregadores
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── categorias ──
CREATE POLICY "mt_categorias_select" ON categorias
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_categorias_admin" ON categorias
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── produtos ──
CREATE POLICY "mt_produtos_select" ON produtos
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_produtos_admin" ON produtos
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── ingredientes ──
CREATE POLICY "mt_ingredientes_select" ON ingredientes
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_ingredientes_admin" ON ingredientes
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── receitas (isolado via produto → empresa) ──
CREATE POLICY "mt_receitas_select" ON receitas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM produtos
      WHERE produtos.id = receitas.prod_id
        AND produtos.empresa_id = empresa_atual()
    )
  );
CREATE POLICY "mt_receitas_admin" ON receitas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM produtos
      WHERE produtos.id = receitas.prod_id
        AND produtos.empresa_id = empresa_atual()
    ) AND perfil_atual() = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM produtos
      WHERE produtos.id = receitas.prod_id
        AND produtos.empresa_id = empresa_atual()
    ) AND perfil_atual() = 'admin'
  );

-- ── pedidos ──
CREATE POLICY "mt_pedidos_select" ON pedidos
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_pedidos_write" ON pedidos
  FOR ALL
  USING     (empresa_id = empresa_atual() AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[]))
  WITH CHECK (empresa_id = empresa_atual() AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[]));

-- ── pedido_itens (via pedido → empresa) ──
CREATE POLICY "mt_pedido_itens_select" ON pedido_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_itens.ped_id
        AND pedidos.empresa_id = empresa_atual()
    )
  );
CREATE POLICY "mt_pedido_itens_write" ON pedido_itens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_itens.ped_id
        AND pedidos.empresa_id = empresa_atual()
    ) AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_itens.ped_id
        AND pedidos.empresa_id = empresa_atual()
    ) AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[])
  );

-- ── pagamentos (via pedido → empresa) ──
CREATE POLICY "mt_pagamentos_select" ON pagamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pagamentos.ped_id
        AND pedidos.empresa_id = empresa_atual()
    )
  );
CREATE POLICY "mt_pagamentos_write" ON pagamentos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pagamentos.ped_id
        AND pedidos.empresa_id = empresa_atual()
    ) AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pagamentos.ped_id
        AND pedidos.empresa_id = empresa_atual()
    ) AND tem_acesso(ARRAY['admin','vendedor']::perfil_usuario[])
  );

-- ── mov_estoque ──
CREATE POLICY "mt_mov_estoque_all" ON mov_estoque
  FOR ALL
  USING     (empresa_id = empresa_atual())
  WITH CHECK (empresa_id = empresa_atual());

-- ── despesas ──
CREATE POLICY "mt_despesas_admin" ON despesas
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── caixa ──
CREATE POLICY "mt_caixa_admin" ON caixa
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── metas ──
CREATE POLICY "mt_metas_select" ON metas
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_metas_admin" ON metas
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── comissoes (via vendedor → empresa) ──
CREATE POLICY "mt_comissoes_select" ON comissoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendedores
      WHERE vendedores.id = comissoes.vend_id
        AND vendedores.empresa_id = empresa_atual()
    )
  );
CREATE POLICY "mt_comissoes_admin" ON comissoes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vendedores
      WHERE vendedores.id = comissoes.vend_id
        AND vendedores.empresa_id = empresa_atual()
    ) AND perfil_atual() = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendedores
      WHERE vendedores.id = comissoes.vend_id
        AND vendedores.empresa_id = empresa_atual()
    ) AND perfil_atual() = 'admin'
  );

-- ── notificacoes ──
CREATE POLICY "mt_notif_propria" ON notificacoes
  FOR ALL
  USING     (empresa_id = empresa_atual() AND user_id = auth.uid())
  WITH CHECK (empresa_id = empresa_atual() AND user_id = auth.uid());
CREATE POLICY "mt_notif_admin" ON notificacoes
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── logs ──
CREATE POLICY "mt_logs_select" ON logs
  FOR SELECT USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "mt_logs_insert" ON logs
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());

-- ── rotas ──
CREATE POLICY "mt_rotas_select" ON rotas
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_rotas_admin" ON rotas
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── rota_clientes (via rota → empresa) ──
CREATE POLICY "mt_rota_clientes_all" ON rota_clientes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rotas
      WHERE rotas.id = rota_clientes.rota_id
        AND rotas.empresa_id = empresa_atual()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rotas
      WHERE rotas.id = rota_clientes.rota_id
        AND rotas.empresa_id = empresa_atual()
    )
  );

-- ── horarios ──
CREATE POLICY "mt_horarios_select" ON horarios
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "mt_horarios_admin" ON horarios
  FOR ALL
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── lgpd (via cliente → empresa) ──
CREATE POLICY "mt_lgpd_all" ON lgpd
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = lgpd.cli_id
        AND clientes.empresa_id = empresa_atual()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = lgpd.cli_id
        AND clientes.empresa_id = empresa_atual()
    )
  );

-- ================================================================
-- PASSO 9 — Trigger de número de pedido por empresa (sem race condition)
-- FIX: Usa uma SEQUENCE separada por empresa armazenada em tabela auxiliar
-- ================================================================

CREATE TABLE IF NOT EXISTS empresa_seq_pedidos (
  empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  ultimo_num BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS TRIGGER AS $$
DECLARE
  seq_num BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    -- Lock na linha da empresa para serializar (elimina race condition)
    INSERT INTO empresa_seq_pedidos (empresa_id, ultimo_num)
    VALUES (NEW.empresa_id, 1)
    ON CONFLICT (empresa_id) DO UPDATE
      SET ultimo_num = empresa_seq_pedidos.ultimo_num + 1
    RETURNING ultimo_num INTO seq_num;

    NEW.numero := 'PED' || LPAD(seq_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger (já existe da 001, só atualiza a função)
DROP TRIGGER IF EXISTS trg_pedidos_numero ON pedidos;
CREATE TRIGGER trg_pedidos_numero
  BEFORE INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION gerar_numero_pedido();

-- ================================================================
-- PASSO 10 — Trigger de baixa de estoque com empresa_id
-- ================================================================

CREATE OR REPLACE FUNCTION baixar_estoque_producao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'em_producao' AND OLD.status = 'recebido' THEN
    INSERT INTO mov_estoque (ing_id, empresa_id, tipo, qtd, obs, dt)
    SELECT
      r.ing_id,
      NEW.empresa_id,
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
    WHERE i.id = sub.ing_id
      AND i.empresa_id = NEW.empresa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PASSO 11 — View vw_pedidos com empresa_id
-- FIX: coluna 'data' → 'data_pedido'
-- ================================================================

DROP VIEW IF EXISTS vw_pedidos;
CREATE VIEW vw_pedidos AS
SELECT
  p.*,
  emp.nome  AS empresa_nome,
  c.nome    AS cli_nome,   c.tel    AS cli_tel,    c.whats  AS cli_whats,
  c.rua     AS cli_rua,    c.num    AS cli_num,    c.bairro AS cli_bairro,
  c.cidade  AS cli_cidade, c.estado AS cli_estado,
  v.nome    AS vend_nome,
  ent.nome  AS ent_nome,
  pg.forma  AS pag_forma,  pg.status AS pag_status,
  pg.valor  AS pag_valor,  pg.momento AS pag_momento
FROM pedidos p
LEFT JOIN empresas     emp ON emp.id  = p.empresa_id
LEFT JOIN clientes     c   ON c.id   = p.cli_id
LEFT JOIN vendedores   v   ON v.id   = p.vend_id
LEFT JOIN entregadores ent ON ent.id = p.ent_id
LEFT JOIN pagamentos   pg  ON pg.ped_id = p.id;

-- ================================================================
-- PASSO 12 — Habilitar RLS na tabela empresas
-- ================================================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- RLS para empresa_seq_pedidos (acessível apenas internamente)
ALTER TABLE empresa_seq_pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seq_pedidos_empresa" ON empresa_seq_pedidos
  FOR ALL
  USING     (empresa_id = empresa_atual())
  WITH CHECK (empresa_id = empresa_atual());

-- ================================================================
-- PASSO 13 — Função de onboarding: criar empresa + admin em 1 chamada
-- ================================================================

CREATE OR REPLACE FUNCTION criar_empresa_com_admin(
  p_empresa_nome  TEXT,
  p_empresa_email TEXT,
  p_admin_nome    TEXT,
  p_admin_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  nova_empresa_id UUID;
  slug_base       TEXT;
  slug_final      TEXT;
  contador        INTEGER := 0;
BEGIN
  -- Gerar slug único
  slug_base  := gerar_slug(p_empresa_nome);
  slug_final := slug_base;
  WHILE EXISTS (SELECT 1 FROM empresas WHERE slug = slug_final) LOOP
    contador   := contador + 1;
    slug_final := slug_base || '-' || contador;
  END LOOP;

  -- Criar empresa
  INSERT INTO empresas (nome, email, slug, plano, ativo)
  VALUES (p_empresa_nome, p_empresa_email, slug_final, 'trial', TRUE)
  RETURNING id INTO nova_empresa_id;

  -- Criar usuário admin vinculado à empresa
  INSERT INTO usuarios (id, nome, email, perfil, ativo, empresa_id)
  SELECT
    p_admin_user_id,
    p_admin_nome,
    p_empresa_email,
    'admin',
    TRUE,
    nova_empresa_id
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = nova_empresa_id,
        perfil     = 'admin',
        ativo      = TRUE;

  -- Criar categorias padrão para a empresa
  -- FIX: usa ON CONFLICT (nome, empresa_id) com o novo UNIQUE constraint
  INSERT INTO categorias (nome, empresa_id) VALUES
    ('Bolos de Pote', nova_empresa_id),
    ('Tortas',        nova_empresa_id),
    ('Doces',         nova_empresa_id),
    ('Salgados',      nova_empresa_id)
  ON CONFLICT (nome, empresa_id) DO NOTHING;

  -- Inicializar sequência de pedidos para a empresa
  INSERT INTO empresa_seq_pedidos (empresa_id, ultimo_num)
  VALUES (nova_empresa_id, 0)
  ON CONFLICT (empresa_id) DO NOTHING;

  RETURN nova_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- MIGRAÇÃO DE DADOS EXISTENTES (se já houver dados no banco)
-- ================================================================

DO $$
DECLARE
  emp_id UUID;
BEGIN
  SELECT id INTO emp_id FROM empresas LIMIT 1;

  IF emp_id IS NOT NULL THEN
    UPDATE usuarios       SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE clientes       SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE vendedores     SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE entregadores   SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE categorias     SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE produtos       SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE ingredientes   SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE pedidos        SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE mov_estoque    SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE despesas       SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE caixa          SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE metas          SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE notificacoes   SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE logs           SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE rotas          SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE horarios       SET empresa_id = emp_id WHERE empresa_id IS NULL;
    UPDATE lgpd           SET empresa_id = emp_id WHERE empresa_id IS NULL;

    -- Inicializar sequência para empresa existente
    INSERT INTO empresa_seq_pedidos (empresa_id, ultimo_num)
    SELECT emp_id, COUNT(*) FROM pedidos WHERE empresa_id = emp_id
    ON CONFLICT (empresa_id) DO NOTHING;

    RAISE NOTICE 'Dados migrados para empresa_id: %', emp_id;
  END IF;
END;
$$;

-- ================================================================
-- PASSO 14 — NOT NULL após migração (descomentar após confirmar dados)
-- ================================================================
-- ALTER TABLE usuarios       ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE clientes       ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE vendedores     ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE entregadores   ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE categorias     ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE produtos       ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE ingredientes   ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE pedidos        ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE mov_estoque    ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE despesas       ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE caixa          ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE metas          ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE notificacoes   ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE logs           ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE rotas          ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE horarios       ALTER COLUMN empresa_id SET NOT NULL;
