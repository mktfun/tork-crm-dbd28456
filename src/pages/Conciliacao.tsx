import { useState } from "react";
import { GitCompare } from "lucide-react";
import { StatementTransactionList } from "@/components/financeiro/conciliacao/StatementTransactionList";
import { SystemTransactionList } from "@/components/financeiro/conciliacao/SystemTransactionList";
import { MatchControls } from "@/components/financeiro/conciliacao/MatchControls";
import {
  mockStatementTransactions,
  mockSystemTransactions,
} from "@/data/mocks/financeiroMocks";
import { toast } from "@/hooks/use-toast";

const Conciliacao = () => {
  const [statementTransactions] = useState(mockStatementTransactions);
  const [systemTransactions] = useState(mockSystemTransactions);
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);

  const handleSelectStatement = (id: string) => {
    setSelectedStatementIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectSystem = (id: string) => {
    setSelectedSystemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleMatch = () => {
    toast({
      title: "Conciliação realizada",
      description: `${selectedStatementIds.length} transação(ões) do extrato conciliada(s) com ${selectedSystemIds.length} lançamento(s) do sistema.`,
    });
    setSelectedStatementIds([]);
    setSelectedSystemIds([]);
  };

  const handleIgnore = () => {
    toast({
      title: "Transações ignoradas",
      description: `${selectedStatementIds.length} transação(ões) marcada(s) como ignorada(s).`,
      variant: "destructive",
    });
    setSelectedStatementIds([]);
  };

  const handleCreate = () => {
    toast({
      title: "Criar lançamento",
      description: "Funcionalidade de criação de lançamento será implementada em breve.",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <GitCompare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conciliação Bancária</h1>
          <p className="text-sm text-muted-foreground">
            Faça o matching entre transações bancárias e lançamentos do sistema
          </p>
        </div>
      </div>

      {/* Grid de Conciliação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Extrato Bancário */}
        <div>
          <StatementTransactionList
            transactions={statementTransactions}
            selectedIds={selectedStatementIds}
            onSelect={handleSelectStatement}
          />
        </div>

        {/* Coluna 2: Lançamentos do Sistema */}
        <div>
          <SystemTransactionList
            transactions={systemTransactions}
            selectedIds={selectedSystemIds}
            onSelect={handleSelectSystem}
          />
        </div>

        {/* Coluna 3: Controles de Matching */}
        <div>
          <MatchControls
            selectedStatementCount={selectedStatementIds.length}
            selectedSystemCount={selectedSystemIds.length}
            onMatch={handleMatch}
            onIgnore={handleIgnore}
            onCreate={handleCreate}
          />
        </div>
      </div>
    </div>
  );
};

export default Conciliacao;
