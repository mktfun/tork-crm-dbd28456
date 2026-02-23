
# Plano: Login com Senha + Pre-preenchimento dos Wizards

## Alteracao 1: `src/pages/portal/PortalLogin.tsx`

### Novos estados
- `selectedClient: ClientMatch | null` (null)
- `needsPassword: boolean` (false)
- `password: string` ('')

### Interface `ClientMatch` — adicionar campo
```typescript
portal_first_access: boolean;  // ja vem da RPC identify_portal_client
```

### Fluxo alterado
1. `handleLogin()` e `handleConfirmation()` deixam de chamar `completeLogin()` diretamente. Ao identificar 1 cliente, fazem:
   ```
   setSelectedClient(client);
   setNeedsPassword(true);
   ```
2. Nova funcao `handlePasswordSubmit()`:
   - Chama RPC `authenticate_portal_client(p_client_id, p_password)`
   - Se `false` → erro "Senha incorreta"
   - Se `true` → salva sessao (incluindo `portal_first_access`) e redireciona:
     - `portal_first_access === true` → `/:slug/portal/onboarding`
     - `portal_first_access === false` → `/:slug/portal/home`
3. Funcao `completeLogin()` e removida (logica absorvida por `handlePasswordSubmit`)

### UI — 3o bloco condicional no JSX
Apos o bloco `needsConfirmation`, adicionar bloco `needsPassword && selectedClient`:
- Mensagem contextual para primeiro acesso ("Senha provisoria: 123456")
- Input type="password" com autoFocus
- Botao "Voltar" que reseta para tela inicial
- Botao principal muda onClick conforme estado atual

---

## Alteracao 2: Pre-preenchimento dos Wizards (7 arquivos)

Adicionar `React.useEffect` apos os `useState` do Step 1 de cada wizard para ler `sessionStorage('portal_client')` e preencher campos vazios.

### Mapeamento por wizard:

| # | Arquivo | Setters utilizados |
|---|---|---|
| 1 | `AutoWizard.tsx` | `setName`, `setEmail`, `setPhone(formatPhone(...))`, `setCpfCnpj(formatCPF/formatCNPJ)`, `setPersonType` |
| 2 | `ResidentialWizard.tsx` | `setFullName`, `setEmail`, `setPhone(formatPhone(...))`, `setCpfCnpj(formatCPF/formatCNPJ)`, `setPersonType` |
| 3 | `LifeWizard.tsx` | `setName`, `setEmail`, `setPhone(formatPhone(...))`, `setCpf(formatCPF(...))` |
| 4 | `BusinessWizard.tsx` | `setContactName`, `setEmail`, `setPhone(formatPhone(...))`, `setCnpj(formatCNPJ(...))` |
| 5 | `TravelWizard.tsx` | `setContactPhone(formatPhone(...))`, `setContactEmail`, e `travelers[0].name/cpf` via `setTravelers` |
| 6 | `HealthWizard.tsx` | `saveData({ name, email, phone })` — usa o sistema de persistencia existente (`useWizardPersistence`) |
| 7 | `SmartphoneWizard.tsx` | `setFullName`, `setEmail`, `setPhone(formatPhone(...))`, `setCpf(formatCPF(...))` |

### Logica do useEffect (universal, adaptada por wizard):
```typescript
React.useEffect(() => {
  try {
    const raw = sessionStorage.getItem('portal_client');
    if (!raw) return;
    const client = JSON.parse(raw);
    if (client.name && !name) setName(client.name);
    if (client.email && !email) setEmail(client.email);
    if (client.phone && !phone) setPhone(formatPhone(client.phone));
    if (client.cpf_cnpj) {
      const digits = client.cpf_cnpj.replace(/\D/g, '');
      if (digits.length > 11) {
        setPersonType('pj');
        setCpfCnpj(formatCNPJ(client.cpf_cnpj));
      } else {
        setPersonType('pf');
        setCpfCnpj(formatCPF(client.cpf_cnpj));
      }
    }
  } catch (e) {
    console.error('Erro ao pre-preencher:', e);
  }
}, []);
```

A guarda `!name` / `!email` evita sobrescrever dados se o usuario voltar no wizard.

---

## O que NAO sera alterado
- `PortalOnboarding.tsx` — ja funcional, nao sera tocado
- RPCs SQL — todas ja existem no banco
- `usePortalWizardSubmit.ts` — ja funciona com o user_id da sessao
- `App.tsx` — rotas ja registradas
- Logica interna dos wizards (validacao, payloads, steps)
