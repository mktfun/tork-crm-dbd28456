import * as React from "react";
import { Label } from "@/modules/jjseguros/components/ui/label";

interface YesNoToggleProps {
  label: string;
  value: "sim" | "nao" | null;
  onChange: (value: "sim" | "nao") => void;
}

export const YesNoToggle: React.FC<YesNoToggleProps> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <div className="grid grid-cols-2 gap-3 w-full">
      <button
        type="button"
        onClick={() => onChange("sim")}
        className={`h-12 flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-200 ${
          value === "sim"
            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
            : "bg-background text-muted-foreground border-input hover:bg-muted/50"
        }`}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange("nao")}
        className={`h-12 flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-200 ${
          value === "nao"
            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
            : "bg-background text-muted-foreground border-input hover:bg-muted/50"
        }`}
      >
        Não
      </button>
    </div>
  </div>
);
