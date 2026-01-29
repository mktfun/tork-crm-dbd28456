import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TableComponent } from './TableComponent';
import { FinancialCard } from './FinancialCard';
import { PolicyListCard } from './PolicyListCard';
import { ClientListCard } from './ClientListCard';

interface AIResponseRendererProps {
  content: string;
}

interface StructuredData {
  type: string;
  data: any;
}

/**
 * AIResponseRenderer: Componente híbrido que separa Markdown de JSON estruturado.
 * 
 * O backend emite respostas no formato:
 * - Texto em Markdown (explicativo/conversacional)
 * - Dados estruturados encapsulados em <data_json>...</data_json>
 * 
 * Este componente extrai e renderiza cada parte apropriadamente.
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
    </div>
  );
};

export default AIResponseRenderer;
