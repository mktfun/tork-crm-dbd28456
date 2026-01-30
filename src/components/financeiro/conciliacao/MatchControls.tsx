import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Plus } from "lucide-react";

interface MatchControlsProps {
  selectedStatementCount: number;
  selectedSystemCount: number;
  onMatch: () => void;
  onIgnore: () => void;
  onCreate: () => void;
}

export function MatchControls({
  selectedStatementCount,
  selectedSystemCount,
  onMatch,
  onIgnore,
  onCreate,
}: MatchControlsProps) {
  const canMatch = selectedStatementCount > 0 && selectedSystemCount > 0;
  const canIgnore = selectedStatementCount > 0;
  const canCreate = selectedStatementCount === 1 && selectedSystemCount === 0;

  return (
    <Card className="sticky top-6">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Ações de Conciliação</h3>
            <p className="text-sm text-muted-foreground">
              Selecione transações em ambas as listas para conciliar
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Extrato selecionado:</span>
              <span className="font-semibold">{selectedStatementCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Sistema selecionado:</span>
              <span className="font-semibold">{selectedSystemCount}</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={onMatch}
              disabled={!canMatch}
              className="w-full gap-2"
              variant="default"
            >
              <CheckCircle2 className="w-4 h-4" />
              Conciliar Selecionados
            </Button>

            <Button
              onClick={onCreate}
              disabled={!canCreate}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              Criar Lançamento
            </Button>

            <Button
              onClick={onIgnore}
              disabled={!canIgnore}
              className="w-full gap-2"
              variant="ghost"
            >
              <XCircle className="w-4 h-4" />
              Ignorar
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Selecione uma transação do extrato e uma ou mais do sistema para conciliar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
