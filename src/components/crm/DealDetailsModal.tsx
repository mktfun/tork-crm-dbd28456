import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CRMDeal, useCRMDeals, useCRMStages } from '@/hooks/useCRMDeals';
import { formatCurrency } from '@/utils/formatCurrency';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ExternalLink, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  MessageCircle,
  Save,
  Loader2,
  Trash2,
  Clock,
  Plus,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface DealDetailsModalProps {
  deal: CRMDeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatTorkConfig {
  chatwoot_url: string;
  chatwoot_account_id: string;
}

interface DealNote {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  author_name?: string;
}

export function DealDetailsModal({ deal, open, onOpenChange }: DealDetailsModalProps) {
  const { user } = useAuth();
  const { updateDeal, deleteDeal } = useCRMDeals();
  const { stages } = useCRMStages();
  const [chatTorkConfig, setChatTorkConfig] = useState<ChatTorkConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    expected_close_date: '',
    notes: '',
    stage_id: ''
  });

  // Timeline state
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchChatTorkConfig();
    }
  }, [user, open]);

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title || '',
        value: deal.value?.toString() || '',
        expected_close_date: deal.expected_close_date || '',
        notes: deal.notes || '',
        stage_id: deal.stage_id || ''
      });
      setIsEditing(false);
      setActiveTab('details');
    }
  }, [deal]);

  const fetchNotes = useCallback(async () => {
    if (!deal) return;
    setLoadingNotes(true);
    try {
      const { data, error } = await (supabase as any)
        .from('crm_deal_notes')
        .select('id, content, created_by, created_at')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author names
      const authorIds = [...new Set((data || []).map((n: any) => n.created_by as string))];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', authorIds);
        if (profiles) {
          authorMap = Object.fromEntries(profiles.map(p => [p.id, p.nome_completo]));
        }
      }

      setNotes((data || []).map((n: any) => ({
        id: n.id,
        content: n.content,
        created_by: n.created_by,
        created_at: n.created_at,
        author_name: authorMap[n.created_by] || 'Usuário'
      })));
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, [deal]);

  useEffect(() => {
    if (activeTab === 'history' && deal) {
      fetchNotes();
    }
  }, [activeTab, deal, fetchNotes]);

  const fetchChatTorkConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_settings')
        .select('chatwoot_url, chatwoot_account_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!error && data?.chatwoot_url && data?.chatwoot_account_id) {
        setChatTorkConfig(data as ChatTorkConfig);
      }
    } catch (error) {
      console.error('Error fetching Chat Tork config:', error);
    }
  };

  const chatTorkUrl = deal?.chatwoot_conversation_id && chatTorkConfig
    ? `${chatTorkConfig.chatwoot_url}/app/accounts/${chatTorkConfig.chatwoot_account_id}/conversations/${deal.chatwoot_conversation_id}`
    : null;

  const handleSave = async () => {
    if (!deal) return;
    setSaving(true);
    try {
      await updateDeal.mutateAsync({
        id: deal.id,
        title: formData.title,
        value: parseFloat(formData.value) || 0,
        expected_close_date: formData.expected_close_date || null,
        notes: formData.notes || null,
        stage_id: formData.stage_id
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating deal:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    if (confirm('Tem certeza que deseja excluir este negócio?')) {
      await deleteDeal.mutateAsync({
        id: deal.id,
        title: deal.title,
        client_id: deal.client_id
      });
      onOpenChange(false);
    }
  };

  const handleAddNote = async () => {
    if (!deal || !newNote.trim() || !user) return;
    setAddingNote(true);
    try {
      const { error } = await (supabase as any)
        .from('crm_deal_notes')
        .insert({
          deal_id: deal.id,
          content: newNote.trim(),
          created_by: user.id
        });
      if (error) throw error;
      setNewNote('');
      toast.success('Nota adicionada!');
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erro ao adicionar nota');
    } finally {
      setAddingNote(false);
    }
  };

  const currentStage = stages.find(s => s.id === deal?.stage_id);

  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[600px] w-[90vw] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            {currentStage && (
              <div 
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: currentStage.color }}
              />
            )}
            <span className="truncate">{isEditing ? 'Editar Negócio' : deal.title}</span>
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mb-2">
            <TabsTrigger value="details" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="flex-1 overflow-auto px-6 pb-6 mt-0">
            <div className="space-y-4">
              {/* Client Info */}
              {deal.client && (
                <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{deal.client.name}</span>
                  </div>
                  {deal.client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{deal.client.phone}</span>
                    </div>
                  )}
                  {deal.client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{deal.client.email}</span>
                    </div>
                  )}
                </div>
              )}

              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Título</Label>
                    <Input
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-stage">Etapa</Label>
                    <Select
                      value={formData.stage_id}
                      onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-value">Valor (R$)</Label>
                      <Input
                        id="edit-value"
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-date">Previsão</Label>
                      <Input
                        id="edit-date"
                        type="date"
                        value={formData.expected_close_date}
                        onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Observações</Label>
                    <Textarea
                      id="edit-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-foreground">
                        {formatCurrency(deal.value || 0)}
                      </span>
                    </div>
                    {deal.expected_close_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(deal.expected_close_date), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  {currentStage && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Etapa:</span>
                      <div 
                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: currentStage.color }}
                      >
                        {currentStage.name}
                      </div>
                    </div>
                  )}

                  {deal.notes && (
                    <div className="p-3 rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground">{deal.notes}</p>
                    </div>
                  )}

                  {deal.chatwoot_conversation_id && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <span>Sincronizado com Tork</span>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {chatTorkUrl && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={chatTorkUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Abrir no Tork
                      <ExternalLink className="h-3.5 w-3.5 ml-2" />
                    </a>
                  </Button>
                )}

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                      <Button className="flex-1" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                      <Button className="flex-1" onClick={() => setIsEditing(true)}>
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="flex-1 flex flex-col min-h-0 px-6 pb-6 mt-0">
            {/* Add note form */}
            <div className="space-y-2 mb-4">
              <Textarea
                placeholder="Escreva uma anotação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                size="sm"
                className="w-full"
              >
                {addingNote ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar Nota
              </Button>
            </div>

            {/* Notes timeline */}
            <ScrollArea className="flex-1">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma anotação ainda.
                </div>
              ) : (
                <div className="relative ml-3">
                  {/* Timeline line */}
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary/20" />
                  
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="relative pl-6">
                        {/* Timeline dot */}
                        <div className="absolute left-[-4px] top-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                        
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{note.author_name}</span>
                            <span>·</span>
                            <span>
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
