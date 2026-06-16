-- ================================================================
-- FLUXY — Migration 006: Gestão de Usuários + Perfil
--
-- Adiciona colunas usadas pelas telas /perfil e /usuarios:
--   tel, whatsapp, avatar_url, ultimo_acesso, atualizado_em
-- Cria o bucket de avatares e as policies de storage.
-- Ajusta RLS de usuarios para permitir gestão pelo admin da empresa.
--
-- EXECUTAR APÓS: 001 → 002 → 003 → 004 → 005
-- ================================================================

-- ── 1. Colunas extras em usuarios ───────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS tel           TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN usuarios.tel           IS 'Telefone do usuário';
COMMENT ON COLUMN usuarios.whatsapp      IS 'WhatsApp do usuário';
COMMENT ON COLUMN usuarios.avatar_url    IS 'URL pública da foto de perfil (bucket avatares)';
COMMENT ON COLUMN usuarios.ultimo_acesso IS 'Último login registrado';

-- Trigger para manter atualizado_em em UPDATE
CREATE OR REPLACE FUNCTION set_usuarios_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_atualizado_em ON usuarios;
CREATE TRIGGER trg_usuarios_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_usuarios_atualizado_em();

-- ── 2. RLS de usuarios — gestão pelo admin da empresa ───────────
-- Remove policies antigas (idempotente)
DROP POLICY IF EXISTS "pol_usuarios_select" ON usuarios;
DROP POLICY IF EXISTS "pol_usuarios_insert" ON usuarios;
DROP POLICY IF EXISTS "pol_usuarios_update" ON usuarios;

-- SELECT: ver usuários da própria empresa
CREATE POLICY "pol_usuarios_select" ON usuarios
  FOR SELECT USING (empresa_id = empresa_atual());

-- INSERT: admin cria usuários na própria empresa
-- (a criação real passa pela API com service_role; esta policy cobre
--  inserts diretos feitos no contexto do admin autenticado)
CREATE POLICY "pol_usuarios_insert" ON usuarios
  FOR INSERT WITH CHECK (
    empresa_id = empresa_atual()
    AND (perfil_atual() = 'admin' OR id = auth.uid())
  );

-- UPDATE: admin edita qualquer usuário da empresa; usuário edita a si mesmo
CREATE POLICY "pol_usuarios_update" ON usuarios
  FOR UPDATE
  USING (
    empresa_id = empresa_atual()
    AND (perfil_atual() = 'admin' OR id = auth.uid())
  )
  WITH CHECK (
    empresa_id = empresa_atual()
    AND (perfil_atual() = 'admin' OR id = auth.uid())
  );

-- ── 3. Bucket de avatares ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage para o bucket avatares
DROP POLICY IF EXISTS "avatares_select_publico" ON storage.objects;
DROP POLICY IF EXISTS "avatares_insert_proprio" ON storage.objects;
DROP POLICY IF EXISTS "avatares_update_proprio" ON storage.objects;
DROP POLICY IF EXISTS "avatares_delete_proprio" ON storage.objects;

-- Leitura pública (bucket público)
CREATE POLICY "avatares_select_publico" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatares');

-- Upload: usuário só na própria "pasta" (prefixo = seu uid)
CREATE POLICY "avatares_insert_proprio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatares_update_proprio" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatares_delete_proprio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatares'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
