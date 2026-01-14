
import { ReactNode } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface SettingsPanelProps {
  title?: string; // Tornando opcional
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  headerActions?: ReactNode;
}

export function SettingsPanel({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  headerActions 
}: SettingsPanelProps) {
  return (
    <AppCard>
      {(title || headerActions) && (
        <CardHeader className="flex flex-row items-center justify-between">
          {title && (
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                {Icon && <Icon className="h-5 w-5" />}
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-slate-400 mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          )}
          {headerActions && <div>{headerActions}</div>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </AppCard>
  );
}
