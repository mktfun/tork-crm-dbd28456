import * as React from 'react';
import { Users, Building2, MapPin, Wallet, X, Plus, Loader2, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/jjseguros/components/ui/card';
import { Button } from '@/modules/jjseguros/components/ui/button';
import { Input } from '@/modules/jjseguros/components/ui/input';
import { Label } from '@/modules/jjseguros/components/ui/label';
import { Switch } from '@/modules/jjseguros/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/modules/jjseguros/components/ui/radio-group';
import { Alert, AlertDescription } from '@/modules/jjseguros/components/ui/alert';
import { Badge } from '@/modules/jjseguros/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/jjseguros/components/ui/select';
import { brazilianStatesWithCities, getCitiesByState, getCityLabel } from '@/modules/jjseguros/utils/brazilianCities';
import { useToast } from '@/modules/jjseguros/hooks/use-toast';
import { saveSettings, type IntegrationSettings } from '@/modules/jjseguros/utils/settings';
import type { LocationEntry } from '@/modules/jjseguros/utils/qualification';

interface Props {
  settings: IntegrationSettings | null;
  isLoading: boolean;
  onSaved: () => void;
}

export const HealthQualificationConfig: React.FC<Props> = ({ settings, isLoading, onSaved }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  
  // State for all qualification fields
  const [ageMin, setAgeMin] = React.useState(0);
  const [ageMax, setAgeMax] = React.useState(65);
  const [livesMin, setLivesMin] = React.useState(1);
  const [livesMax, setLivesMax] = React.useState(99);
  const [acceptCPF, setAcceptCPF] = React.useState(true);
  const [acceptCNPJ, setAcceptCNPJ] = React.useState(true);
  const [cnpjMinEmployees, setCnpjMinEmployees] = React.useState(2);
  const [cpfRequireHigherEdu, setCpfRequireHigherEdu] = React.useState(false);
  const [regionMode, setRegionMode] = React.useState<'allow_all' | 'allow_list' | 'block_list'>('allow_all');
  const [regionLocations, setRegionLocations] = React.useState<LocationEntry[]>([]);
  const [budgetMin, setBudgetMin] = React.useState(0);
  
  // State for adding new location
  const [selectedState, setSelectedState] = React.useState('');
  const [selectedCity, setSelectedCity] = React.useState('');

  // Sync with settings
  React.useEffect(() => {
    if (settings) {
      setAgeMin(settings.health_age_limit_min ?? 0);
      setAgeMax(settings.health_age_limit_max ?? 65);
      setLivesMin(settings.health_lives_min ?? 1);
      setLivesMax(settings.health_lives_max ?? 99);
      setAcceptCPF(settings.health_accept_cpf ?? true);
      setAcceptCNPJ(settings.health_accept_cnpj ?? true);
      setCnpjMinEmployees(settings.health_cnpj_min_employees ?? 2);
      setCpfRequireHigherEdu(settings.health_cpf_require_higher_education ?? false);
      setRegionMode((settings.health_region_mode as any) ?? 'allow_all');
      
      // Carregar locations (novo formato) ou converter do legado
      if (settings.health_region_locations && settings.health_region_locations.length > 0) {
        setRegionLocations(settings.health_region_locations);
      } else if (settings.health_region_states && settings.health_region_states.length > 0) {
        // Converter formato legado
        setRegionLocations(settings.health_region_states.map(s => ({ state: s })));
      } else {
        setRegionLocations([]);
      }
      
      setBudgetMin(settings.health_budget_min ?? 0);
    }
  }, [settings]);

  const handleAddLocation = () => {
    if (!selectedState) return;
    
    // "all" significa todo o estado (sem cidade específica)
    const cityValue = selectedCity === 'all' ? undefined : selectedCity || undefined;
    
    const newLocation: LocationEntry = {
      state: selectedState,
      city: cityValue,
    };
    
    // Verificar se já existe
    const exists = regionLocations.some(loc => 
      loc.state === newLocation.state && loc.city === newLocation.city
    );
    
    if (!exists) {
      setRegionLocations([...regionLocations, newLocation]);
    }
    
    setSelectedState('');
    setSelectedCity('');
  };

  const handleRemoveLocation = (index: number) => {
    setRegionLocations(regionLocations.filter((_, i) => i !== index));
  };

  const getLocationLabel = (loc: LocationEntry): string => {
    const stateInfo = brazilianStatesWithCities.find(s => s.value === loc.state);
    const stateLabel = stateInfo?.label ?? loc.state;
    
    if (loc.city) {
      const cityLabel = getCityLabel(loc.state, loc.city);
      return `${cityLabel} - ${loc.state}`;
    }
    
    return `${stateLabel} (todo estado)`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const success = await saveSettings({
      health_age_limit_min: ageMin,
      health_age_limit_max: ageMax,
      health_lives_min: livesMin,
      health_lives_max: livesMax,
      health_accept_cpf: acceptCPF,
      health_accept_cnpj: acceptCNPJ,
      health_cnpj_min_employees: cnpjMinEmployees,
      health_cpf_require_higher_education: cpfRequireHigherEdu,
      health_region_mode: regionMode,
      health_region_locations: regionLocations,
      health_budget_min: budgetMin,
    });

    if (success) {
      toast({
        title: 'Configurações salvas',
        description: 'Qualificação SDR atualizada com sucesso.',
      });
      onSaved();
    } else {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const availableCities = selectedState ? getCitiesByState(selectedState) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Qualificação SDR - Plano de Saúde
        </CardTitle>
        <CardDescription>
          Configure os critérios para qualificação automática de leads (Shadow Filters).
          Leads que não passarem serão salvos como desqualificados silenciosamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Section: Vidas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            Vidas e Idade
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age-min">Idade mínima</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="age-min"
                  type="number"
                  min="0"
                  max="100"
                  value={ageMin}
                  onChange={(e) => setAgeMin(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">anos</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age-max">Idade máxima</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="age-max"
                  type="number"
                  min="0"
                  max="120"
                  value={ageMax}
                  onChange={(e) => setAgeMax(parseInt(e.target.value) || 65)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">anos</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lives-min">Mín. de vidas</Label>
              <Input
                id="lives-min"
                type="number"
                min="1"
                max="99"
                value={livesMin}
                onChange={(e) => setLivesMin(parseInt(e.target.value) || 1)}
                className="w-20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lives-max">Máx. de vidas</Label>
              <Input
                id="lives-max"
                type="number"
                min="1"
                max="999"
                value={livesMax}
                onChange={(e) => setLivesMax(parseInt(e.target.value) || 99)}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Section: Contratação */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Contratação
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">Aceitar Pessoa Física (CPF)</p>
                <p className="text-sm text-muted-foreground">Permitir leads com contratação via CPF</p>
              </div>
              <Switch checked={acceptCPF} onCheckedChange={setAcceptCPF} />
            </div>
            
            {acceptCPF && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50 ml-6">
                <div>
                  <p className="font-medium">Exigir Ensino Superior</p>
                  <p className="text-sm text-muted-foreground">Leads PF devem ter graduação ou superior</p>
                </div>
                <Switch checked={cpfRequireHigherEdu} onCheckedChange={setCpfRequireHigherEdu} />
              </div>
            )}
            
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">Aceitar Pessoa Jurídica (CNPJ)</p>
                <p className="text-sm text-muted-foreground">Permitir leads com contratação via CNPJ</p>
              </div>
              <Switch checked={acceptCNPJ} onCheckedChange={setAcceptCNPJ} />
            </div>
            
          </div>
        </div>

        {/* Section: Região */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Região (Estado + Cidade)
          </div>
          
          <RadioGroup
            value={regionMode}
            onValueChange={(value) => setRegionMode(value as any)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="allow_all" id="allow_all" />
              <Label htmlFor="allow_all" className="cursor-pointer">
                Aceitar todas as regiões
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="allow_list" id="allow_list" />
              <Label htmlFor="allow_list" className="cursor-pointer">
                Aceitar <strong>APENAS</strong> essas regiões
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="block_list" id="block_list" />
              <Label htmlFor="block_list" className="cursor-pointer">
                <strong>BLOQUEAR</strong> essas regiões
              </Label>
            </div>
          </RadioGroup>
          
          {regionMode !== 'allow_all' && (
            <div className="space-y-4 pt-2">
              {/* Seletor de Estado + Cidade */}
              <div className="flex flex-wrap gap-2">
                <Select value={selectedState} onValueChange={(v) => {
                  setSelectedState(v);
                  setSelectedCity(''); // Reset city when state changes
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStatesWithCities.map(state => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label} ({state.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={selectedCity} 
                  onValueChange={setSelectedCity}
                  disabled={!selectedState}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder={selectedState ? "Cidade (opcional)" : "Selecione um estado"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o estado</SelectItem>
                    {availableCities.map(city => (
                      <SelectItem key={city.value} value={city.value}>
                        {city.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleAddLocation}
                  disabled={!selectedState}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                💡 Selecione um estado e opcionalmente uma cidade. Deixe "Todo o estado" para filtrar o estado inteiro.
              </p>
              
              {regionLocations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {regionLocations.map((loc, index) => (
                    <Badge 
                      key={`${loc.state}-${loc.city || 'all'}-${index}`} 
                      variant={loc.city ? 'default' : 'secondary'} 
                      className="gap-1 pr-1"
                    >
                      {getLocationLabel(loc)}
                      <button
                        onClick={() => handleRemoveLocation(index)}
                        className="ml-1 hover:bg-muted rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma região selecionada. Adicione estados ou cidades acima.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section: Orçamento */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            Orçamento
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="budget-min">Orçamento mínimo por vida</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                id="budget-min"
                type="number"
                min="0"
                step="50"
                value={budgetMin}
                onChange={(e) => setBudgetMin(parseInt(e.target.value) || 0)}
                className="w-28"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leads com orçamento abaixo deste valor serão desqualificados.
              Use 0 para desativar.
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Shadow Filter:</strong> Leads que não passarem nos critérios serão salvos normalmente,
            mas marcados como <code className="bg-muted px-1 rounded">is_qualified: false</code>.
            Eventos de conversão (Meta Pixel) só disparam para leads qualificados.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Qualificação SDR'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
