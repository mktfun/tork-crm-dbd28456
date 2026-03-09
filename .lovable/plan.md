

# Fix: CurrencyInput — Formatação em tempo real, só aceitar dígitos

## Problema
O `CurrencyInput` atual permite digitar pontos, vírgulas e qualquer caractere livremente, só formatando no blur. Isso causa erros de entrada. O usuário quer um input que:
1. **Só aceite dígitos** (bloqueia ponto, vírgula, letras, tudo)
2. **Formate automaticamente enquanto digita** (abordagem "centavos primeiro")

## Solução: Input estilo "centavos"
O usuário digita apenas números. O componente interpreta os dígitos de trás pra frente como centavos e formata em tempo real.

Exemplo de digitação para R$ 100.000,00:
- Digita `1` → exibe `0,01`
- Digita `0` → exibe `0,10`
- Digita `0` → exibe `1,00`
- Digita `0` → exibe `10,00`
- Digita `0` → exibe `100,00`
- Digita `0` → exibe `1.000,00`
- Digita `0` → exibe `10.000,00`
- Digita `0` → exibe `100.000,00`

### Arquivo: `src/components/ui/currency-input.tsx`

Reescrever o `handleChange` para:
1. Extrair apenas dígitos do input (`raw.replace(/\D/g, '')`)
2. Converter para número dividindo por 100 (para 2 decimais)
3. Formatar com `formatBRL()` e atualizar display
4. Chamar `onChange()` imediatamente com o valor numérico

Remover lógica de blur (não precisa mais parsear). Manter sync via `useEffect` para reset externo.

O `inputMode` muda para `numeric` (só teclado numérico no mobile).

### Também usado no `SinistroFormModal.tsx`
Os campos `claim_amount` e `deductible_amount` ainda usam `<Input type="number">`. Vou substituí-los pelo `CurrencyInput` também para consistência.

