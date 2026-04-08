# Design Document: Security Hardening

## 1. Arquitetura de Correções

As correções seguirão o princípio do "Least Privilege" (Menor Privilégio Possível) e "Defense in Depth" (Defesa em Profundidade). As alterações não quebrarão a interface do usuário (UI), mas garantirão que o backend (Supabase) responda de forma segura, evitando vazamento de dados.

### 1.1 Supabase RLS (Row Level Security)
- Nenhuma tabela poderá ter políticas com `USING (true)` para regras de SELECT.
- A tabela de **chat de administrador** será restrita pelo `auth.uid() = user_id` e, possivelmente, uma checagem de role de administrador (ex: através da view ou tabela auxiliar).

### 1.2 Storage (Buckets)
- O bucket de recibos financeiros terá a flag `public: false` garantida.
- Políticas no bucket (`storage.objects`) validarão `auth.uid() = owner` (ou similar atrelado à tabela financeira).
- Downloads na UI passarão a usar o método `createSignedUrl` em vez de `getPublicUrl`.

### 1.3 Edge Functions (`supabase/config.toml`)
- Funções internas usadas pelo CRM (ex: `admin-dispatcher`, `analyze-policy`, `generate-summary`) terão a tag `verify_jwt = true`.
- Funções de webhook puras (ex: `chatwoot-webhook`) manterão `verify_jwt = false`, mas incluirão verificação forte criptográfica do HMAC/assinatura de payload no corpo do código.

### 1.4 Banco de Dados e Criptografia
- Uma migração SQL utilizará a extensão `pgcrypto`.
- Uma função de hash será criada (ou ativada) para ofuscar senhas antigas do portal em texto puro e proteger senhas futuras na tabela de autenticação de usuários do portal.

### 1.5 Security Definer & Search Path
- Funções antigas declaradas como `SECURITY DEFINER` receberão `SET search_path = public` ao final de sua declaração para impedir exploits de schema hijacking.
- Views problemáticas serão recriadas utilizando o novo padrão Postgres 15+ `WITH (security_invoker = true)` para obedecer ao RLS dinamicamente.
