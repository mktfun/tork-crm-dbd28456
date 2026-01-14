/**
 * 🔒 SISTEMA DE PROTEÇÃO TYPESCRIPT 🔒
 * 
 * Types que garantem que alterações seguem padrões seguros
 */

// 🛡️ Interface protegida para AppCard - NÃO ALTERAR PROPRIEDADES OBRIGATÓRIAS
export interface ProtectedAppCardProps {
  readonly className?: string;
  readonly children: React.ReactNode;
  readonly ref?: React.RefObject<HTMLDivElement>;
}

// 🛡️ Cores permitidas para KPI cards - APENAS ESTAS VARIANTES SÃO SEGURAS
export type SafeColorVariant = 'default' | 'warning' | 'danger' | 'success' | 'info';

// 🛡️ Classes CSS protegidas - NÃO REMOVER ESTAS CLASSES DOS CARDS
export const PROTECTED_CLASSES = {
  GLASS_COMPONENT: 'glass-component' as const,
  GLASS_HOVER: 'hover:scale-105' as const,
  GLASS_FLEX: 'flex flex-col justify-between' as const,
  GLASS_TRANSITION: 'transition-all duration-200' as const,
} as const;

// 🛡️ Validador de classes seguras
export function validateGlassClasses(classes: string): boolean {
  const requiredClasses = Object.values(PROTECTED_CLASSES);
  return requiredClasses.every(cls => classes.includes(cls));
}

// 🛡️ Type guard para verificar se componente está usando padrão seguro
export function isValidGlassComponent(element: HTMLElement): boolean {
  const classList = Array.from(element.classList);
  return classList.includes(PROTECTED_CLASSES.GLASS_COMPONENT);
}

// 🛡️ Exemplo de uso seguro para novos componentes
export const SAFE_USAGE_EXAMPLES = {
  // ✅ CORRETO - Novo card seguindo padrão
  NEW_KPI_CARD: `
    <AppCard className="hover:scale-105 border-slate-800 bg-slate-900 hover:bg-slate-800/70 transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-slate-400">Título</span>
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="h-5 w-5 text-blue-400" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">Valor</h2>
      </div>
    </AppCard>
  `,

  // ❌ ERRADO - Classes que quebram o sistema
  BROKEN_EXAMPLE: `
    <div className="bg-white border-black"> <!-- Sem glass-component -->
      <!-- Sistema quebrado -->
    </div>
  `
} as const;

/**
 * 🚨 REGRAS DE PROTEÇÃO - LEIA ANTES DE USAR:
 *
 * 1. NUNCA remova PROTECTED_CLASSES de um componente
 * 2. SEMPRE use SafeColorVariant para cores
 * 3. SEMPRE valide classes com validateGlassClasses()
 * 4. SE quebrar algo, REVERTA e consulte /PROTECTION.md
 * 5. TESTE sempre com useGlassSystemProtection ativo
 * 6. MONITORE o console para avisos automáticos
 */
