-- ================================================================
-- FLUXY — Migration 004: Fix RLS Policies para INSERT/UPDATE/DELETE
-- PROBLEMA: "new row violates row-level security policy"
-- CAUSA: As políticas FOR ALL sem WITH CHECK bloqueiam INSERT.
--        Além disso, as policies da 002 usam empresa_atual() que
--        depende de empresa_id no usuário — mas no INSERT de clientes/
--        produtos o RLS verifica WITH CHECK ANTES do trigger que
--        preencheria empresa_id automaticamente.
-- SOLUÇÃO: Garantir WITH CHECK explícito e permitir que triggers
--          preencham empresa_id antes da validação RLS.
-- ================================================================

-- ================================================================
-- PASSO 1: Remover TODAS as policies existentes de forma segura
-- ================================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- ================================================================
-- PASSO 2: Recriar empresa_atual() e perfil_atual() robustos
-- ================================================================
CREATE OR REPLACE FUNCTION empresa_atual()
RETURNS UUID AS $$
  SELECT empresa_id FROM usuarios
  WHERE id = auth.uid() AND ativo = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION perfil_atual()
RETURNS perfil_usuario AS $$
  SELECT perfil FROM usuarios
  WHERE id = auth.uid() AND ativo = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================================
-- PASSO 3: Trigger para preencher empresa_id automaticamente
-- em INSERT antes da validação RLS (via BEFORE trigger)
-- ================================================================
CREATE OR REPLACE FUNCTION auto_fill_empresa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := empresa_atual();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas que precisam de empresa_id
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clientes','vendedores','entregadores','categorias','produtos',
    'ingredientes','pedidos','mov_estoque','despesas','caixa',
    'metas','notificacoes','logs','rotas','horarios','lgpd'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_auto_empresa_%s ON %I;
      CREATE TRIGGER trg_auto_empresa_%s
        BEFORE INSERT ON %I
        FOR EACH ROW EXECUTE FUNCTION auto_fill_empresa_id();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END;
$$;

-- ================================================================
-- PASSO 4: Políticas RLS corretas com WITH CHECK
-- Regra: USING filtra SELECT/UPDATE/DELETE, WITH CHECK valida INSERT/UPDATE
-- ================================================================

-- ── empresas ──
CREATE POLICY "pol_empresas_select" ON empresas
  FOR SELECT USING (id = empresa_atual());
CREATE POLICY "pol_empresas_update" ON empresas
  FOR UPDATE
  USING     (id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (id = empresa_atual() AND perfil_atual() = 'admin');

-- ── usuarios ──
CREATE POLICY "pol_usuarios_select" ON usuarios
  FOR SELECT USING (empresa_id = empresa_atual() OR id = auth.uid());
CREATE POLICY "pol_usuarios_insert" ON usuarios
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_usuarios_update" ON usuarios
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND (perfil_atual() = 'admin' OR id = auth.uid()))
  WITH CHECK (empresa_id = empresa_atual() AND (perfil_atual() = 'admin' OR id = auth.uid()));

-- ── clientes ──
CREATE POLICY "pol_clientes_select" ON clientes
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_clientes_insert" ON clientes
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_clientes_update" ON clientes
  FOR UPDATE
  USING     (empresa_id = empresa_atual())
  WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_clientes_delete" ON clientes
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── vendedores ──
CREATE POLICY "pol_vendedores_select" ON vendedores
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_vendedores_insert" ON vendedores
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_vendedores_update" ON vendedores
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_vendedores_delete" ON vendedores
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── entregadores ──
CREATE POLICY "pol_entregadores_select" ON entregadores
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_entregadores_insert" ON entregadores
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_entregadores_update" ON entregadores
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_entregadores_delete" ON entregadores
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── categorias ──
CREATE POLICY "pol_categorias_select" ON categorias
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_categorias_insert" ON categorias
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_categorias_update" ON categorias
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_categorias_delete" ON categorias
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── produtos ──
CREATE POLICY "pol_produtos_select" ON produtos
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_produtos_insert" ON produtos
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_produtos_update" ON produtos
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── ingredientes ──
CREATE POLICY "pol_ingredientes_select" ON ingredientes
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_ingredientes_insert" ON ingredientes
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_ingredientes_update" ON ingredientes
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── receitas (via produto) ──
CREATE POLICY "pol_receitas_select" ON receitas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM produtos p WHERE p.id = receitas.prod_id AND p.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_receitas_insert" ON receitas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM produtos p WHERE p.id = receitas.prod_id AND p.empresa_id = empresa_atual())
    AND perfil_atual() = 'admin'
  );
CREATE POLICY "pol_receitas_delete" ON receitas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM produtos p WHERE p.id = receitas.prod_id AND p.empresa_id = empresa_atual())
    AND perfil_atual() = 'admin'
  );

-- ── pedidos ──
CREATE POLICY "pol_pedidos_select" ON pedidos
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_pedidos_insert" ON pedidos
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_pedidos_update" ON pedidos
  FOR UPDATE
  USING     (empresa_id = empresa_atual())
  WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_pedidos_delete" ON pedidos
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── pedido_itens (via pedido) ──
CREATE POLICY "pol_pedido_itens_select" ON pedido_itens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_itens.ped_id AND p.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_pedido_itens_insert" ON pedido_itens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_itens.ped_id AND p.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_pedido_itens_update" ON pedido_itens
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_itens.ped_id AND p.empresa_id = empresa_atual()))
  WITH CHECK (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_itens.ped_id AND p.empresa_id = empresa_atual()));
CREATE POLICY "pol_pedido_itens_delete" ON pedido_itens
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_itens.ped_id AND p.empresa_id = empresa_atual())
  );

-- ── pagamentos (via pedido) ──
CREATE POLICY "pol_pagamentos_select" ON pagamentos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pagamentos.ped_id AND p.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_pagamentos_insert" ON pagamentos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pagamentos.ped_id AND p.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_pagamentos_update" ON pagamentos
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pagamentos.ped_id AND p.empresa_id = empresa_atual()))
  WITH CHECK (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pagamentos.ped_id AND p.empresa_id = empresa_atual()));

-- ── mov_estoque ──
CREATE POLICY "pol_mov_estoque_select" ON mov_estoque
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_mov_estoque_insert" ON mov_estoque
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_mov_estoque_update" ON mov_estoque
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── despesas ──
CREATE POLICY "pol_despesas_select" ON despesas
  FOR SELECT USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_despesas_insert" ON despesas
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_despesas_update" ON despesas
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_despesas_delete" ON despesas
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── caixa ──
CREATE POLICY "pol_caixa_select" ON caixa
  FOR SELECT USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_caixa_insert" ON caixa
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_caixa_update" ON caixa
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── metas ──
CREATE POLICY "pol_metas_select" ON metas
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_metas_insert" ON metas
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_metas_update" ON metas
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_metas_delete" ON metas
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── comissoes (via vendedor) ──
CREATE POLICY "pol_comissoes_select" ON comissoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendedores v WHERE v.id = comissoes.vend_id AND v.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_comissoes_insert" ON comissoes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM vendedores v WHERE v.id = comissoes.vend_id AND v.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_comissoes_update" ON comissoes
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM vendedores v WHERE v.id = comissoes.vend_id AND v.empresa_id = empresa_atual())
    AND perfil_atual() = 'admin'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM vendedores v WHERE v.id = comissoes.vend_id AND v.empresa_id = empresa_atual())
    AND perfil_atual() = 'admin'
  );

-- ── notificacoes ──
CREATE POLICY "pol_notif_select" ON notificacoes
  FOR SELECT USING (empresa_id = empresa_atual() AND (user_id = auth.uid() OR perfil_atual() = 'admin'));
CREATE POLICY "pol_notif_insert" ON notificacoes
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_notif_update" ON notificacoes
  FOR UPDATE
  USING (empresa_id = empresa_atual() AND (user_id = auth.uid() OR perfil_atual() = 'admin'))
  WITH CHECK (empresa_id = empresa_atual() AND (user_id = auth.uid() OR perfil_atual() = 'admin'));

-- ── logs ──
CREATE POLICY "pol_logs_select" ON logs
  FOR SELECT USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_logs_insert" ON logs
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());

-- ── rotas ──
CREATE POLICY "pol_rotas_select" ON rotas
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_rotas_insert" ON rotas
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_rotas_update" ON rotas
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_rotas_delete" ON rotas
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── rota_clientes ──
CREATE POLICY "pol_rota_clientes_select" ON rota_clientes
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_rota_clientes_insert" ON rota_clientes
  FOR INSERT WITH CHECK (empresa_id = empresa_atual());
CREATE POLICY "pol_rota_clientes_delete" ON rota_clientes
  FOR DELETE USING (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── horarios ──
CREATE POLICY "pol_horarios_select" ON horarios
  FOR SELECT USING (empresa_id = empresa_atual());
CREATE POLICY "pol_horarios_insert" ON horarios
  FOR INSERT WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');
CREATE POLICY "pol_horarios_update" ON horarios
  FOR UPDATE
  USING     (empresa_id = empresa_atual() AND perfil_atual() = 'admin')
  WITH CHECK (empresa_id = empresa_atual() AND perfil_atual() = 'admin');

-- ── lgpd (via cliente) ──
CREATE POLICY "pol_lgpd_select" ON lgpd
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM clientes c WHERE c.id = lgpd.cli_id AND c.empresa_id = empresa_atual())
  );
CREATE POLICY "pol_lgpd_insert" ON lgpd
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM clientes c WHERE c.id = lgpd.cli_id AND c.empresa_id = empresa_atual())
  );

-- ================================================================
-- PASSO 5: Grants para autenticados
-- ================================================================
GRANT EXECUTE ON FUNCTION empresa_atual()                        TO authenticated;
GRANT EXECUTE ON FUNCTION perfil_atual()                         TO authenticated;
GRANT EXECUTE ON FUNCTION criar_empresa_com_admin(TEXT,TEXT,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION criar_empresa_com_admin(TEXT,TEXT,TEXT,UUID) TO anon;

-- ================================================================
-- VERIFICAÇÃO: execute para confirmar
-- SELECT tablename, COUNT(policyname) as policies
-- FROM pg_policies WHERE schemaname = 'public'
-- GROUP BY tablename ORDER BY tablename;
-- ================================================================
