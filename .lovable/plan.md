
# Plano: Correção do Popover + Extração Completa do Nome

## Diagnóstico Confirmado

### Problema 1: Badge Não Suporta Ref (Popover Não Abre)

O console mostra claramente:
```
Warning: Function components cannot be given refs.
Check the render method of SlotClone.
at Badge
```

O `PopoverTrigger asChild` precisa passar um `ref` para o elemento filho, mas o componente `Badge` é definido assim:

```typescript
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

Sem `React.forwardRef`, o ref não é passado → Popover não funciona.

### Problema 2: NOME_REGEX Captura Só Maiúsculas

O regex atual:
```typescript
const NOME_REGEX = /([A-ZÀ-Ú\s]{5,60})/;
```

Só captura letras **maiúsculas**. Se o OCR retorna:
```
SEGURADO: RA JOSE da Silva Pereira
```

O regex captura apenas: `"RA JOSE"` (ignora "da Silva Pereira")

Depois, `cleanOcrNoiseFromName` remove "RA" e sobra apenas `"Jose"` (Title Case).

---

## Solução

### Frente 1: Corrigir Badge para Suportar Ref

**Arquivo**: `src/components/ui/badge.tsx`

```typescript
import * as React from "react"
// ...

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(badgeVariants({ variant }), className)} 
        {...props} 
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
```

### Frente 2: Expandir NOME_REGEX para Capturar Nome Completo

**Arquivo**: `src/utils/universalPolicyParser.ts`

Novo regex que captura letras maiúsculas E minúsculas:

```typescript
// v5.6: Regex expandido para capturar nome completo (maiúsculas + minúsculas)
const NOME_REGEX = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{4,80})/;
```

Isso captura "RA JOSE da Silva Pereira" completo, e depois a função `cleanOcrNoiseFromName` remove o "RA" do início.

### Frente 3: Melhorar Limpeza de Ruído OCR

Refinar a função `cleanOcrNoiseFromName` para:
1. Remover prefixos de ruído mais agressivamente
2. Preservar todas as palavras do nome completo

```typescript
function cleanOcrNoiseFromName(rawName: string): string {
  let words = rawName.trim().split(/\s+/);
  
  // v5.6: Remove prefixos de ruído AGRESSIVAMENTE
  // Enquanto houver palavras suficientes, remove lixo do início
  while (words.length > 2) {
    const first = words[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Remove se:
    // 1. Está na lista de prefixos conhecidos
    // 2. Tem 2 ou menos caracteres e é alfanumérico puro
    // 3. Parece número de documento (ex: "123456")
    if (
      NOISE_PREFIXES.includes(first) || 
      (first.length <= 2 && /^[A-Z0-9]+$/.test(first)) ||
      /^\d+$/.test(first)
    ) {
      console.log(`🧹 [OCR v5.6] Removendo prefixo: "${words[0]}"`);
      words.shift();
    } else {
      break;
    }
  }
  
  return words.join(' ');
}
```

---

## Alterações por Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/badge.tsx` | Adicionar `React.forwardRef` para suportar ref do Popover |
| `src/utils/universalPolicyParser.ts` | Expandir `NOME_REGEX` para capturar maiúsculas + minúsculas, melhorar limpeza de ruído |

---

## Resultado Esperado

Antes:
- Popover não abre ao clicar no badge "Vinculado"
- Nome aparece como "Ra Jose" (perdendo sobrenome)

Depois:
- Popover abre mostrando dados completos do cliente
- Nome aparece como "Jose Da Silva Pereira" (nome completo, sem prefixo "Ra")

---

## Detalhes Técnicos

### Badge com forwardRef

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        silverSuccess: "bg-zinc-800/50 text-zinc-200 border border-zinc-600/50",
        silverOutline: "bg-transparent text-zinc-400 border border-zinc-600/50",
        chrome: "bg-gradient-to-r from-zinc-700 to-zinc-600 text-zinc-100 border-0",
        metallic: "bg-zinc-900/50 text-zinc-400 border-zinc-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(badgeVariants({ variant }), className)} 
        {...props} 
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
```

### NOME_REGEX Expandido (v5.6)

```typescript
// Antes (só maiúsculas):
const NOME_REGEX = /([A-ZÀ-Ú\s]{5,60})/;

// Depois (maiúsculas + minúsculas + acentos):
const NOME_REGEX = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{4,80})/;
```

Explicação:
- `[A-Za-zÀ-ÿ]` - Primeiro caractere deve ser letra (qualquer case)
- `[A-Za-zÀ-ÿ\s]{4,80}` - Seguido de 4-80 letras/espaços
- `À-ÿ` cobre todos os acentos em português

### cleanOcrNoiseFromName v5.6

```typescript
const NOISE_PREFIXES = [
  'RA', 'RG', 'CP', 'NR', 'NO', 'SR', 'DR', 'SRA', 'DRA',
  'N°', 'Nº', 'CPF', 'CNPJ', 'DOC', 'SEQ', 'COD', 'REF', 'ID',
  'PROP', 'NUM', 'NRO', 'NUMERO'
];

function cleanOcrNoiseFromName(rawName: string): string {
  let words = rawName.trim().split(/\s+/);
  
  while (words.length > 2) {
    const first = words[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (
      NOISE_PREFIXES.includes(first) || 
      (first.length <= 2 && /^[A-Z0-9]+$/.test(first)) ||
      /^\d+$/.test(first)  // Remove números puros (ex: "123456")
    ) {
      console.log(`🧹 [OCR v5.6] Removendo: "${words[0]}"`);
      words.shift();
    } else {
      break;
    }
  }
  
  return words.join(' ');
}
```
