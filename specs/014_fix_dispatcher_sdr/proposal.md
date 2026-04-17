# Spec 014 — Correção Dispatcher SDR: Diagnóstico e Redesign

## O Problema Narrado
> "O dispatcher tá todo fudido. No meu número ele tá atendendo como se eu fosse lead. 
> O SDR não segue nenhum workflow. O simulador aciona o assistente admin. 
> Preciso colocar em produção pra vários clientes."

---

## 🔬 DIAGNÓSTICO TÉCNICO COMPLETO

Após analisar **todos** os arquivos envolvidos, identifiquei **4 problemas raiz** que se alimentam uns dos outros. Aqui está o mapa:

### PROBLEMA 1: Admin tratado como Lead
**Onde:** `resolveContext.ts` (linhas 99-142)

O `normalizeTo10Digits()` arranca o 9º dígito do celular brasileiro para comparar com o DB. 
Se seu número estiver salvo no formato diferente (ex: com/sem DDI, com/sem 9), o match falha silenciosamente.
Quando falha: `senderRole = null` → Dispatcher acha que vc é desconhecido → auto-cadastra como Lead → roda pipeline SDR quebrado.

### PROBLEMA 2: O Dispatcher NÃO usa o SDR Builder
**Onde:** `chatwoot-dispatcher/index.ts` (linhas 240-320)

Este é o **bug crítico oculto**. O dispatcher de WhatsApp **NUNCA** chama o `engine-sdr.ts`.
Ele faz: `resolveDeal → buildPrompt → runAgentLoop`.
O `buildPrompt.ts` gera um prompt genérico por conta (persona + stage AI settings do funil CRM), mas ele **não lê a tabela `crm_sdr_workflows`**, e **não executa os nós do grafo** que você desenha no SDR Builder.

O `engine-sdr.ts` existe e funciona — mas só é chamado pelo `ai-assistant/index.ts`, que é a Edge Function do **painel web** (chat interno do CRM), não do WhatsApp.

**Em resumo:** O SDR Builder salva os workflows no banco, mas o pipeline de WhatsApp simplesmente ignora eles.

### PROBLEMA 3: Simulador cai no assistente admin
**Onde:** `SDRSimulator.tsx` → `ai-assistant/index.ts`

O simulador chama `supabase.functions.invoke('ai-assistant')` com `is_simulation: true`.
O `ai-assistant` verifica `isInternal` usando o `userId` do admin logado.
Como você (admin) está logado, `isInternal = true`, e o `is_simulation || !isInternal` é:
- `true || false` = `true` → Tenta SDR... **MAS** o workflow passado é apenas `{ nodes, edges }` sem `name` ou `id`, e se o processamento falha (nó faltando, etc.), ele **cai no fallback do assistente Amorim genérico**.

### PROBLEMA 4: Sem Deal = Sem Workflow
**Onde:** `resolveDeal.ts` (linhas 168-178)

Quando lead diz "Oi", o classifier retorna NULL → Deal não é criado → Não carrega `crm_ai_settings` → Bot responde genérico.

---

## 🗺️ FLUXOGRAMA COMPARATIVO

### Como Está HOJE (Quebrado)

```
WhatsApp (msg chega)
  │
  ▼
[chatwoot-dispatcher/index.ts]
  │
  ├─ resolveContext() → normaliza telefone (bugado)
  │    └─ Admin? → Match falha → trata como lead
  │
  ├─ senderRole == 'admin'? → processAdminLogic() → ai-assistant (admin chat)
  │                            ✅ Funciona (mas só pro admin real)
  │
  ├─ senderRole != 'admin' (lead/cliente):
  │    ├─ resolveDeal() → classifyLeadWithAI()
  │    │    └─ Lead só disse "Oi" → IA retorna NULL → Deal NÃO criado
  │    │
  │    ├─ buildPrompt() → Gera prompt GENÉRICO hardcoded
  │    │    └─ ⛔ NÃO lê crm_sdr_workflows!
  │    │    └─ ⛔ NÃO executa engine-sdr!
  │    │
  │    └─ runAgentLoop() → Responde com prompt genérico
  │         └─ Resultado: Bot "órfão", sem workflow
  │
  [SDR Builder UI]
    │
    └─ Salva no banco (crm_sdr_workflows) ✅
    └─ "Testar no Simulador" → chama ai-assistant/index.ts
         ├─ admin logado → isInternal=true
         ├─ is_simulation=true → tenta processSDRFlow()
         └─ Se falha → cai no assistente Amorim (admin) ⛔
```

### Como DEVE SER (Corrigido)

```
WhatsApp (msg chega)
  │
  ▼
[chatwoot-dispatcher/index.ts]
  │
  ├─ resolveContext() → normaliza telefone (CORRIGIDO - flexível 10/11)
  │    └─ Admin? → Match resiliente → admin confirmado
  │
  ├─ senderRole == 'admin'? (SEM modo teste ativo)
  │    └─ processAdminLogic() → ai-assistant → ✅ OK
  │
  ├─ senderRole != 'admin' OU admin em modo /teste:
  │    │
  │    ├── 🆕 STEP 1: Buscar workflow SDR ativo no crm_sdr_workflows
  │    │    └─ Existe workflow com is_active=true?
  │    │         │
  │    │         ├─ SIM → Verificar trigger_config do workflow
  │    │         │    ├─ target_audience match? (Todos / Somente Clientes / Somente Desconhecidos)
  │    │         │    ├─ stage_rule match? (Qualquer Etapa / Fora de Funil / etc)
  │    │         │    └─ Match? → 🆕 Executar processSDRFlow() diretamente no dispatcher
  │    │         │         └─ Motor percorre grafo: mensagens, decisões, ações, escalate
  │    │         │         └─ Resposta gerada pelo workflow → envia via Chatwoot
  │    │         │
  │    │         └─ NÃO → Fallback para "Triagem Inteligente"
  │    │
  │    ├── STEP 2: Se não há workflow mas há deal com crm_ai_settings
  │    │    └─ Usa buildPrompt + agentLoop como hoje (funciona pra etapas configuradas)
  │    │
  │    └── STEP 3: Se nada existe (sem workflow, sem deal):
  │         └─ 🆕 MODO TRIAGEM INTELIGENTE (novo)
  │         └─ IA conversa naturalmente pra entender o que a pessoa precisa
  │         └─ Quando entende → classifica pipeline + stage + produto
  │         └─ Cria o deal no CRM
  │         └─ Escala pro admin (envia alerta no número configurado)
  │         └─ Responde algo natural ("Já tô encaminhando pro consultor...")
  │         └─ AUTO-MUTE: silencia IA pro cliente até admin intervir
  │
  [SDR Builder UI]
    └─ "Testar no Simulador" → chama ai-assistant com is_simulation=true
         └─ 🆕 Forçar rota SDR, NUNCA cair no assistente admin
         └─ Workflow passado inline → processSDRFlow() → resposta
```

---

## 📋 PROPOSTA DE IMPLEMENTAÇÃO

### Fase 1: Corrigir Detecção de Admin (resolveContext.ts)
- Reescrever `normalizeTo10Digits` para comparar **tanto 10 quanto 11 dígitos** em ambos os lados (DB e sender)
- Adicionar log detalhado quando match falha para diagnóstico futuro
- Limpar cliente-fantasma do admin no banco (query direta)

### Fase 2: Integrar SDR Engine no Dispatcher (CRÍTICO)
**O coração da correção:** O dispatcher de WhatsApp precisa chamar `processSDRFlow()`.

Em `chatwoot-dispatcher/index.ts`, ANTES do `buildPrompt + runAgentLoop` para clientes:
1. Importar `getActiveSDRWorkflow` e `processSDRFlow` do `engine-sdr.ts` (adaptado para imports do dispatcher)
2. Buscar o workflow ativo do user no `crm_sdr_workflows`
3. Verificar se o `trigger_config` do workflow "matcheia" o contexto atual (público-alvo, regra de etapa)
4. Se match → executar `processSDRFlow()` → responder via Chatwoot → done
5. Se não match → continuar com o fluxo antigo (buildPrompt)

### Fase 3: Corrigir Simulador  
Em `ai-assistant/index.ts`:
- No bloco de simulação (`is_simulation`), garantir que workflow_data sempre tenha `name` e `id` mínimos
- Se `processSDRFlow` retornar null (fim de fluxo), retornar mensagem clara em vez de cair no assistente admin
- **Nunca** deixar simulação bater na rota do assistente Amorim

### Fase 4: Modo "Triagem Inteligente" — Fallback sem Workflow (NOVO)

Quando **não existe workflow SDR ativo** e **não existe deal aberto**, a IA entra em modo de triagem:

**Comportamento:**
1. **Conversa natural**: A IA responde de forma humana, leve, sem scripts forçados. Tenta entender o que a pessoa precisa genuinamente — "Olá! Em que posso te ajudar?" / "Qual tipo de seguro você tá buscando?"
2. **Qualificação orgânica**: Conforme a pessoa vai respondendo, a IA identifica:
   - Qual **pipeline/funil** se encaixa (auto, residencial, vida, etc.)
   - Qual **etapa** (entrada/qualificação)
   - Qual **produto** (se mencionado)
3. **Criação no CRM**: Quando identifica, cria o Deal automaticamente no pipeline+stage correto, com produto vinculado
4. **Escalação natural**: Envia alerta pro admin (número `admin_alert_phone` da brokerage) com contexto: "Novo lead: Maria, quer seguro auto, já cadastrado no funil X"
5. **Resposta de transição natural**: A IA responde algo contextual ao que a pessoa pediu — se pediu cotação de auto: "Legal, vou verificar as melhores opções pra você! Um dos nossos consultores já vai te atender 😊" — NÃO um genérico "estou verificando"
6. **Auto-Mute + Sincronia Chatwoot**: Depois de escalar, seta `ai_muted_until = '9999-12-31'` no banco e **aplica a etiqueta "off" (ou "bot-off") na conversa do Chatwoot**.
7. **Detecção de Etiqueta**: Se qualquer mensagem nova chegar do Chatwoot e a conversa possuir a etiqueta "off", a IA aborta o processamento na hora, respeitando o comando humano aplicado via Chatwoot.
   A IA fica silenciada para esse cliente até o admin retirar a etiqueta ou desmutar manualmente via CRM.

**Implementação técnica:**
- Novo módulo `triageHandler.ts` no dispatcher que usa o LLM com prompt específico de triagem
- O prompt de triagem inclui a lista de pipelines/stages/produtos disponíveis (igual o `classifyLeadWithAI` faz, mas integrado numa conversa multi-turn)
- Após cada mensagem, o LLM retorna `{ response: "...", classification: null | { pipeline_id, stage_id, product_id } }`
- Quando `classification != null` → cria deal, escala, muta, encerra triagem
- Usa a coluna `ai_muted_until` já existente no `crm_clients` (setando `NULL` para mute permanente ou uma data futura)

### Fase 5: Validação de Gatilho Único (UI)
- Em `SDRBuilder.tsx`, no `handleSave`: ao ativar um workflow, desativar automaticamente outro com mesmo `target_audience`
- Toast informativo para o admin

### Fase 6: Deploy e Teste
- `supabase functions deploy chatwoot-dispatcher`
- `supabase functions deploy ai-assistant`
- Testar via WhatsApp real com o número do admin (deve reconhecer como admin)
- Testar com número desconhecido + sem workflow → deve entrar em triagem, escalar, e mutar
- Testar com número desconhecido + com workflow → deve acionar SDR workflow
- Testar simulador (deve seguir o grafo sem vazar pro assistente)

---

## ✅ DECISÕES CONFIRMADAS

1. **Prioridade de roteamento:** 
   - Workflow SDR ativo ganha pra leads novos/sem deal
   - Deal com stage settings ganha pra quem já tá no funil
   - Sem nenhum dos dois → Triagem Inteligente

2. **Gatilho único por cenário:** Auto-desativar workflow anterior quando ativar outro com mesmo público-alvo (1 ativo por audiência)

3. **Multi-tenant:** Manter filtro por `user_id`. Cada corretora tem seus workflows independentes.

4. **Sem workflow = Triagem + Escalação + Auto-Mute:** A IA qualifica naturalmente, cria o deal, avisa o admin, e silencia até segunda ordem.

---

## 📊 Impacto

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `resolveContext.ts` | Fix normalização de telefone |
| `chatwoot-dispatcher/index.ts` | Integração SDR engine + roteamento para triagem |
| `resolveDeal.ts` | Fallback para pipeline default |
| `ai-assistant/index.ts` | Fix simulador (não vazar pro admin) |
| `SDRBuilder.tsx` | Validação de gatilho único (UI) |
**Nenhuma tabela nova.** Usa tudo que já existe (`crm_sdr_workflows`, `crm_ai_settings`, `crm_pipelines`).
