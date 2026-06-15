# Fluxy — Sistema de Gestão SaaS

Sistema de gestão completo para doceria, construído com Next.js 15 + Supabase.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Estado:** TanStack Query + Zustand
- **Forms:** React Hook Form + Zod
- **UI:** Radix UI + Lucide Icons + Recharts
- **Deploy:** Vercel

---

## 1. Configurar Supabase

### 1.1 Criar projeto
1. Acesse https://app.supabase.com
2. Clique em **New Project**
3. Escolha um nome, senha e região (preferencialmente `sa-east-1` — São Paulo)

### 1.2 Executar o schema
1. No painel Supabase → **SQL Editor**
2. Copie e execute o conteúdo de `supabase/migrations/001_schema_completo.sql`
3. Aguarde a execução completa

### 1.3 Criar usuário administrador inicial
No SQL Editor, execute:
```sql
-- Criar usuário via Supabase Auth
-- Substitua com e-mail e senha reais
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'admin@suaempresa.com',
  crypt('sua_senha_segura', gen_salt('bf')),
  NOW(), NOW(), NOW()
);

-- Vincular perfil
INSERT INTO usuarios (id, nome, email, perfil, ativo)
SELECT id, 'Administrador', email, 'admin', true
FROM auth.users WHERE email = 'admin@suaempresa.com';
```

Ou use o painel **Authentication → Users → Add User** do Supabase, depois execute:
```sql
INSERT INTO usuarios (id, nome, email, perfil, ativo)
SELECT id, 'Administrador', email, 'admin', true
FROM auth.users WHERE email = 'SEU_EMAIL';
```

### 1.4 Pegar as chaves da API
1. **Settings → API**
2. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Rodar localmente

```bash
# 1. Clonar / entrar na pasta
cd fluxy

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves do Supabase

# 4. Rodar em desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

---

## 3. Deploy na Vercel

### 3.1 Via GitHub (recomendado)
1. Suba o projeto para um repositório GitHub
2. Acesse https://vercel.com → **Add New Project**
3. Importe o repositório
4. Na seção **Environment Variables**, adicione:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://SEU_PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = sua_anon_key
   SUPABASE_SERVICE_ROLE_KEY = sua_service_role_key
   NEXT_PUBLIC_APP_URL = https://seu-dominio.vercel.app
   ```
5. Clique em **Deploy**

### 3.2 Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3.3 Configurar domínio customizado (opcional)
1. Vercel → seu projeto → **Settings → Domains**
2. Adicione seu domínio
3. Configure o DNS conforme instruções

---

## 4. Configurar Supabase Realtime

O realtime já está habilitado nas queries. Para garantir:
1. Supabase → **Database → Replication**
2. Ative `pedidos`, `pagamentos`, `notificacoes` para replicação

---

## 5. Estrutura do Projeto

```
fluxy/
├── supabase/
│   └── migrations/
│       └── 001_schema_completo.sql     # Schema completo
├── src/
│   ├── app/
│   │   ├── login/page.tsx              # Tela de login
│   │   ├── dashboard/                  # Dashboard principal
│   │   ├── pedidos/                    # Gestão de pedidos
│   │   ├── kanban/                     # Kanban de produção
│   │   ├── clientes/                   # Gestão de clientes
│   │   ├── produtos/                   # Catálogo de produtos
│   │   ├── estoque/                    # Controle de estoque
│   │   ├── financeiro/                 # Financeiro e pendências
│   │   ├── caixa/                      # Controle de caixa
│   │   ├── entregas/                   # Tela do entregador
│   │   ├── rotas/                      # Disponibilidade
│   │   ├── vendedores/                 # Gestão de vendedores
│   │   ├── entregadores/               # Gestão de entregadores
│   │   ├── metas/                      # Metas (geral/vendedor/entregador)
│   │   ├── comissoes/                  # Comissões
│   │   ├── logs/                       # Auditoria
│   │   └── config/                     # Configurações
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── modals/                     # Modais de CRUD
│   │   └── ui/                         # Componentes base
│   ├── hooks/
│   │   └── usePedidos.ts               # Hooks com TanStack Query
│   ├── lib/
│   │   ├── supabase.ts                 # Cliente Supabase
│   │   └── utils.ts                    # Utilitários
│   ├── store/
│   │   └── index.ts                    # Zustand store
│   └── types/
│       └── index.ts                    # TypeScript types
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

---

## 6. Perfis de Acesso

| Perfil      | Acesso |
|-------------|--------|
| admin       | Total — todos os módulos |
| vendedor    | Pedidos, Clientes, Estoque (leitura), Rotas, Metas |
| entregador  | Apenas tela de Entregas |

---

## 7. Funcionalidades Realtime

Com Supabase Realtime, os seguintes dados são atualizados automaticamente em todos os dispositivos conectados:

- ✅ Pedidos (criação, atualização de status)
- ✅ Kanban (mudança de coluna)
- ✅ Dashboard (métricas)
- ✅ Notificações

Exemplo de fluxo:
1. Vendedor cria pedido no celular
2. Pedido salvo no Supabase (PostgreSQL)
3. Administrador vê o pedido aparecer no Kanban em tempo real
4. Entregador recebe notificação quando pedido vai para Pronto Entrega

---

## 8. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (somente server) |
| `NEXT_PUBLIC_APP_URL` | URL da aplicação em produção |
