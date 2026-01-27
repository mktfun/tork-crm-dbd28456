
# Plano: Correção Definitiva de Nome do Cliente + Melhorias na Vinculação

## Diagnóstico

O nome "Agora Você Pode Realizar O Programa De Benefícios..." está passando pela validação porque:

| Critério Atual | Valor | Resultado |
|----------------|-------|-----------|
| 8+ caracteres | ~40 chars | PASSA |
| 2+ palavras | 10 palavras | PASSA |
| Palavra 3+ chars | "Agora", "Você", etc. | PASSA |
| Blacklist | Não contém termos | PASSA |

Mas claramente é um texto institucional/marketing, NÃO um nome de pessoa.

---

## Solução em 3 Frentes

### Frente 1: Expandir Blacklist com Frases Institucionais

**Arquivo**: `src/services/policyImportService.ts` e `src/utils/universalPolicyParser.ts`

Adicionar termos que indicam texto institucional/marketing:

```typescript
const INSTITUTIONAL_BLACKLIST = [
  // Existentes...
  
  // v5.4: Frases de marketing/institucional
  'AGORA', 'VOCE', 'PODE', 'REALIZAR', 'PROGRAMA', 'BENEFICIOS',
  'APROVEITE', 'DESCONTO', 'PROMOCAO', 'OFERTA', 'EXCLUSIVO',
  'CLIQUE', 'ACESSE', 'SAIBA', 'MAIS', 'INFORMACOES',
  'ATENDIMENTO', 'SERVICO', 'PORTAL', 'ONLINE', 'DIGITAL',
  'TERMOS', 'CONDICOES', 'REGULAMENTO', 'PARTICIPAR',
  'PAGINA', 'SITE', 'WWW', 'HTTP', 'HTTPS',
];
```

### Frente 2: Detectar Padrão de Frase (Muitas Palavras)

Adicionar heurística: nomes reais raramente têm mais de 5 palavras.

```typescript
function isValidClientName(name: string): boolean {
  // ... critérios existentes ...
  
  // v5.4: Nome com mais de 5 palavras provavelmente é frase institucional
  if (words.length > 5) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (${words.length} palavras - provavelmente frase)`);
    return false;
  }
  
  // v5.4: Verificar se parece com frase (verbos, artigos em excesso)
  const verbsAndArticles = ['VOCE', 'PODE', 'PARA', 'COM', 'QUE', 'COMO', 'FAZER', 'TER', 'SER'];
  const wordSet = new Set(words.map(w => w.toUpperCase()));
  const matchCount = verbsAndArticles.filter(v => wordSet.has(v)).length;
  
  if (matchCount >= 2) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (parece frase: ${matchCount} verbos/artigos)`);
    return false;
  }
  
  return true;
}
```

### Frente 3: Forçar Edição Manual Quando Nome Inválido

No `ImportPoliciesModal.tsx`, quando o nome é inválido:
1. Exibir campo com borda vermelha + placeholder "Digite o nome do cliente"
2. Bloquear botão "Importar" até que o nome seja editado
3. Exibir alerta visual na linha

```typescript
// Validação visual na UI
const isNameInvalid = !item.clientName?.trim() || 
  item.clientName === 'Cliente Não Identificado' ||
  item.clientName.length > 60 ||  // v5.4: Nomes muito longos são suspeitos
  item.clientName.split(' ').length > 5; // v5.4: Muitas palavras = frase

// Input com destaque vermelho se inválido
<Input
  value={item.clientName}
  className={cn(
    "h-8 bg-transparent border-zinc-700/50",
    isNameInvalid && "border-red-500/50 bg-red-900/10 animate-pulse"
  )}
  placeholder="⚠️ Digite o nome do cliente"
/>
```

---

## Alterações por Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `src/services/policyImportService.ts` | Expandir `INSTITUTIONAL_BLACKLIST`, adicionar heurística de frase em `isValidClientName()` |
| `src/utils/universalPolicyParser.ts` | Sincronizar mesma lógica de validação (ou importar função compartilhada) |
| `src/components/policies/ImportPoliciesModal.tsx` | Validação visual + bloquear importação de nomes inválidos |

---

## Resultado Esperado

Antes:
- "Agora Você Pode Realizar O Pro..." é exibido como nome → Usuário precisa perceber e editar

Depois:
- Campo aparece VAZIO com placeholder vermelho "⚠️ Digite o nome do cliente"
- Botão "Importar" desabilitado até edição
- Nome institucional rejeitado automaticamente

---

## Detalhes Técnicos

### Nova Função `isValidClientName` (v5.4)

```typescript
function isValidClientName(name: string): boolean {
  if (!name) return false;
  
  const cleanName = name.trim().replace(/\s+/g, ' ');
  
  // Mínimo de 8 caracteres
  if (cleanName.length < 8) return false;
  
  const words = cleanName.split(' ');
  
  // v5.4: NOVO - Máximo de 5 palavras (nomes reais)
  if (words.length > 5) return false;
  
  // Mínimo de 2 palavras válidas
  const validWords = words.filter(w => w.length >= 2);
  if (validWords.length < 2) return false;
  
  // Pelo menos uma palavra substancial (3+ chars)
  if (!words.some(w => w.length >= 3)) return false;
  
  const alphaName = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Blacklist expandida
  const BLACKLIST = [
    // Seguradoras
    'SEGURADORA', 'SEGUROS', 'CORRETORA', 'TOKIO', 'PORTO', 'HDI',
    // Termos jurídicos
    'LTDA', 'SA', 'EIRELI', 'CNPJ', 'CPF',
    // v5.4: Termos de marketing/frases
    'AGORA', 'VOCE', 'PODE', 'REALIZAR', 'PROGRAMA', 'BENEFICIOS',
    'APROVEITE', 'PROMOCAO', 'OFERTA', 'CLIQUE', 'ACESSE',
    'TERMOS', 'CONDICOES', 'REGULAMENTO', 'PARTICIPAR',
  ];
  
  for (const forbidden of BLACKLIST) {
    if (alphaName.includes(forbidden)) return false;
  }
  
  // v5.4: Detectar padrão de frase
  const verbsAndArticles = ['VOCE', 'PODE', 'PARA', 'COM', 'QUE', 'COMO'];
  const wordSet = new Set(words.map(w => w.toUpperCase()));
  const matchCount = verbsAndArticles.filter(v => wordSet.has(v)).length;
  
  if (matchCount >= 2) return false;
  
  return true;
}
```

### Validação na UI (ImportPoliciesModal)

```typescript
const isNameSuspicious = (name: string | null): boolean => {
  if (!name?.trim()) return true;
  if (name === 'Cliente Não Identificado') return true;
  if (name.length > 60) return true;
  if (name.split(' ').length > 5) return true;
  
  const upper = name.toUpperCase();
  const suspiciousTerms = ['AGORA', 'VOCE', 'PODE', 'PROGRAMA', 'BENEFICIO'];
  return suspiciousTerms.some(t => upper.includes(t));
};

// Na validação antes de importar
const hasInvalidNames = validItems.some(item => isNameSuspicious(item.clientName));

if (hasInvalidNames) {
  toast.error('Existem clientes com nome inválido. Edite antes de importar.');
  return;
}
```
