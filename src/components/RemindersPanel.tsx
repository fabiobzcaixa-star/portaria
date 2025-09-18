import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Bell, 
  Search,
  Send,
  Clock,
  Calendar,
  MessageCircle,
  Users,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getWebhookUrlForCondominium } from "@/config/webhook";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RemindersPanelProps {
  onBack: () => void;
  condominioNome?: string;
}

interface PendingDelivery {
  id: string;
  codigo_retirada: string;
  data_entrega: string;
  observacoes?: string;
  foto_url?: string;
  morador: {
    id: string;
    nome: string;
    telefone: string;
    apartamento: string;
    bloco?: string;
  };
  diasPendente: number;
  ultimoLembrete?: string;
}

export const RemindersPanel = ({ onBack, condominioNome }: RemindersPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDays, setFilterDays] = useState<string>("todos");
  const [deliveries, setDeliveries] = useState<PendingDelivery[]>([]);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("padrao");
  const { toast } = useToast();
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const calculateDaysPending = (dataEntrega: string) => {
    const entregaDate = new Date(dataEntrega);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - entregaDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const loadPendingDeliveries = async () => {
    try {
      setIsLoading(true);
      
      const condominioId = user?.funcionario?.condominio_id;
      if (!condominioId) {
        console.log('⚠️ Usuário não possui condomínio associado');
        setDeliveries([]);
        return;
      }

      console.log('📦 Carregando entregas pendentes para lembretes...');
      
      const { data: entregas, error } = await supabase
        .from('entregas')
        .select(`
          *,
          moradores (
            id,
            nome,
            telefone,
            apartamento,
            bloco
          )
        `)
        .eq('status', 'pendente')
        .eq('condominio_id', condominioId)
        .order('data_entrega', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar entregas:', error);
        throw error;
      }

      const processedDeliveries: PendingDelivery[] = (entregas || []).map(entrega => ({
        id: entrega.id,
        codigo_retirada: entrega.codigo_retirada,
        data_entrega: entrega.data_entrega,
        observacoes: entrega.observacoes,
        foto_url: entrega.foto_url,
        morador: {
          id: entrega.moradores.id,
          nome: entrega.moradores.nome,
          telefone: entrega.moradores.telefone,
          apartamento: entrega.moradores.apartamento,
          bloco: entrega.moradores.bloco,
        },
        diasPendente: calculateDaysPending(entrega.data_entrega),
        ultimoLembrete: (entrega as any).ultimo_lembrete_enviado
      }));

      setDeliveries(processedDeliveries);
      console.log('✅ Entregas pendentes carregadas:', processedDeliveries.length);
      
    } catch (error) {
      console.error('❌ Erro ao carregar entregas:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar entregas pendentes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.funcionario?.condominio_id) {
      loadPendingDeliveries();
    }
  }, [user]);

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.morador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.morador.apartamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.codigo_retirada.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDays = filterDays === "todos" || 
                       (filterDays === "1" && delivery.diasPendente >= 1) ||
                       (filterDays === "2" && delivery.diasPendente >= 2) ||
                       (filterDays === "3" && delivery.diasPendente >= 3) ||
                       (filterDays === "5" && delivery.diasPendente >= 5);
    
    return matchesSearch && matchesDays;
  });

  const handleSelectAll = () => {
    if (selectedDeliveries.length === filteredDeliveries.length) {
      setSelectedDeliveries([]);
    } else {
      setSelectedDeliveries(filteredDeliveries.map(d => d.id));
    }
  };

  const handleSelectDelivery = (deliveryId: string) => {
    setSelectedDeliveries(prev => 
      prev.includes(deliveryId)
        ? prev.filter(id => id !== deliveryId)
        : [...prev, deliveryId]
    );
  };

  const getMessageTemplate = (delivery: PendingDelivery) => {
    const apartamento = delivery.morador.bloco ? 
      `${delivery.morador.bloco}-${delivery.morador.apartamento}` : 
      delivery.morador.apartamento;

    switch (messageTemplate) {
      case "padrao":
        return `🏢 *${condominioNome || 'Condomínio'}*

📦 *Lembrete de Encomenda*

Olá *${delivery.morador.nome}*, você tem uma encomenda aguardando retirada na portaria há ${delivery.diasPendente} ${delivery.diasPendente === 1 ? 'dia' : 'dias'}.

🔑 Código: ${delivery.codigo_retirada}
🏠 Apartamento: ${apartamento}
📅 Recebida em: ${new Date(delivery.data_entrega).toLocaleDateString('pt-BR')}

Por favor, retire sua encomenda o quanto antes.

Não responda esta mensagem, este é um atendimento automático.`;
      
      case "urgente":
        return `⚠️ *${condominioNome || 'Condomínio'}* - URGENTE

📦 *Encomenda Aguardando Retirada*

*${delivery.morador.nome}*, sua encomenda está na portaria há ${delivery.diasPendente} ${delivery.diasPendente === 1 ? 'dia' : 'dias'} e precisa ser retirada urgentemente.

🔑 Código: ${delivery.codigo_retirada}
🏠 Apartamento: ${apartamento}

⏰ Por favor, retire hoje mesmo!

Não responda esta mensagem, este é um atendimento automático.`;
      
      case "personalizado":
        return customMessage.replace(/\[NOME\]/g, delivery.morador.nome)
                          .replace(/\[CODIGO\]/g, delivery.codigo_retirada)
                          .replace(/\[APARTAMENTO\]/g, apartamento)
                          .replace(/\[DIAS\]/g, delivery.diasPendente.toString())
                          .replace(/\[DATA\]/g, new Date(delivery.data_entrega).toLocaleDateString('pt-BR'))
                          .replace(/\[CONDOMINIO\]/g, condominioNome || 'Condomínio');
      
      default:
        return "";
    }
  };

  const sendReminders = async () => {
    if (selectedDeliveries.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos uma entrega para enviar lembrete.",
      });
      return;
    }

    try {
      setIsLoading(true);
      let successCount = 0;

      for (const deliveryId of selectedDeliveries) {
        const delivery = deliveries.find(d => d.id === deliveryId);
        if (!delivery) continue;

        const message = getMessageTemplate(delivery);

        try {
          // 🚀 TENTAR WEBHOOK DIRETO PRIMEIRO (já que sabemos que funciona)
          console.log('🔗 Tentando webhook direto primeiro para lembrete...');

          // Buscar dados do condomínio para usar webhook correto
          let condominioData = null;
          try {
            const { data: condominio } = await supabase
              .from('condominios')
              .select('*')
              .eq('id', user.funcionario.condominio_id)
              .maybeSingle();
            condominioData = condominio;
            console.log('🏢 Dados do condomínio:', condominioData);
          } catch (err) {
            console.warn('⚠️ Erro ao buscar condomínio, usando webhook global:', err);
          }

          const webhookUrl = getWebhookUrlForCondominium(condominioData);
          console.log('🌐 URL do webhook escolhida:', webhookUrl);

          try {
            const directResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: delivery.morador.telefone,
                message: message,
                type: 'reminder',
                reminderData: {
                  codigo: delivery.codigo_retirada,
                  morador: delivery.morador.nome,
                  apartamento: delivery.morador.apartamento,
                  bloco: delivery.morador.bloco,
                  diasPendente: delivery.diasPendente,
                  condominio: condominioNome || 'Condomínio'
                }
              })
            });
            
            if (directResponse.ok) {
              console.log('✅ Lembrete enviado via webhook direto para:', delivery.morador.nome);
            } else {
              console.error('❌ Webhook direto falhou, tentando Supabase function...', directResponse.status);
              throw new Error(`Webhook direto falhou: ${directResponse.status}`);
            }
          } catch (directError) {
            console.error('❌ Erro no webhook direto, tentando Supabase function como fallback...', directError);
            
            // 🚑 FALLBACK: Tentar Supabase Function
            const response = await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: delivery.morador.telefone,
                message: message,
                type: 'reminder',
                reminderData: {
                  codigo: delivery.codigo_retirada,
                  morador: delivery.morador.nome,
                  apartamento: delivery.morador.apartamento,
                  bloco: delivery.morador.bloco,
                  diasPendente: delivery.diasPendente,
                  condominio: condominioNome || 'Condomínio'
                }
              }),
            });

            if (response.ok) {
              console.log('✅ Lembrete enviado via Supabase para:', delivery.morador.nome);
            } else {
              console.error('❌ Falha no Supabase também');
              const errorText = await response.text();
              console.error('❌ Detalhes do erro Supabase:', errorText);
              throw new Error(`Ambos os métodos falharam. Supabase: ${response.status} - ${errorText}`);
            }
          }

          // Atualizar último lembrete enviado no banco
          await supabase
            .from('entregas')
            .update({ 
              ultimo_lembrete_enviado: new Date().toISOString() 
            } as any)
            .eq('id', deliveryId);

          successCount++;
        } catch (error) {
          console.error('❌ Erro ao enviar lembrete para:', delivery.morador.nome, error);
        }
      }

      toast({
        title: "Lembretes enviados!",
        description: `${successCount} de ${selectedDeliveries.length} lembretes enviados com sucesso.`,
      });

      setSelectedDeliveries([]);
      await loadPendingDeliveries(); // Recarregar dados

    } catch (error) {
      console.error('❌ Erro geral ao enviar lembretes:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao enviar lembretes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysColor = (days: number) => {
    if (days >= 5) return "text-red-600";
    if (days >= 3) return "text-orange-600";
    if (days >= 2) return "text-yellow-600";
    return "text-gray-600";
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-none">
      {/* Header */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader className="py-3 pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground h-9 px-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-base">Voltar</span>
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Lembretes de Encomendas
              </h1>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pendentes
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{deliveries.length}</p>
              </div>
              <Bell className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Selecionadas
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{selectedDeliveries.length}</p>
              </div>
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Para Enviar
                </p>
                <p className="text-xl sm:text-2xl font-bold text-success">{selectedDeliveries.length}</p>
              </div>
              <Send className="h-6 w-6 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por morador, apartamento ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 text-base"
                  />
                </div>
              </div>
              
              <Select value={filterDays} onValueChange={setFilterDays}>
                <SelectTrigger className="w-full lg:w-[200px] h-10 text-base">
                  <SelectValue placeholder="Filtrar por dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os dias</SelectItem>
                  <SelectItem value="1">1+ dias</SelectItem>
                  <SelectItem value="2">2+ dias</SelectItem>
                  <SelectItem value="3">3+ dias</SelectItem>
                  <SelectItem value="5">5+ dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2 h-10 text-base"
              >
                <Filter className="h-5 w-5" />
                {selectedDeliveries.length === filteredDeliveries.length ? 'Desmarcar' : 'Selecionar'} Todas
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={selectedDeliveries.length === 0}
                    className="flex items-center gap-2 h-10 text-base"
                  >
                    <Send className="h-5 w-5" />
                    Enviar Lembretes ({selectedDeliveries.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Configurar Lembrete</DialogTitle>
                    <DialogDescription className="text-base">
                      Configure a mensagem que será enviada para {selectedDeliveries.length} {selectedDeliveries.length === 1 ? 'entrega selecionada' : 'entregas selecionadas'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base">Modelo de Mensagem</Label>
                      <Select value={messageTemplate} onValueChange={setMessageTemplate}>
                        <SelectTrigger className="h-10 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="padrao">Lembrete Padrão</SelectItem>
                          <SelectItem value="urgente">Lembrete Urgente</SelectItem>
                          <SelectItem value="personalizado">Mensagem Personalizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {messageTemplate === "personalizado" && (
                      <div className="space-y-2">
                        <Label className="text-base">Mensagem Personalizada</Label>
                        <Textarea
                          placeholder="Digite sua mensagem... Use [NOME], [CODIGO], [APARTAMENTO], [DIAS], [DATA], [CONDOMINIO] para substituições automáticas"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          rows={6}
                          className="text-base"
                        />
                        <p className="text-sm text-muted-foreground">
                          Variáveis disponíveis: [NOME], [CODIGO], [APARTAMENTO], [DIAS], [DATA], [CONDOMINIO]
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="text-base">Prévia da Mensagem</Label>
                      <div className="bg-muted p-4 rounded-lg text-base max-h-40 overflow-y-auto">
                        {selectedDeliveries.length > 0 && (
                          <pre className="whitespace-pre-wrap">
                            {getMessageTemplate(deliveries.find(d => d.id === selectedDeliveries[0])!)}
                          </pre>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-base h-10">Cancelar</Button>
                      </DialogTrigger>
                      <Button onClick={sendReminders} disabled={isLoading} className="text-base h-10">
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5 mr-2" />
                            Enviar Lembretes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <div className="space-y-3">
        {isLoading && !deliveries.length && (
          <Card className="shadow-card bg-gradient-card">
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Carregando entregas pendentes...
            </CardContent>
          </Card>
        )}

        {filteredDeliveries.length === 0 && !isLoading && (
          <Card className="shadow-card bg-gradient-card">
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma entrega encontrada
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterDays !== "todos" 
                  ? "Tente ajustar os filtros de busca."
                  : "Todas as entregas foram retiradas! 🎉"
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Desktop Grid Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {filteredDeliveries.map((delivery) => (
              <Card key={delivery.id} className="shadow-card bg-gradient-card hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDeliveries.includes(delivery.id)}
                      onCheckedChange={() => handleSelectDelivery(delivery.id)}
                      className="mt-1 flex-shrink-0 h-5 w-5"
                    />
                    
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {getInitials(delivery.morador.nome)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-base truncate">
                          {delivery.morador.nome}
                        </h3>
                        <Badge 
                          variant="outline"
                          className={`flex items-center gap-1 text-sm py-1 px-2 flex-shrink-0 ${getDaysColor(delivery.diasPendente)}`}
                        >
                          <Clock className="h-4 w-4" />
                          {delivery.diasPendente} {delivery.diasPendente === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-sm">
                            {delivery.morador.bloco ? 
                              `${delivery.morador.bloco}-${delivery.morador.apartamento}` : 
                              delivery.morador.apartamento
                            }
                          </Badge>
                          <Badge variant="outline" className="text-sm font-mono">
                            {delivery.codigo_retirada}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          📱 {delivery.morador.telefone}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          📅 Recebida: {new Date(delivery.data_entrega).toLocaleDateString('pt-BR')}
                        </p>
                        {delivery.ultimoLembrete && (
                          <p className="text-sm text-green-600 truncate">
                            🔔 Último lembrete: {new Date(delivery.ultimoLembrete).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-sm"
                        onClick={() => handleSelectDelivery(delivery.id)}
                      >
                        {selectedDeliveries.includes(delivery.id) ? 'Remover' : 'Selecionar'} para Lembrete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet List Layout */}
        <div className="lg:hidden space-y-3">
          {filteredDeliveries.map((delivery) => (
            <Card key={delivery.id} className="shadow-card bg-gradient-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedDeliveries.includes(delivery.id)}
                    onCheckedChange={() => handleSelectDelivery(delivery.id)}
                    className="flex-shrink-0 h-5 w-5"
                  />
                  
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {getInitials(delivery.morador.nome)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-base truncate">
                        {delivery.morador.nome}
                      </h3>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {delivery.morador.bloco ? 
                          `${delivery.morador.bloco}-${delivery.morador.apartamento}` : 
                          delivery.morador.apartamento
                        }
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {delivery.morador.telefone} • {delivery.codigo_retirada}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Há {delivery.diasPendente} {delivery.diasPendente === 1 ? 'dia' : 'dias'}
                    </p>
                    {delivery.ultimoLembrete && (
                      <p className="text-sm text-green-600 truncate mt-1">
                        🔔 Último: {new Date(delivery.ultimoLembrete).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  
                  <Badge 
                    variant="outline"
                    className={`${getDaysColor(delivery.diasPendente)} text-sm`}
                  >
                    {delivery.diasPendente}d
                  </Badge>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 mt-3 text-sm"
                  onClick={() => handleSelectDelivery(delivery.id)}
                >
                  {selectedDeliveries.includes(delivery.id) ? 'Remover' : 'Selecionar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};