# Checklist de Tarefas: Security Hardening

Este checklist garante que a implementação das correções de segurança aconteça de forma ordenada e validável.

- [ ] **1. Rotação de Credenciais (Crítico):**
  - [ ] Acessar configurações de API do projeto no Supabase e realizar "Roll Secret" da JWT Secret.
  - [ ] Atualizar as chaves em `.env` do frontend e reiniciar a aplicação local.
- [ ] **2. Refatoração de Buckets e Arquivos Privados:**
  - [ ] Garantir `public = false` no bucket de recibos financeiros.
  - [ ] Alterar RLS de `storage.objects` limitando `SELECT` ao `owner`.
  - [ ] Refatorar os componentes React que exibem recibos (usar `createSignedUrl` no lugar de `getPublicUrl`).
- [ ] **3. Refatoração do Banco (SQL):**
  - [ ] Aplicar migração `security_fixes.sql` no banco de dados.
  - [ ] Validar conversão das senhas em texto puro do portal usando `pgcrypto`.
  - [ ] Atualizar política RLS da tabela de histórico de chat administrativo.
  - [ ] Recriar `Views` que necessitam de `WITH (security_invoker = true)`.
  - [ ] Modificar funções RPC marcadas como `SECURITY DEFINER` adicionando `SET search_path = public`.
- [ ] **4. Proteção de Edge Functions:**
  - [ ] Alterar `supabase/config.toml` habilitando `verify_jwt = true` em todas as funções internas/conectadas ao cliente.
  - [ ] Em `chatwoot-webhook`, implementar validação obrigatória da assinatura HMAC no header da request.
- [ ] **5. Configurações Secundárias e Upgrades:**
  - [ ] Rodar `npm audit fix` para tratar as vulnerabilidades de dependências do Node/React.
  - [ ] Modificar tempo de validade do OTP do Supabase Auth para um valor seguro (ex: 15 minutos).
  - [ ] Habilitar "Leaked Password Protection" nas opções do Supabase Auth.
- [ ] **6. Validação e Deploy:**
  - [ ] Executar bateria de testes manuais: Login, Envio de Arquivos, Chat Administrativo.
  - [ ] Fazer commit de todas as alterações (`config.toml`, código UI, migrações SQL).
  - [ ] Executar deploy do projeto e recarregar o Supabase Security Scanner para verificar zeramento dos alertas.
