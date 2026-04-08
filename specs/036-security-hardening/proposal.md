# Master Spec: 036 Security Hardening & Vulnerability Remediation

## 1. Visão Geral
Este documento detalha o plano de ação para resolver os 17 apontamentos de segurança (7 Erros e 10 Avisos) detectados no Supabase Security Scanner, garantindo a integridade dos dados e o acesso seguro ao CRM Tork. As ações envolvem refatoração de políticas RLS, ajustes de permissões de buckets, ativação de verificação JWT nas Edge Functions e criptografia de senhas.

## 2. Requisitos e Oportunidades
- **R1:** Bloquear leitura pública do histórico de chat administrativo (vazamento de números de telefone).
- **R2:** Bloquear acesso público ao bucket privado de comprovantes financeiros.
- **R3:** Habilitar validação JWT em todas as Edge Functions críticas (exceto webhooks externos genuínos).
- **R4:** Criptografar senhas do portal de corretores armazenadas em texto plano (migração para `pgcrypto`).
- **R5:** Atualizar views e funções `SECURITY DEFINER` para garantir controle de acesso (Security Invoker e `search_path`).
- **R6:** Atualizar dependências críticas do Node.js/React (`npm audit`).
- **R7:** Ajustar configurações do Auth no painel do Supabase (OTP expiry, Leaked Password Protection).
- **R8:** Restringir permissões de RLS que estão como "Always True".

## 3. BDD Scenarios

### Cenário: Bloqueio de leitura pública no chat administrativo
- **Given (Dado):** que a tabela de histórico de chat não possui RLS restritivo
- **When (Quando):** um usuário anônimo ou sem privilégios tenta ler a tabela
- **Then (Então):** a consulta deve retornar 0 resultados e bloquear o acesso aos números de telefone

### Cenário: Proteção de comprovantes financeiros (Storage)
- **Given (Dado):** que existe um bucket privado para recebimentos financeiros
- **When (Quando):** alguém acessa a URL pública de um arquivo desse bucket
- **Then (Então):** o Supabase deve retornar um erro HTTP 403/404, permitindo apenas download via URL assinada para usuários autenticados e autorizados

### Cenário: Execução segura de Edge Functions
- **Given (Dado):** que funções como `admin-dispatcher` e `analyze-policy` estão com `verify_jwt = false`
- **When (Quando):** uma requisição POST é feita sem o header `Authorization: Bearer <token>`
- **Then (Então):** a Edge Function deve ser bloqueada na camada do Kong (Gateway) retornando 401 Unauthorized

### Cenário: Criptografia de senhas do portal
- **Given (Dado):** que uma nova senha de portal é gerada ou atualizada
- **When (Quando):** o registro é salvo no banco de dados
- **Then (Então):** a senha deve ser armazenada usando um hash bcrypt (`crypt(senha, gen_salt('bf'))`), e não pode ser legível por administradores de banco de dados
