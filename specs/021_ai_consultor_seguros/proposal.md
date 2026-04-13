# Proposta Consultor Analítico (Spec 021)

## Requisitos e User Stories
**O Que o Usuário Quer:**
Transformar a atual funcionalidade de `/analise` do WhatsApp (exclusiva para Admins) em um **Especialista em Seguros de Alto Padrão (Consultor Analítico)**.
Em vez de um assistente genérico, o admin enviará PDFs e apólices no modo `/analise`, enviará `/start`, e o sistema processará essas apólices (usando o OCR embutido), submetendo os dados para uma IA especializada, que cuspirá um " Pitch de Vendas Consultivo e Desconstrução da Apólice Atual".

**Como a Arquitetura Requisitada Funciona:**
1. O admin usa o comando `/analise` no Whatsapp (já mapeado no `admin-dispatcher`).
2. O admin sobe as apólices em PDF/Imagem.
3. Dá `/start`.
4. O app (Supabase Edge Functions) processa o OCR localmente.
5. Em vez de simplesmente mandar os fragmentos para o atual agente de n8n processar vagamente, **aqui acontece a mágica:** O Edge Function do Chatwoot gera o *System Prompt Consultivo Master* (que contém o mapa lógico estrito, os perfis "Pai de Família/Jovem Empresário", as regras de Down-Selling e SPIN Selling).
6. A execução desse prompt é enviada como um "pacote de análise estratégica" para o N8N. O agente no n8n usará as tools configuradas (como `Buscar_Cotacoes_Atuais`, `Consultar_Rank`) para cruzar os dados da apólice recém-lidą com o banco de cotações, e então disparará o texto perfeito para o consultor do CRM.

## O Que Já Existe e Será Reutilizado
- A infraestrutura do **`admin-dispatcher`**: O comando `/analise`, agrupamento em lotes (`ai_analysis_sessions`), chamadas de OCR (`extract-document`) e a rota para o n8n já existem.
- O campo `client_context`: O CRM sabe quem é o admin e os leads/contatos associados.

## O Que Precisa Ser Criado/Modificado
1. **Novo Construtor de Prompt (System Prompt Enginnering):**
   Criar uma função separada `buildConsultantSystemPrompt.ts` (ou acoplar no atual com uma condição de `SessionMode`) que injete EXATAMENTE a master-spec solicitada:
   * **Identidade**: Consultor Especialista em Backoffice.
   * **Objetivo**: Fornecer ao humano as falhas (exclusões, coberturas vitais ausentes, perfilamento).
   * **Procedimento Estrito**: Quebra-Gelo Educativo, Desconstrução, Análise Rank vs Preço, SPIN selling, Gatilho da Perda.
   
2. **Definição Clara no N8N (Design de Saída):**
   O `admin-dispatcher` empacotará a instrução dizendo ao webhook do n8n: *"Isto é um Payload Consultivo. A aja como o consultor, use suas ferramentas de cotações e envie a análise pronta para o vendedor usar com o cliente."*

## Critérios de Aceite
1. O fluxo de Análise Lote (`/analise` + PDFs + `/start`) do Admin nunca mais responde um texto robótico genérico e sim uma "Trilha de Venda" (Pitch).
2. O prompt garantirá as restrições (SEM jargões complexos, SEM venda casada, SEM ataques absurdos a concorrência).
3. O modelo no N8N absorverá esse novo System Prompt sem quebrar os outros modos operacionais do Admin (como `/relatorio` ou conversa normal).
