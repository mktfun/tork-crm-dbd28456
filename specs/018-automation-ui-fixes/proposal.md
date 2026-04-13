# 018 - Automation UI & N8n Diagnostics and Fixes

## 1. Problema

Foram relatados 3 bugs críticos na nova tela de Automação:
1. **Chat Lateral quebrando layout:** A `SandboxFloatingCard` que contém o robô de testes (`AISandbox`) fica "pulando" ou mudando de posição estranhamente na tela enquanto a página rola.
2. **Volatilidade de Configurações:** Ao preencher os campos do Chatwoot ou N8n na aba de Configurações, os inputs são magicamente apagados se o usuário demorar a salvar ou se clicar no botão de teste de webhooks.
3. **Falha silenciosa de webhook no n8n:** O usuário consegue testar a conexão com o n8n usando o botão nativo da tela de config (`test-n8n-webhook`), confirmando que o dado chega lá. No entanto, quando ele tenta engatilhar o fluxo autêntico respondendo uma conversa do Chatwoot real (passando pelo CRM), o Payload nunca chega no N8n.

## 2. Diagnóstico

- **(Bug 1) Hover e Layout Tracking:** O componente `SandboxFloatingCard.tsx` usa uma mecânica manual (`position: fixed` atrelada a eventos de ResizeObserver e scrollContainerRef) para tentar flutuar dentro de uma Grid de colunas. Isso frequentemente fica fora de sync. A resolução natural é substituir por CSS puro (`position: sticky`).
- **(Bug 2) Disparador de Limpeza de Form:** O componente `AutomationConfigTab.tsx` usa `useEffect(() => { fetchSettings() }, [user])`. O objeto `user` recebido de `useAuth` muda de referência em segundo plano durante a navegação, disparo de requests paralelos ou interações do Supabase, forçando um novo `fetchSettings()`. E já que os dados que o usuário recém digitou ainda não haviam se consolidado no Banco, o Formulaire repassa o estado Vazio do BD por cima da tela atual do cliente. A solução é mudar a matriz de dependência para `[user?.id]`.
- **(Bug 3) Edge Function com Vias Diferentes:** O recurso de teste usa a Edge Function `test-n8n-webhook`, que lê inteligentemente o campo `n8n_webhook_url` que vem do request (que a UI manda). Mas a execução **real**, que vem do webhook engatilhado pelo Chatwoot no dia-a-dia, viaja pela Edge Function `chatwoot-dispatcher`.
O dispatcher original lê uma Environment Variable chumbada (`Deno.env.get('N8N_WEBHOOK_URL')`). Ele é cego para a configuração que o usuário fez em `crm_settings`. E como essa chave pode estar vazia ou morta para esse escopo de organização, o payload não é roteado.

## 3. Impacto e Riscos
A aplicação dessas correções não apaga dados das tabelas, mas modifica funções essenciais (Dispatcher) que processam a entrada multicanais. Essa spec requer deploy (`supabase functions deploy chatwoot-dispatcher`) e compilação do Front.
