# Architecture Design: Automation UI & N8n Debug

## 1. Frontend Layout / CSS (O Chat Lateral)

O arquivo responsável pelo bug flutuante é o `src/components/automation/SandboxFloatingCard.tsx`.
Atualmente, ele implementa:
```tsx
const updatePosition = () => {
    setCardStyle({ position: 'fixed', top: ... })
}
```
Isso desestabiliza fora do loop ideal em re-renders do componente pai (`AIAutomationDashboard.tsx`).

**Nova Abordagem (Native CSS Sticky):**
Vamos remover totalmente os ResizesObservers e states de positions do React. Retornaremos uma estrutura HTML simples que aproveita a grade definida no modulo pai, utilizando as utilidades do Tailwind CSS:
```tsx
export function SandboxFloatingCard({ children }: SandboxFloatingCardProps) {
  return (
    <div className="hidden lg:flex flex-col overflow-hidden sticky top-6 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl h-[calc(100vh-8rem)] max-h-[680px]">
      {children}
    </div>
  );
}
```
Isso resolverá permanentemente o "pula pula" da carta na UI e trará ganho de performance, sem necessitar ancoragem no scrollContainerRef.

## 2. React Hooks (Volatilidade de Dados)

No arquivo `src/components/automation/AutomationConfigTab.tsx`, há o seguinte bloco:
```tsx
  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);
```
A propriedade `user` proveniente de `useAuth()` tem sua referência de objeto reconstruída em background pelo Supabase SDK. Precisamos depender de primitivas de comparação direta, alterando para `[user?.id]`.
Como esse componente compartilha tela de formulários cruciais, essa refatoração cessa imediatamente os resets involuntários no estado da UI quando dados chegam do payload lateral de validação de N8N/Chatwoot.

## 3. Backend e Edge Functions (N8n Trigger)

O arquivo `supabase/functions/chatwoot-dispatcher/index.ts` intercepta com maestria as mensagens reais oriundas do Chatwoot (`message_created`). Mas ao emitir a solicitação ao CRM do usuário, ele colide com um impasse:
Ele foi projetado para ler: `const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')`.

Como o sistema evoluiu para multitenancy e permite que o próprio Broker coloque o URL de webhook pessoal na aba UI (`crm_settings.n8n_webhook_url`), injetaremos a leitura da referida URL pelo Client do BD da sessão do dispatcher.

**Lógica Modificada no `chatwoot-dispatcher/index.ts` (Etapa 6 - Send to n8n):**
1. Com o `userId` resolvido, buscar no Supabase: `SELECT n8n_webhook_url FROM crm_settings WHERE user_id = userId`.
2. Se existir configuração lá, use-a.
3. Se o banco voltar nulo, mantenha o Fallback de ler `Deno.env.get('N8N_WEBHOOK_URL')` para preservar integrações antigas de administração global.
4. Execute o fetch de POST.
