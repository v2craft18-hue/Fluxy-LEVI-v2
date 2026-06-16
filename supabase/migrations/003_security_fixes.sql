-- ================================================================
-- FLUXY — Correções de Segurança (003)
-- Resultado da auditoria final Multi-Tenant
-- EXECUTE APÓS: 001 e 002
-- ================================================================
-- CORREÇÕES v3 (esta versão):
--   • empresa_atual() e perfil_atual() verificam ativo = TRUE (já na 002)
--   • Triggers para garantir empresa_id em logs e notificacoes
--   • Validação de integridade multi-tenant em pedidos
--   • vw_metricas_dia com data_pedido (coluna renomeada na 001)
--   • rota_clientes com empresa_id + trigger + policy atualizada
--   • WITH CHECK adicionado em policy mt_rota_clientes_all
-- ================================================================

-- ================================================================
-- FIX 1 — empresa_atual() mais robusta (verifica ativo)
-- Redefine a versão da 002 para garantir consistência
-- ================================================================

CREATE OR REPLACE FUNCTION empresa_atual()
RETURNS UUID AS $$
  SELECT empresa_id
  FROM usuarios
  WHERE id    = auth.uid()
    AND ativo = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================================
-- FIX 2 — perfil_atual() também verifica ativo
-- ================================================================

CREATE OR REPLACE FUNCTION perfil_atual()
RETURNS perfil_usuario AS $$
  SELECT perfil
  FROM usuarios
  WHERE id    = auth.uid()
    AND ativo = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================================
-- FIX 3 — Trigger para garantir empresa_id em logs
-- ================================================================

CREATE OR REPLACE FUNCTION preencher_empresa_id_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := empresa_atual();
  END IF;
  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'logs: empresa_id não pode ser NULL para usuário %', auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_logs_empresa_id ON logs;
CREATE TRIGGER trg_logs_empresa_id
  BEFORE INSERT ON logs
  FOR EACH ROW EXECUTE FUNCTION preencher_empresa_id_log();

-- ================================================================
-- FIX 4 — Trigger para garantir empresa_id em notificacoes
-- ================================================================

CREATE OR REPLACE FUNCTION preencher_empresa_id_notif()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := empresa_atual();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_empresa_id ON notificacoes;
CREATE TRIGGER trg_notif_empresa_id
  BEFORE INSERT ON notificacoes
  FOR EACH ROW EXECUTE FUNCTION preencher_empresa_id_notif();

-- ================================================================
-- FIX 5 — Validação de integridade multi-tenant em pedidos
-- Impede cliente/vendedor/entregador de empresa diferente
-- ================================================================

CREATE OR REPLACE FUNCTION validar_refs_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cli_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM clientes
      WHERE id = NEW.cli_id AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Cliente % não pertence à empresa %', NEW.cli_id, NEW.empresa_id;
    END IF;
  END IF;

  IF NEW.vend_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM vendedores
      WHERE id = NEW.vend_id AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Vendedor % não pertence à empresa %', NEW.vend_id, NEW.empresa_id;
    END IF;
  END IF;

  IF NEW.ent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM entregadores
      WHERE id = NEW.ent_id AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'Entregador % não pertence à empresa %', NEW.ent_id, NEW.empresa_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_refs_empresa ON pedidos;
CREATE TRIGGER trg_pedido_refs_empresa
  BEFORE INSERT OR UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION validar_refs_pedido();

-- ================================================================
-- FIX 6 — vw_metricas_dia com empresa_id e data_pedido correto
-- FIX: 'data' → 'data_pedido' (renomeada em 001)
-- ================================================================

DROP VIEW IF EXISTS vw_metricas_dia;
CREATE VIEW vw_metricas_dia AS
SELECT
  empresa_id,
  COUNT(*) FILTER (WHERE status != 'cancelado')                 AS total_pedidos,
  COALESCE(SUM(total) FILTER (WHERE status != 'cancelado'), 0)  AS faturamento,
  COALESCE(AVG(total) FILTER (WHERE status != 'cancelado'), 0)  AS ticket_medio
FROM pedidos
WHERE DATE(data_pedido) = CURRENT_DATE
GROUP BY empresa_id;

-- ================================================================
-- FIX 7 — empresa_id em rota_clientes + trigger + policy
-- ================================================================

ALTER TABLE rota_clientes
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rota_clientes_empresa ON rota_clientes(empresa_id);

CREATE OR REPLACE FUNCTION preencher_rota_clientes_empresa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT empresa_id INTO NEW.empresa_id
    FROM rotas
    WHERE id = NEW.rota_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rota_clientes_empresa ON rota_clientes;
CREATE TRIGGER trg_rota_clientes_empresa
  BEFORE INSERT ON rota_clientes
  FOR EACH ROW EXECUTE FUNCTION preencher_rota_clientes_empresa();

-- Atualizar policy: usa empresa_id direto (mais rápido que JOIN)
-- FIX: WITH CHECK adicionado
DROP POLICY IF EXISTS "mt_rota_clientes_all" ON rota_clientes;
CREATE POLICY "mt_rota_clientes_all" ON rota_clientes
  FOR ALL
  USING     (empresa_id = empresa_atual())
  WITH CHECK (empresa_id = empresa_atual());

-- ================================================================
-- FIX 8 — Índice composto para dashboard (performance)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_data_pedido
  ON pedidos(empresa_id, data_pedido DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_status_total
  ON pedidos(empresa_id, status, total);

-- ================================================================
-- FIX 9 — Grant EXECUTE nas funções SECURITY DEFINER para anon/auth
-- Necessário para o Supabase chamar via RPC
-- ================================================================

GRANT EXECUTE ON FUNCTION empresa_atual()             TO authenticated;
GRANT EXECUTE ON FUNCTION perfil_atual()              TO authenticated;
GRANT EXECUTE ON FUNCTION tem_acesso(perfil_usuario[]) TO authenticated;
GRANT EXECUTE ON FUNCTION criar_empresa_com_admin(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION criar_empresa_com_admin(TEXT, TEXT, TEXT, UUID) TO anon;

-- ================================================================
-- VERIFICAÇÃO FINAL
-- Rode no Supabase SQL Editor para confirmar tudo:
-- ================================================================
--
-- SELECT
--   t.tablename,
--   t.rowsecurity                AS rls_habilitado,
--   COUNT(p.policyname)          AS total_policies
-- FROM pg_tables t
-- LEFT JOIN pg_policies p
--   ON p.tablename = t.tablename AND p.schemaname = 'public'
-- WHERE t.schemaname = 'public'
-- GROUP BY t.tablename, t.rowsecurity
-- ORDER BY t.tablename;
--
-- Esperado: todas as tabelas com rls_habilitado = TRUE e policies > 0
--
