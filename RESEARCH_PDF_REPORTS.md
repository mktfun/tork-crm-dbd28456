# 📋 Pesquisa Técnica: Módulo de Relatórios e Geração de PDFs para Amorim AI v2.0

## 1. Bibliotecas de Geração de PDF em Deno/TypeScript

### 1.1. PDF-lib (Recomendado para Relatórios Técnicos)
**URL:** https://pdf-lib.js.org/
**GitHub:** https://github.com/Hopding/pdf-lib

**Características:**
- Criação e modificação de PDFs do zero
- Suporte a desenho de texto, imagens e gráficos vetoriais
- Embedding de fontes customizadas
- Compatível com Deno (sem dependências nativas)
- Funciona em qualquer ambiente JavaScript moderno

**Vantagens:**
- Sem dependências nativas (ideal para Edge Functions do Supabase)
- Suporte completo a TypeScript
- Bem documentado e com muitos exemplos
- Leve e rápido
- Melhor para tabelas e layouts estruturados

**Desvantagens:**
- Requer conhecimento de posicionamento manual de elementos
- Não tem suporte nativo a templates HTML/CSS

### 1.2. jsPDF (Já Utilizado no Projeto)
**Versão Atual:** 2.5.1 (conforme `supabase/functions/generate-card-pdf/index.ts`)

**Características:**
- Popular e versátil
- Suporte a HTML para PDF (via html2canvas)
- Múltiplos formatos de página
- Já integrado no projeto para geração de carteirinhas

**Observação:** O projeto já utiliza jsPDF para gerar PDFs de carteirinhas digitais. Podemos reutilizar esse padrão para relatórios.

### 1.3. PDFMe
**URL:** https://github.com/pdfme/pdfme
**Características:**
- Geração de PDF com TypeScript e React
- Designer WYSIWYG de templates
- Viewer de PDF integrado

**Desvantagens:**
- Mais complexo para casos simples
- Melhor para aplicações com UI de design

## 2. Estratégia Recomendada: Híbrida (jsPDF + PDF-lib)

Para o Amorim AI, a melhor abordagem é:

1. **Usar jsPDF** para relatórios com layout simples e dinâmico (já familiar ao projeto)
2. **Usar PDF-lib** para relatórios com tabelas complexas e formatação profissional
3. **Armazenar no Supabase Storage** e retornar URL pública
4. **Integrar com Amorim AI** para chamar a função quando necessário

## 3. Estrutura Existente do Projeto

### 3.1. Edge Functions Disponíveis
```
supabase/functions/
├── ai-assistant/              (Amorim AI - Modificado com RAG)
├── generate-card-pdf/         (Geração de carteirinhas - jsPDF)
├── analyze-policy/            (Análise de apólices)
├── extract-quote-data/        (Extração de dados de cotação)
└── ... (outras functions)
```

### 3.2. Padrão Existente: `generate-card-pdf`

O projeto já possui uma Edge Function que gera PDFs usando jsPDF. Podemos usar esse padrão como base:

**Fluxo:**
1. Recebe dados via POST JSON
2. Consulta dados no Supabase (tabelas: `apolices`, `clientes`, `brokerages`)
3. Gera PDF com jsPDF
4. Retorna PDF como `arraybuffer` com headers CORS

**Exemplo de Uso:**
```typescript
// POST /functions/v1/generate-card-pdf
{
  "policy_id": "uuid-da-apolice"
}

// Response: PDF binary (application/pdf)
```

## 4. Supabase Storage: Configuração e Upload

### 4.1. Estrutura de Buckets

Para o Amorim AI, criar os seguintes buckets:

```
📦 amorim-reports/
   ├── comparativos/     (Comparações de coberturas)
   ├── analises/         (Análises de sinistro)
   ├── renovacoes/       (Relatórios de renovação)
   └── templates/        (Templates de relatórios)
```

### 4.2. Configuração de Acesso Público

**Bucket:** `amorim-reports`
**Tipo:** Public (para que os PDFs gerados sejam acessíveis via URL)
**RLS Policy:** Permitir `select` público para leitura de PDFs

### 4.3. Upload de PDFs em Edge Functions

**Código TypeScript para Upload:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

async function uploadPDFToStorage(pdfBuffer: Uint8Array, fileName: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.storage
    .from('amorim-reports')
    .upload(`comparativos/${fileName}`, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '3600', // Cache por 1 hora
      upsert: false
    });

  if (error) {
    console.error('Erro ao fazer upload:', error);
    return null;
  }

  // Obter URL pública
  const { data: publicUrl } = supabase.storage
    .from('amorim-reports')
    .getPublicUrl(`comparativos/${fileName}`);

  return publicUrl.publicUrl;
}
```

### 4.4. Obter URL Pública

**Formato da URL:**
```
https://<project-id>.supabase.co/storage/v1/object/public/amorim-reports/comparativos/relatorio_2025_01_29.pdf
```

## 5. Fluxo de Geração de Relatórios

### 5.1. Fluxo Proposto

1. **Usuário solicita relatório** (ex: "Gera um comparativo de vidros Porto vs Tokio")
2. **Amorim AI processa a solicitação:**
   - Busca dados no RAG (Base de Conhecimento)
   - Estrutura os dados em formato JSON
   - Chama a função `generate-report-pdf` (Edge Function)
3. **Edge Function `generate-report-pdf`:**
   - Recebe os dados estruturados
   - Usa jsPDF ou PDF-lib para gerar o PDF
   - **Opção A:** Retorna o PDF diretamente (como `generate-card-pdf`)
   - **Opção B:** Faz upload para Supabase Storage e retorna URL pública
4. **Amorim AI responde ao usuário:**
   - Inclui a URL do PDF na resposta
   - Usuário pode baixar ou visualizar o relatório

### 5.2. Tipos de Relatórios

| Tipo | Descrição | Dados Necessários | Biblioteca |
| :--- | :--- | :--- | :--- |
| **Comparativo de Coberturas** | Tabela comparativa entre 2-3 seguradoras | Seguradoras, ramo, coberturas | PDF-lib (melhor para tabelas) |
| **Análise de Sinistro** | Checklist de documentos e procedimentos | Tipo de sinistro, seguradora | jsPDF (layout simples) |
| **Renovação** | Resumo de cobertura e recomendações | Apólice, cliente, recomendações | jsPDF (layout simples) |
| **Pitch de Venda** | Proposta comercial formatada | Cliente, produto, preço | PDF-lib (tabelas + gráficos) |

## 6. Estrutura de Dados para Templates

### 6.1. Comparativo de Coberturas

```typescript
interface ComparativoData {
  titulo: string;
  data: string;
  seguradoras: {
    nome: string;
    ramo: string;
    coberturas: {
      item: string;
      valor: string;
      observacao?: string;
    }[];
  }[];
  recomendacao: string;
  assinatura: string;
}
```

### 6.2. Análise de Sinistro

```typescript
interface AnaliseSinistroData {
  titulo: string;
  data: string;
  cliente: string;
  sinistro: {
    tipo: string;
    data: string;
    descricao: string;
  };
  checklist: {
    item: string;
    obrigatorio: boolean;
    observacao?: string;
  }[];
  prazos: {
    acao: string;
    prazo: string;
  }[];
}
```

## 7. Integração com Amorim AI

### 7.1. Modificações no `ai-assistant/index.ts`

Adicionar uma **tool** chamada `generate_report_pdf` que o Amorim AI pode chamar:

```typescript
const TOOLS = [
  // ... tools existentes ...
  {
    type: 'function',
    function: {
      name: 'generate_report_pdf',
      description: 'Gera um relatório em PDF (comparativo, análise, renovação, etc)',
      parameters: {
        type: 'object',
        properties: {
          report_type: {
            type: 'string',
            enum: ['comparativo', 'analise_sinistro', 'renovacao', 'pitch_venda'],
            description: 'Tipo de relatório a gerar'
          },
          data: {
            type: 'object',
            description: 'Dados estruturados para o relatório'
          }
        },
        required: ['report_type', 'data']
      }
    }
  }
];
```

### 7.2. Handler da Tool

```typescript
generate_report_pdf: async (args, supabase, userId) => {
  const { report_type, data } = args;
  
  // Chamar a Edge Function
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-report-pdf`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_type,
        data,
        user_id: userId
      })
    }
  );

  const result = await response.json();
  return {
    success: true,
    pdf_url: result.pdf_url,
    message: `Relatório ${report_type} gerado com sucesso`
  };
}
```

## 8. Implementação: Próximos Passos

1. **Criar Edge Function `generate-report-pdf`** em `supabase/functions/generate-report-pdf/index.ts`
2. **Implementar templates** usando jsPDF e/ou PDF-lib
3. **Integrar com Amorim AI** adicionando a tool `generate_report_pdf`
4. **Criar bucket `amorim-reports`** no Supabase Storage
5. **Testar geração** de relatórios de exemplo

## 9. Referências

- **PDF-lib Documentation:** https://pdf-lib.js.org/
- **jsPDF Documentation:** https://github.com/parallax/jsPDF
- **Supabase Storage Guide:** https://supabase.com/docs/guides/storage
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Supabase Storage Upload API:** https://supabase.com/docs/reference/javascript/storage-from-upload
- **Existing Pattern (generate-card-pdf):** `/supabase/functions/generate-card-pdf/index.ts`
- **Reddit Discussion (PDF Generation in Deno):** https://www.reddit.com/r/Deno/comments/qox0ct/whats_the_best_way_to_generate_a_pdf_from_html_in/
- **Best Practices (Supabase PDF):** https://www.reddit.com/r/Supabase/comments/1n4w1nf/best_practice_for_pdf_generation_from_supabase/
