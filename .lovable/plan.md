

# Plano: Refatorar AdminControlCenter com Faturamento

## Resumo

Reescrever `AdminControlCenter.tsx` para: (1) trocar coluna "Status" por "Vencimento" com badge verde/vermelho, (2) remover plano "Enterprise" deixando só Free/Pro, (3) Sheet lateral com Tabs "Geral" e "Faturamento", (4) aba Faturamento com card de vencimento, histórico de pagamentos e botão "Registrar Pagamento Manual" que abre Dialog com formulário.

---

## Arquivo: `src/components/superadmin/AdminControlCenter.tsx` (reescrever)

### Mock Data
- Remover `Enterprise` dos planos, manter `Free | Pro`.
- Substituir `status: 'Ativo' | 'Suspenso'` por `expiresAt: string` (data ISO) e campo computado para status (Ativo se futuro, Vencido se passado).
- Adicionar `paymentHistory` array em cada org com: `{ id, date, amount, period, registeredBy }`.

### Tabela Principal
- Colunas: Organização, Plano, **Vencimento** (data formatada dd/MM/yyyy + Badge verde "Ativo"/vermelho "Vencido"), Módulos (4 switches), Ações.

### Sheet Lateral — com Tabs
- **Aba "Geral"**: Select plano (Free/Pro), métricas (Tokens IA + Armazenamento, sem Usuários Ativos), permissões globais com switches e descrições.
- **Aba "Faturamento"**:
  - Card destaque: data de vencimento atual + badge status (Ativo/Vencido).
  - Botão "Registrar Pagamento Manual" (abre Dialog).
  - Tabela histórico de pagamentos (Data, Valor R$, Período, Status "Pago", Registrado por).

### Dialog "Registrar Pagamento"
- Input valor (R$) com formatação brasileira.
- Select período: "1 Mês", "6 Meses", "1 Ano".
- Input date para data do pagamento.
- Botões Cancelar/Salvar (Salvar apenas fecha o dialog, mock).

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/superadmin/AdminControlCenter.tsx` | Reescrever |

Nenhum outro arquivo precisa ser alterado. O componente já está registrado no SuperAdmin.tsx.

