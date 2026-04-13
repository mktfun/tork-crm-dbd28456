import { useState } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSinistros, Sinistro } from '@/hooks/useSinistros';
import { SinistroFormModal } from '@/components/sinistros/SinistroFormModal';
import { SinistroDetailsModal } from '@/components/sinistros/SinistroDetailsModal';
import {
  ShieldAlert,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Aberto':
      return 'bg-blue-500';
    case 'Em Análise':
      return 'bg-yellow-500';
    case 'Aprovado':
      return 'bg-green-500';
    case 'Negado':
      return 'bg-red-500';
    case 'Finalizado':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Aberto':
      return <AlertTriangle className="w-4 h-4" />;
    case 'Em Análise':
      return <Clock className="w-4 h-4" />;
    case 'Aprovado':
      return <CheckCircle className="w-4 h-4" />;
    case 'Negado':
      return <XCircle className="w-4 h-4" />;
    case 'Finalizado':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export default function Sinistros() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedSinistro, setSelectedSinistro] = useState<Sinistro | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { data: sinistros = [], isLoading, error, refetch } = useSinistros();

  const handleViewSinistro = (sinistro: any) => {
    setSelectedSinistro(sinistro);
    setDetailsModalOpen(true);
  };

  // Filtros aplicados
  const filteredSinistros = sinistros.filter(sinistro => {
    const matchesSearch =
      sinistro.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sinistro.claim_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sinistro.claim_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sinistro.policy_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'Todos' || sinistro.status === selectedStatus;
    const matchesType = selectedType === 'Todos' || sinistro.claim_type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Estatísticas rápidas
  const stats = {
    total: sinistros.length,
    abertos: sinistros.filter(s => s.status === 'Aberto').length,
    emAnalise: sinistros.filter(s => s.status === 'Em Análise').length,
    aprovados: sinistros.filter(s => s.status === 'Aprovado').length,
    valorTotal: sinistros.reduce((acc, s) => acc + (s.claim_amount || 0), 0)
  };

  const statusOptions = ['Todos', 'Aberto', 'Em Análise', 'Documentação Pendente', 'Aprovado', 'Negado', 'Cancelado', 'Finalizado'];    
  const typeOptions = ['Todos', 'Colisão', 'Roubo', 'Furto', 'Incêndio', 'Danos Elétricos', 'Enchente', 'Granizo', 'Vandalismo', 'Quebra de Vidros', 'Assistência 24h', 'Outros'];

  if (error) {
    return (
      <div className="p-4 md:p-6 h-full overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-6 h-6" />
                Sinistros
              </h1>
              <p className="text-foreground/60">Gerencie ocorrências e processos de sinistro</p>
            </div>
          </div>

          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar sinistros.
              <Button
                variant="link"
                className="p-0 h-auto text-red-400 hover:text-red-300"
                onClick={() => refetch()}
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 h-full">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" />
              Sinistros
            </h1>
            <p className="text-foreground/60">Gerencie ocorrências e processos de sinistro</p>
          </div>
          <SinistroFormModal onSuccess={() => refetch()} />
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <AppCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <ShieldAlert className="w-8 h-8 text-blue-400" />
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Abertos</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.abertos}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Em Análise</p>
                <p className="text-2xl font-bold text-orange-400">{stats.emAnalise}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Aprovados</p>
                <p className="text-2xl font-bold text-green-400">{stats.aprovados}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Valor Total</p>
                <p className="text-lg font-bold text-foreground">
                  {stats.valorTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-400" />
            </div>
          </AppCard>
        </div>

        {/* Filtros */}
        <AppCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input
                placeholder="Buscar por cliente, sinistro ou apólice..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="w-full sm:w-48">
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-48">
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {typeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('Todos');
                  setSelectedType('Todos');
                }}
              >
                <Filter className="w-4 h-4" />
                Limpar
              </Button>
            </div>
          </div>
        </AppCard>

        {/* Lista de Sinistros */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredSinistros.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSinistros.map(sinistro => (
              <AppCard
                key={sinistro.id}
                className="p-5 flex flex-col gap-4 border border-border/40 hover:border-primary/40 transition-colors group cursor-pointer"
                onClick={() => handleViewSinistro(sinistro)}
              >
                <div className="flex justify-between items-start">
                  <Badge className={`${getStatusColor(sinistro.status)} text-white border-0 flex items-center gap-1`}>
                    {getStatusIcon(sinistro.status)}
                    {sinistro.status}
                  </Badge>
                  <p className="text-xs text-foreground/40 font-mono">{sinistro.claim_number}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {sinistro.client_name}
                  </h3>
                  <p className="text-xs text-foreground/60 flex items-center gap-1 mt-1">
                    <FileText className="w-3 h-3" />
                    Apólice: {sinistro.policy_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/30">
                  <div className="flex items-center gap-1.5 text-foreground/60">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(sinistro.occurrence_date)}
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground/60">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {sinistro.claim_type}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    {sinistro.claim_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs group-hover:bg-primary group-hover:text-white transition-colors">
                    Ver detalhes
                    <Eye className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </AppCard>
            ))}
          </div>
        ) : (
          <AppCard className="text-center py-12">
            <ShieldAlert className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {sinistros.length === 0
                ? 'Nenhum sinistro registrado'
                : 'Nenhum sinistro encontrado'}
            </h3>
            <p className="text-foreground/60 mb-6">
              {sinistros.length === 0
                ? 'Registre o primeiro sinistro para começar o gerenciamento.'
                : searchTerm || selectedStatus !== 'Todos' || selectedType !== 'Todos'
                  ? 'Tente ajustar os filtros para encontrar o que procura.'
                  : 'Carregue mais dados ou verifique sua conexão.'}
            </p>
            {sinistros.length === 0 && (
              <SinistroFormModal onSuccess={() => refetch()}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primeiro Sinistro
                </Button>
              </SinistroFormModal>
            )}
            {sinistros.length > 0 && filteredSinistros.length === 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('Todos');
                  setSelectedType('Todos');
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </AppCard>
        )}

        {/* Modal de Detalhes */}
        <SinistroDetailsModal
          sinistro={selectedSinistro}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onSuccess={() => {
            refetch();
            setDetailsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
