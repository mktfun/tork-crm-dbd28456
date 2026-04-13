# Proposal: Execução Local do Cérebro (Spec 022)

## Requisitos e User Stories
**O Que o Usuário Quer:**
Corrigir a arquitetura da Spec 021! O modelo do "Consultor Especialista" não deve ficar amarrado às rotinas de Agents no **N8N**.
O raciocínio, o uso de ferramentas, a cruza de dados e a geração do Output Analítico devem acontecer 100% **DENTRO DO APP** (nas Edge Functions locais). O n8n atuará apenar como um carteiro glorificado (ou no máximo, um revisor de envio).

- **Como Vai Funcionar:** 
1. O admin chama `/start` na sessão Batch.
2. Em vez do `admin-dispatcher` embalar o prompt e mandar pro n8n "executar", o Dispatcher chamará internamente a Edge Function **`ai-assistant`** (que já é o robô supremo do CRM, com ferramentas de RAG, DB, etc).
3. A `ai-assistant` receberá todas as "tools" existentes (as mais de 25 tools de busca, inspeção, funil), ativará sua autonomia recursiva (God Mode) no "Modo Consultor Avançado", e mastigará os PDFs cruzando com a base.
4. A *Resposta Analítica Final e Pronta* é gerada pelo Supabase.
5. O Supabase então envia via webhook pro n8n: `{ "consultant_pitch_result": "....texto gerado...", "action": "forward_consultant_pitch" }`.
6. O Node LLM do n8n apenas consumirá isso num prompt dizendo: *"Pegue esta análise e mande pro WhatsApp/Chatwoot no formato correto"*.

## O Que Já Existe e Será Reutilizado
- Edge Function `ai-assistant` com toda sua lógica de Ferramentas Nativas, Contexto Híbrido e Autonomia Recursiva.
- A máquina de coleta e geração do Prompt de Consultor da Spec 021 no `admin-dispatcher`.

## O Que Precisa Ser Mapeado/Conectado
1. Interligar as duas edge functions: Fazer o `admin-dispatcher` invocar (`supabase.functions.invoke()`) a rota da `ai-assistant` passando a "Identidade Especialista" e a documentação acumulada.
2. Aguardar a `ai-assistant` processar (já que o Deno Edge Runtime suporta chamadas em background de longa duração para processBatchSession).
3. Repassar o output final da análise para o `n8nUrl` na etapa final, simplificando radicalmente a responsabilidade do N8N.

## Critérios de Aceite
1. O processo de Análise acontece SEM o N8N ter que chamar ferramentas ou gastar seus tempos de Timeout tentando executar OCR/Mapeamentos do Zero.
2. O sistema herdará nativamente acesso às ferramentas de Kanban, Deals, Policies que o App já tem para cruzar com o OCR das apólices do modo `/analise`.
