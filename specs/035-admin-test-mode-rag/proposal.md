# Proposal: Admin Test Mode & Dynamic RAG de SDR

## Status
Em análise (Pendente de Aprovação)

## Requisitos e Contexto

### Problema / Objetivo
Gestores e produtores da corretora possuem Cargo "Admin" (blindado) e falam com o "Mentor IA". No entanto, precisam auditar o SDR (bot de clientes) para avaliar o atendimento na perspectiva de um cliente real sem depender de números de telefone secundários.
O usuário propõe um comando `/teste` que transmuta o gestor para o papel de Cliente (SDR) temporariamente, captura o feedback do que ele achou e o alimenta como "Diretriz Local" para que a IA aprenda rapidamente baseada nessas críticas, como um RAG dinâmico.

### Solução Proposta
1. **Comando de Teste SDR (`/teste`)**:
   - Dentro de sua inbox no Chatwoot, o gestor enviará `/teste`.
   - Alterna o estado na tabela `admin_test_sessions`.
   - Enquanto o estado for "active", o sistema repassa a mensagem para o N8N (SDR) forcando `senderRole = null`.
   - Ao digitar `/teste` novamente, a sessão pede: "O que achou do atendimento do SDR? Onde devo melhorar?". A avaliação é injetada na base `ai_feedbacks` (type=sdr).
   
2. **Comando de Feedback de Análise (`/feedback`)**:
   - Falando com o Mentor Inteligente (modo administrador normal), o gestor pode mandar: `/feedback <mensagem>`.
   - O comando guarda a mensagem fornecida diretamente na base `ai_feedbacks` (type=mentor).
   - "Ex: /feedback Ao fazer análise de apólices, sempre destaque o valor da franquia primeiro."

3. **Dynamic Feedback Loop (RAG)**:
   - Em `buildPrompt.ts` (SDR), o sistema injeta feedbacks do tipo `sdr`.
   - Em `processAdminLogic.ts` (Mentor AI e `/analise`), o sistema aplica os feedbacks injetando a listagem como System Instruction antes da resposta final.

### Critérios de Aceite
- [ ] `/teste` intercala o SDR e colhe feedback ao sair.
- [ ] `/feedback <msg>` insere aural guidelines para o AI-Mentor.
- [ ] O RAG opera nos dois frontes, lendo as chaves pertinentes pelo `brokerage_id`.
