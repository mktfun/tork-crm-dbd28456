# Execução: Correções da UI de Automação e N8n

- [ ] 1. Em `src/components/automation/SandboxFloatingCard.tsx`: Substituir lógica CSS `position: fixed` por `position: sticky` no Tailwind e remover Listeners/Effects JS desnecessários. Remover o `scrollContainerRef`.
- [ ] 2. Em `src/components/automation/AIAutomationDashboard.tsx`: Remover as passagens de props `scrollContainerRef` para `SandboxFloatingCard`, pois não serão mais usadas.
- [ ] 3. Em `src/components/automation/AutomationConfigTab.tsx`: Modificar array de dependência do `useEffect` de `[user]` para `[user?.id]`.
- [ ] 4. Em `supabase/functions/chatwoot-dispatcher/index.ts`: Inserir lógica para puxar `n8n_webhook_url` da tabela `crm_settings` no banco, em vez de depender apenas do Deno.env global.
- [ ] 5. Rodar linting em todo o frontend (opcional).
- [ ] 6. Fazer o deploy da Edge Function `chatwoot-dispatcher` (`supabase functions deploy chatwoot-dispatcher`).
