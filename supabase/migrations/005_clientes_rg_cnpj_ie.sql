-- ================================================================
-- FLUXY — Migration 005: Adicionar rg, cnpj e ie em clientes
--
-- O formulário de clientes coleta RG, CNPJ e Inscrição Estadual,
-- mas a tabela 'clientes' (migration 001) não tinha essas colunas.
-- Sem esta migration, os dados são descartados silenciosamente no INSERT.
--
-- Idempotente (IF NOT EXISTS) — seguro rodar mais de uma vez.
-- EXECUTAR APÓS: 001 → 002 → 003 → 004
-- ================================================================

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS rg   TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS ie   TEXT;

-- Índice para busca por CNPJ (clientes pessoa jurídica)
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes (cnpj)
  WHERE cnpj IS NOT NULL;

COMMENT ON COLUMN clientes.rg   IS 'Registro Geral (documento de identidade)';
COMMENT ON COLUMN clientes.cnpj IS 'CNPJ — clientes pessoa jurídica';
COMMENT ON COLUMN clientes.ie   IS 'Inscrição Estadual — clientes pessoa jurídica';
