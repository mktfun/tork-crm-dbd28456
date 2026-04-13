
import { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function MobileWorkspaceModal() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2"
        >
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Corretora</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="bg-background/95 border-border">
        <div className="py-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Selecionar Corretora</h3>
          <WorkspaceSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}
