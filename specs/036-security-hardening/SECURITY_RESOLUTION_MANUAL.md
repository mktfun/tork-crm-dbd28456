# Manual de Resolução: Vulnerabilidades Supabase

Este documento é um guia passo a passo seguro para corrigir as 17 vulnerabilidades apontadas pelo Supabase Security Scanner sem quebrar funcionalidades em produção.

## ⚠️ AVISO IMPORTANTE: CHAVES VAZADAS
Foi detectado o compartilhamento da chave JWT do tipo `service_role` (suposta "anon key").
**AÇÃO IMEDIATA REQUERIDA:**
1. Acesse o painel do seu projeto no Supabase: `jaouwhckqqnaxqyfvgyq`.
2. Navegue até **Project Settings > API**.
3. Clique em "Roll (rotate) secret" para a sua `JWT Secret` e/ou chaves de API.
4. Atualize a nova `anon_key` e `service_role_key` em suas variáveis de ambiente (`.env`).
5. **NUNCA** compartilhe chaves de `service_role` ou o `JWT Secret` na internet, em prompts de IA ou código aberto (GitHub).

---

## Passo a Passo para Correção (Database & Backend)

### 1. Histórico de Chat e Bucket de Finanças Públicos (Erro Crítico)
**O problema:** Dados pessoais e comprovantes podem ser lidos sem login.
**A Solução Segura:**
1. Abra o arquivo SQL gerado em `specs/036-security-hardening/security_fixes.sql`.
2. Adapte os comandos `DROP POLICY` e `CREATE POLICY` substituindo `chat_messages` pelos nomes reais do seu banco.
3. Garanta que a sua tabela relacione as mensagens com o UUID do usuário logado (coluna `user_id` vinculada à `auth.users`).
4. Para o Bucket, no painel do Supabase, vá em **Storage > financial-receipts > Settings** e desative "Public Bucket".
5. Atualize o seu Frontend (React): Onde antes você usava `supabase.storage.from('...').getPublicUrl()`, troque para `supabase.storage.from('...').createSignedUrl('path', 3600)`.

### 2. Senhas do Portal em Texto Plano (Erro Crítico)
**O problema:** Senhas armazenadas como "123456" permitem roubo de contas imediato em caso de falha no banco.
**A Solução Segura:**
1. Rode o script SQL que adiciona o `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto`).
2. Criptografe senhas antigas usando `crypt(password, gen_salt('bf'))`.
3. Altere o código de Login no portal. Em vez de comparar `password = input`, use: `password = crypt(input, password)`.
4. Altere a função de Cadastro (Insert/Update) para aplicar `crypt(input, gen_salt('bf'))`.

### 3. Edge Functions sem Autenticação (Erro de Acesso)
**O problema:** Edge functions expõem endpoints sem validar se a chamada vem de um usuário legítimo.
**A Solução Segura:**
1. Abra o arquivo `supabase/config.toml`.
2. Para TODAS as funções como `[functions.analyze-policy]`, `[functions.admin-dispatcher]`, mude a linha de `verify_jwt = false` para `verify_jwt = true`.
3. **Exceções:** Mantenha `verify_jwt = false` APENAS para funções de Webhook externo (ex: `chatwoot-webhook`, Stripe Webhooks).
4. Para as exceções, adicione validação de assinatura (HMAC) no corpo da função `index.ts`. Exemplo Chatwoot: Verificar o header `X-Chatwoot-Signature`.

### 4. Security Definer e Views (Avisos de Escalonamento de Privilégios)
**O problema:** Funções que rodam com permissões máximas podem sofrer injeção de schema. Views by-passam RLS.
**A Solução Segura:**
1. Liste suas funções `SECURITY DEFINER` (no painel, Database > Functions).
2. Adicione a cláusula `SET search_path = public` em todas elas.
3. Se você possuir `Views` que não aplicam as regras de RLS do seu usuário atual, você deve recriá-las utilizando a sintaxe `CREATE VIEW nome WITH (security_invoker = true) AS SELECT...`.

### 5. Configurações de Auth & Atualizações de Sistema
**O problema:** Senhas vazadas e validade de código longo permitem Account Takeover.
**A Solução Segura:**
1. Vá em **Authentication > Policies** (ou Settings) no painel do Supabase.
2. Ative a opção **"Leaked Password Protection"**.
3. Reduza a duração de tokens OTP/Magic Links (ex: reduza de 24h/1h para 15 minutos).
4. No servidor Frontend local, rode `npm audit fix --force` ou atualize pacotes listados em alerta pelo scanner para resolver vulnerabilidades críticas de dependências (React/Node).
5. No Supabase Dashboard > Infrastructure, clique em "Upgrade Postgres Version" caso disponível, após backup.

## Validação e Qualidade
Sempre teste as modificações em um ambiente de *Staging* antes de aplicar em produção. O objetivo da Defesa em Profundidade é garantir que, se o React falhar, o Kong (API Gateway) barre na JWT. Se o Kong falhar, o RLS (Database) barra a leitura indevida.
