<!-- SUPABASE SETUP -->

# Setup de Variáveis de Ambiente - Fluxy LEVI v2

## 1️⃣ Variáveis Obrigatórias (Supabase)

Para que a aplicação funcione, você **DEVE** configurar as seguintes variáveis de ambiente no Vercel:

### Public Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### Secret Environment Variables
```
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
```

## 2️⃣ Onde Encontrar Essas Chaves?

1. Acesse sua conta no [Supabase](https://supabase.com)
2. Abra seu projeto
3. Vá para **Settings → API** (no menu lateral)
4. Você encontrará:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## 3️⃣ Como Adicionar no Vercel

1. Acesse seu projeto no [Vercel](https://vercel.com)
2. Vá para **Settings → Environment Variables**
3. Adicione cada variável:
   - As que começam com `NEXT_PUBLIC_` são públicas
   - As outras são secretas (não aparecem no client)
4. Clique em **Save** e faça **redeploy**

## 4️⃣ Verificar Se Está Correto

- ✅ Sem essas variáveis, você verá: `"Your project's URL and Key are required to create a Supabase client!"`
- ✅ Se configuradas corretamente, a tela branca desaparecerá
- ✅ Você será redirecionado para `/login` automaticamente

## 5️⃣ Erro React #418 (Hydration Mismatch)

Esse erro foi **CORRIGIDO** nesta versão. Se ainda aparecer:

1. Limpe o cache do navegador (Ctrl+Shift+Delete ou Cmd+Shift+Delete)
2. Faça um hard refresh (Ctrl+F5 ou Cmd+Shift+R)
3. Se persistir, force redeploy no Vercel

## 📋 Checklist de Deploy

- [ ] Variáveis de ambiente adicionadas no Vercel
- [ ] Projeto redeploy (não basta fazer git push)
- [ ] Cache do navegador limpo
- [ ] Acesso ao `/login` sem tela branca
- [ ] Sem erros no console

---

**Dúvidas?** Verifique os logs no Vercel: Settings → Logs
