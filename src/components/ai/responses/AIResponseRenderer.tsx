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
 * FASE P2.1: Adiciona badges de citação para fontes do RAG.
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

  return (
    <div className="space-y-3">
      {/* Texto em Markdown */}
      {textContent && (
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown>{textContent}</ReactMarkdown>
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
