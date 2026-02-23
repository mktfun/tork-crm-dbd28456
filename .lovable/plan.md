
# Plano: Login com Senha + Pre-preenchimento dos Wizards — CONCLUÍDO ✅

## Alteração 1: `src/pages/portal/PortalLogin.tsx` ✅
- Adicionado campo `portal_first_access` à interface `ClientMatch`
- Novos estados: `selectedClient`, `needsPassword`, `password`
- `handleLogin()` e `handleConfirmation()` agora direcionam para etapa de senha via `goToPasswordStage()`
- Nova função `handlePasswordSubmit()` com RPC `authenticate_portal_client`
- Redirect: `portal_first_access === true` → onboarding, `false` → home
- UI: bloco condicional de senha com mensagem contextual para primeiro acesso
- Função `completeLogin()` removida (lógica absorvida por `handlePasswordSubmit`)

## Alteração 2: Pre-preenchimento dos Wizards (7 arquivos) ✅
Todos os wizards receberam `useEffect` para ler `sessionStorage('portal_client')`.

| # | Arquivo | Status |
|---|---|---|
| 1 | AutoWizard.tsx | ✅ |
| 2 | ResidentialWizard.tsx | ✅ |
| 3 | LifeWizard.tsx | ✅ |
| 4 | BusinessWizard.tsx | ✅ |
| 5 | TravelWizard.tsx | ✅ |
| 6 | HealthWizard.tsx | ✅ (via saveData) |
| 7 | SmartphoneWizard.tsx | ✅ |
