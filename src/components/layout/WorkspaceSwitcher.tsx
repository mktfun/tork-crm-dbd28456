
import { useAppStore } from "@/store";
import { useSupabaseBrokerages } from "@/hooks/useSupabaseBrokerages";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function WorkspaceSwitcher() {
  const { brokerages, loading } = useSupabaseBrokerages();
  const { activeBrokerageId, setActiveBrokerage } = useAppStore();

  const activeBrokerage = brokerages.find(b => b.id.toString() === activeBrokerageId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  if (brokerages.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Nenhuma corretora</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
      <Select 
        value={activeBrokerageId || ''} 
        onValueChange={(value) => setActiveBrokerage(value || null)}
      >
        <SelectTrigger className="w-[200px] border-slate-700 bg-slate-900/50 text-white">
          <SelectValue placeholder="Selecione uma Corretora..." />
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-900">
          {brokerages.map(b => (
            <SelectItem key={b.id} value={b.id.toString()}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
