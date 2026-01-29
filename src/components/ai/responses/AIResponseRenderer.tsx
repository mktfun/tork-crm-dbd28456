import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TableComponent } from './TableComponent';
import { FinancialCard } from './FinancialCard';
import { PolicyListCard } from './PolicyListCard';
import { ClientListCard } from './ClientListCard';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Users, 
  Calendar,
  DollarSign,
  Briefcase,
  Target,
  Rocket,
  Lightbulb,
  ClipboardList,
  type LucideIcon
} from 'lucide-react';

// Mapeamento de ícones para sintaxe [Icon:Name]
const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Briefcase,
  Target,
  Rocket,
  Lightbulb,
  ClipboardList,
};

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

// Parser para sintaxe [Icon:Name] no texto
function parseIconSyntax(text: string): React.ReactNode[] {
  const iconRegex = /\[Icon:(\w+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = iconRegex.exec(text)) !== null) {
    // Add text before the icon
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the icon component
    const iconName = match[1];
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      parts.push(
        <IconComponent 
          key={`icon-${match.index}`} 
          className="inline-block h-4 w-4 mr-1 text-primary" 
        />
      );
    } else {
      parts.push(match[0]); // Keep original text if icon not found
    }
    
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * AIResponseRenderer: Componente híbrido que separa Markdown de JSON estruturado.
 * 
 * O backend emite respostas no formato:
 * - Texto em Markdown (explicativo/conversacional)
 * - Dados estruturados encapsulados em <data_json>...</data_json>
 * 
 * Este componente extrai e renderiza cada parte apropriadamente.
 * FASE P3.6: Suporte a ícones dinâmicos, tabelas premium e estilo Tork Premium.
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

  // Custom Markdown components for premium Glassmorphism styling (TORK PREMIUM + GFM)
  const markdownComponents = {
    // FASE P5.1: Premium Table Styling with internal scroll containment
    table: ({ children }: any) => (
      <div className="w-full overflow-x-auto my-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-1">
        <table className="w-full border-collapse text-sm table-fixed">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-white/10 border-b border-white/15">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="[&>tr:nth-child(even)]:bg-white/[0.03]">
        {children}
      </tbody>
    ),
    th: ({ children }: any) => (
      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-primary whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="p-3 text-sm border-b border-white/5 text-foreground/90 break-words min-w-[100px]">
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
      <ul className="pl-5 space-y-2 my-3 list-disc marker:text-primary/70">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="pl-5 space-y-2 my-3 list-decimal marker:text-primary/70">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm leading-relaxed text-foreground/90">
        {children}
      </li>
    ),
    // Headings with icon parsing support
    h3: ({ children }: any) => {
      const textContent = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : '').join('') : '';
      const parsedContent = typeof children === 'string' ? parseIconSyntax(children) : children;
      
      return (
        <h3 className="text-base font-bold mt-5 mb-3 flex items-center gap-2 text-foreground border-b border-white/10 pb-2">
          {parsedContent}
        </h3>
      );
    },
    h4: ({ children }: any) => {
      const parsedContent = typeof children === 'string' ? parseIconSyntax(children) : children;
      
      return (
        <h4 className="text-sm font-semibold mt-4 mb-2 text-foreground/95 flex items-center gap-1.5">
          {parsedContent}
        </h4>
      );
    },
    // Blockquotes for SUSEP alerts and critical tips (enhanced style)
    blockquote: ({ children }: any) => (
      <blockquote className="my-4 pl-4 border-l-3 border-yellow-500/70 bg-yellow-500/10 rounded-r-xl py-3 pr-4 text-sm backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-yellow-100/90 font-medium">{children}</div>
        </div>
      </blockquote>
    ),
    // Strong text with primary color
    strong: ({ children }: any) => (
      <strong className="font-bold text-foreground">
        {children}
      </strong>
    ),
    // Code blocks with glass effect
    code: ({ children }: any) => (
      <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono text-primary">
        {children}
      </code>
    ),
    // Paragraphs with proper spacing
    p: ({ children }: any) => (
      <p className="text-sm leading-relaxed mb-3 text-foreground/90 break-words whitespace-pre-wrap">
        {children}
      </p>
    ),
    // Horizontal rules for section separation
    hr: () => (
      <hr className="my-4 border-t border-white/10" />
    ),
  };

  return (
    // FASE P5.1: Contenção raiz com break-words e max-w-full
    <div className="space-y-3 w-full max-w-full break-words overflow-x-auto scrollbar-none">
      {/* Texto em Markdown com styling premium + GFM */}
      {textContent && (
        <div className="prose prose-sm prose-invert max-w-none w-full">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            components={markdownComponents}
          >
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
