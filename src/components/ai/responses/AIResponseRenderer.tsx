import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TableComponent } from './TableComponent';
import { FinancialCard } from './FinancialCard';
import { PolicyListCard } from './PolicyListCard';
import { ClientListCard } from './ClientListCard';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Shield } from 'lucide-react';

interface AIResponseRendererProps {
  content: string;
}

interface StructuredData {
  type: string;
  data: any;
}

// Detectar citações de fontes no texto para exibir badge
const SOURCE_PATTERNS = [
  { pattern: /(?:de acordo com|conforme|segundo)\s+(?:a\s+)?susep/gi, source: 'SUSEP', icon: Shield },
  { pattern: /(?:de acordo com|conforme|segundo)\s+(?:o\s+)?manual\s+técnico/gi, source: 'Manual Técnico', icon: BookOpen },
  { pattern: /(?:de acordo com|conforme|segundo)\s+(?:as?\s+)?normas?/gi, source: 'Norma Regulatória', icon: Shield },
  { pattern: /(?:base de conhecimento|conhecimento técnico)/gi, source: 'Base Técnica', icon: BookOpen },
  { pattern: /(?:circular|resolução)\s+(?:susep|cnsp)/gi, source: 'SUSEP', icon: Shield },
];

function detectSources(text: string): Array<{ source: string; icon: React.ComponentType<any> }> {
  const detectedSources: Array<{ source: string; icon: React.ComponentType<any> }> = [];
  
  for (const { pattern, source, icon } of SOURCE_PATTERNS) {
    if (pattern.test(text)) {
      if (!detectedSources.find(s => s.source === source)) {
        detectedSources.push({ source, icon });
      }
    }
  }
  
  return detectedSources;
}

/**
 * AIResponseRenderer: Componente híbrido que separa Markdown de JSON estruturado.
 * 
 * O backend emite respostas no formato:
 * - Texto em Markdown (explicativo/conversacional)
 * - Dados estruturados encapsulados em <data_json>...</data_json>
 * 
 * Este componente extrai e renderiza cada parte apropriadamente.
 * FASE P2.2: Suporte a tabelas premium e formatação densa com Glassmorphism.
 */
export const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({ content }) => {
  const jsonRegex = /<data_json>([\s\S]*?)<\/data_json>/g;
  
  // Extrair todos os blocos JSON
  const matches: StructuredData[] = [];
  let match;
  
  while ((match = jsonRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      matches.push(parsed);
    } catch (error) {
      console.error('[AIResponseRenderer] Erro ao parsear JSON:', error);
    }
  }
  
  // Remover os blocos JSON do texto
  const textContent = content.replace(/<data_json>[\s\S]*?<\/data_json>/g, '').trim();
  
  // Detectar fontes citadas no texto
  const detectedSources = detectSources(textContent);

  const renderStructuredData = (structuredData: StructuredData, index: number) => {
    const { type, data } = structuredData;
    
    switch (type) {
      case 'table':
      case 'company_list':
      case 'ramo_list':
        return <TableComponent key={index} data={data} type={type} />;
      
      case 'financial_summary':
        return <FinancialCard key={index} summary={data} />;
      
      case 'policy_list':
      case 'expiring_policies':
        return <PolicyListCard key={index} policies={data} type={type} />;
      
      case 'client_list':
      case 'client_details':
        return <ClientListCard key={index} clients={data} type={type} />;
      
      default:
        // Fallback: renderizar como tabela genérica se for array
        if (Array.isArray(data)) {
          return <TableComponent key={index} data={data} type="generic" />;
        }
        // Se for objeto, mostrar como JSON formatado
        return (
          <pre 
            key={index}
            className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 text-xs overflow-x-auto"
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  // Custom Markdown components for premium Glassmorphism styling
  const markdownComponents = {
    // Premium Table Styling
    table: ({ children }: any) => (
      <div className="w-full overflow-x-auto my-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
        <table className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-white/10 border-b border-white/10">
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="p-3 text-sm border-b border-white/5">
        {children}
      </td>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-white/5 transition-colors">
        {children}
      </tr>
    ),
    // Lists with proper spacing
    ul: ({ children }: any) => (
      <ul className="pl-5 space-y-2 my-3 list-disc marker:text-muted-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="pl-5 space-y-2 my-3 list-decimal marker:text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm leading-relaxed">
        {children}
      </li>
    ),
    // Headings with icons support
    h3: ({ children }: any) => (
      <h3 className="text-base font-bold mt-4 mb-2 flex items-center gap-2 text-foreground">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-sm font-semibold mt-3 mb-1.5 text-foreground/90">
        {children}
      </h4>
    ),
    // Blockquotes for SUSEP alerts
    blockquote: ({ children }: any) => (
      <blockquote className="my-3 pl-4 border-l-2 border-yellow-500/50 bg-yellow-500/10 rounded-r-lg py-2 pr-3 text-sm italic">
        {children}
      </blockquote>
    ),
    // Strong text
    strong: ({ children }: any) => (
      <strong className="font-bold text-foreground">
        {children}
      </strong>
    ),
    // Code blocks
    code: ({ children }: any) => (
      <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">
        {children}
      </code>
    ),
    // Paragraphs
    p: ({ children }: any) => (
      <p className="text-sm leading-relaxed mb-2">
        {children}
      </p>
    ),
  };

  return (
    <div className="space-y-3">
      {/* Texto em Markdown com styling premium */}
      {textContent && (
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown components={markdownComponents}>
            {textContent}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Dados estruturados */}
      {matches.map((data, index) => renderStructuredData(data, index))}
      
      {/* Badges de Fontes Citadas (FASE P2.1) */}
      {detectedSources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          <span className="text-xs text-muted-foreground">Fontes:</span>
          {detectedSources.map(({ source, icon: Icon }, idx) => (
            <Badge 
              key={idx} 
              variant="silverOutline" 
              className="text-[10px] py-0.5 gap-1"
            >
              <Icon className="h-3 w-3" />
              {source}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIResponseRenderer;
