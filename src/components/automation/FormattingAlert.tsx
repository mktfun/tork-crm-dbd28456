import React from 'react';
import { AlertTriangle, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormattingAlertProps {
  violations: string[];
  className?: string;
}

export function detectFormattingViolations(text: string): string[] {
  const violations: string[] = [];
  
  // Check for colons (except in time formats like 14h30 or 14:30)
  const colonMatches = text.match(/:/g);
  const timePatterns = text.match(/\d{1,2}[h:]\d{2}/g) || [];
  if (colonMatches && colonMatches.length > timePatterns.length) {
    violations.push('Dois pontos ":"');
  }
  
  // Check for semicolons
  if (text.includes(';')) {
    violations.push('Ponto e vírgula ";"');
  }
  
  // Check for numbered lists
  if (/^\s*\d+\.\s/m.test(text)) {
    violations.push('Lista numerada');
  }
  
  // Check for bullet points
  if (/[•\-–—]\s/.test(text) || /^\s*[\-\*]\s/m.test(text)) {
    violations.push('Bullets ou traços');
  }
  
  // Check for robotic phrases
  const roboticPhrases = [
    'segue abaixo',
    'conforme solicitado',
    'em anexo',
    'a seguir',
    'segue a seguir',
    'prezado',
    'atenciosamente',
  ];
  
  const lowerText = text.toLowerCase();
  for (const phrase of roboticPhrases) {
    if (lowerText.includes(phrase)) {
      violations.push(`Frase robótica: "${phrase}"`);
      break; // Only report one robotic phrase
    }
  }
  
  // Check for emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(text)) {
    violations.push('Emoji detectado');
  }
  
  return violations;
}

export function FormattingAlert({ violations, className }: FormattingAlertProps) {
  if (violations.length === 0) return null;
  
  return (
    <div 
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        'bg-destructive/10 border border-destructive/30',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/20 shrink-0">
        <Bot className="h-4 w-4 text-destructive" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            Formatação Robótica Detectada
          </span>
        </div>
        
        <p className="text-xs text-destructive/80 mb-2">
          Isso pode entregar que você é um robô para o cliente.
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          {violations.map((violation, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-destructive/20 text-destructive"
            >
              {violation}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
