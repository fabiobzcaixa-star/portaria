import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle, 
  Search,
  Clock,
  AlertCircle,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getWebhookUrlForCondominium } from "@/config/webhook";

interface WithdrawalPanelProps {
  onBack: () => void;
  onChange?: () => void;
  condominioNome?: string;
}

interface Delivery {
  id: string;
  resident: {
    id: string;
    name: string;
    phone: string;
    role?: string;
  };
  apartmentInfo: {
    bloco: string;
    apartamento: string;
  };
  withdrawalCode: string;
  photo: string;
  observations: string;
  timestamp: string;
  status: string;
}

export const WithdrawalPanel = ({ onBack, onChange, condominioNome }: WithdrawalPanelProps) => {
  const [withdrawalCode, setWithdrawalCode] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [foundDelivery, setFoundDelivery] = useState<Delivery | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [withdrawalDescription, setWithdrawalDescription] = useState("");
  const { toast } = useToast();
  const { user } = useAuth(); // Obter usuário logado

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const loadPendingDeliveries = async () => {
    try {
      // Obter ID do condomínio do usuário logado
      const condominioId = user?.funcionario?.condominio_id;
      if (!condominioId) {
        console.log('⚠️ Usuário não possui condomínio associado');
        setDeliveries([]);
        return;
      }
      
      // Carregar do Supabase
      console.log('📦 Carregando entregas pendentes do Supabase...');
      console.log('🏢 Filtrando por condomínio:', condominioId);
      
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
        .order('data_entrega', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar do Supabase:', error);
      } else {
        console.log('✅ Entregas carregadas do Supabase:', entregas?.length || 0);
      }

      // Converter entregas do Supabase para o formato Delivery
      const supabaseDeliveries: Delivery[] = (entregas || []).map(entrega => ({
        id: entrega.id,
        resident: {
          id: entrega.moradores.id,
          name: entrega.moradores.nome,
          phone: entrega.moradores.telefone,
        },
        apartmentInfo: {
          bloco: entrega.moradores.bloco || '',
          apartamento: entrega.moradores.apartamento,
        },
        withdrawalCode: entrega.codigo_retirada,
        photo: entrega.foto_url || '',
        observations: entrega.observacoes || '',
        timestamp: entrega.data_entrega,
        status: entrega.status
      }));

      // Carregar do localStorage também
      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      const localDeliveries = savedDeliveries.filter((d: Delivery) => d.status === 'pendente');

      // Combinar e remover duplicatas (priorizar Supabase)
      const allDeliveries = [...supabaseDeliveries];
      
      // Adicionar entregas do localStorage que não estão no Supabase
      localDeliveries.forEach((localDelivery: Delivery) => {
        const exists = allDeliveries.some(d => d.withdrawalCode === localDelivery.withdrawalCode);
        if (!exists) {
          allDeliveries.push(localDelivery);
        }
      });

      console.log('📊 Total de entregas pendentes:', allDeliveries.length);
      setDeliveries(allDeliveries);
      
    } catch (error) {
      console.error('❌ Erro ao carregar entregas:', error);
      
      // Fallback para localStorage apenas
      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      const pending = savedDeliveries.filter((d: Delivery) => d.status === 'pendente');
      setDeliveries(pending);
    }
  };

  useEffect(() => {
    if (user?.funcionario?.condominio_id) {
      loadPendingDeliveries();
    }
  }, [user]);

  const searchByCodeDirect = async (code: string) => {
    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "Digite um código",
        description: "Por favor, digite o código de retirada.",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Buscar no Supabase primeiro
      console.log('🔍 Buscando entrega no Supabase com código:', code.trim());
      
      const { data: entrega, error: searchError } = await supabase
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
        .eq('codigo_retirada', code.trim())
        .single();

      if (searchError) {
        console.error('❌ Erro ao buscar no Supabase:', searchError);
        
        // Se não encontrar no Supabase, buscar no localStorage
        const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
        const delivery = savedDeliveries.find((d: Delivery) => 
          d.withdrawalCode === code.trim()
        );
        
        if (delivery) {
          console.log('✅ Entrega encontrada no localStorage:', delivery);
          setFoundDelivery(delivery);
          toast({
            title: "Encomenda encontrada!",
            description: `Encomenda para ${delivery.resident.name} (local)`,
          });
        } else {
          // Tentar buscar todas as entregas com este código para debug
          const { data: todasEntregas } = await supabase
            .from('entregas')
            .select('codigo_retirada, status, created_at')
            .eq('codigo_retirada', code.trim());
          
          console.log('🔍 Debug - Todas as entregas com este código:', todasEntregas);
          
          toast({
            variant: "destructive",
            title: "Código não encontrado",
            description: "Código inválido ou encomenda não registrada.",
          });
        }
      } else {
        console.log('✅ Entrega encontrada no Supabase:', entrega);
        
        // Converter entrega do Supabase para o formato Delivery
        const delivery: Delivery = {
          id: entrega.id,
          resident: {
            id: entrega.moradores.id,
            name: entrega.moradores.nome,
            phone: entrega.moradores.telefone,
          },
          apartmentInfo: {
            bloco: entrega.moradores.bloco || '',
            apartamento: entrega.moradores.apartamento,
          },
          withdrawalCode: entrega.codigo_retirada,
          photo: entrega.foto_url || '',
          observations: entrega.observacoes || '',
          timestamp: entrega.data_entrega,
          status: entrega.status
        };
        
        setFoundDelivery(delivery);
        toast({
          title: "Encomenda encontrada!",
          description: `Encomenda para ${delivery.resident.name}`,
        });
      }
    } catch (error) {
      console.error('❌ Erro durante a busca:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao buscar encomenda.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchByCode = async () => {
    return searchByCodeDirect(withdrawalCode);
  };


  const confirmWithdrawal = async () => {
    if (!foundDelivery) {
      toast({
        variant: "destructive",
        title: "Encomenda não encontrada",
        description: "Por favor, busque uma encomenda primeiro.",
      });
      return;
    }

    try {
      // Atualizar status no localStorage
      const savedDeliveries = JSON.parse(localStorage.getItem('deliveries') || '[]');
      const updatedDeliveries = savedDeliveries.map((d: Delivery) =>
        d.id === foundDelivery.id 
          ? { ...d, status: 'retirada', withdrawalTimestamp: new Date().toISOString(), withdrawalDescription }
          : d
      );
      
      localStorage.setItem('deliveries', JSON.stringify(updatedDeliveries));

      // Buscar e atualizar no Supabase pelo código de retirada
      try {
        console.log('🔍 Buscando entrega no Supabase com código:', foundDelivery.withdrawalCode);
        console.log('🔍 Status atual da entrega:', foundDelivery.status);
        
        // Primeiro, buscar a entrega pelo código de retirada (sem filtro de status)
        const { data: entrega, error: searchError } = await supabase
          .from('entregas')
          .select('*')
          .eq('codigo_retirada', foundDelivery.withdrawalCode)
          .single();

        if (searchError) {
          console.error('❌ Erro ao buscar entrega no Supabase:', searchError);
          
          // Tentar buscar sem o filtro single() para ver se existe
          const { data: todasEntregas, error: listError } = await supabase
            .from('entregas')
            .select('*')
            .eq('codigo_retirada', foundDelivery.withdrawalCode);
          
          console.log('🔍 Todas as entregas com este código:', todasEntregas);
          
          toast({ 
            variant: 'destructive', 
            title: 'Erro', 
            description: `Falha ao buscar entrega no banco de dados: ${searchError.message}` 
          });
          return;
        }

        if (!entrega) {
          console.log('⚠️ Entrega não encontrada no Supabase');
          toast({ 
            variant: 'destructive', 
            title: 'Erro', 
            description: 'Entrega não encontrada no banco de dados.' 
          });
          return;
        }

        console.log('✅ Entrega encontrada no Supabase:', entrega);
        console.log('📊 Status atual no banco:', entrega.status);

        // Verificar se já foi retirada
        if (entrega.status === 'retirada') {
          toast({ 
            variant: 'destructive', 
            title: 'Encomenda já retirada', 
            description: 'Esta encomenda já foi retirada anteriormente.' 
          });
          return;
        }

        // Atualizar a entrega no Supabase
        const { error: updateError } = await supabase
          .from('entregas')
          .update({
            status: 'retirada',
            data_retirada: new Date().toISOString(),
            descricao_retirada: withdrawalDescription,
            observacoes: foundDelivery.observations || null
          })
          .eq('id', entrega.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar retirada no Supabase:', updateError);
          toast({ 
            variant: 'destructive', 
            title: 'Erro', 
            description: `Falha ao atualizar retirada: ${updateError.message}` 
          });
          return;
        }

        console.log('✅ Entrega atualizada com sucesso no Supabase');

      } catch (e) {
        console.error('❌ Erro ao atualizar retirada no Supabase:', e);
        toast({ 
          variant: 'destructive', 
          title: 'Erro', 
          description: 'Falha ao atualizar retirada no banco de dados.' 
        });
        return;
      }

      // Enviar notificação de retirada via WhatsApp
      try {
        const now = new Date();
        const data = now.toLocaleDateString('pt-BR');
        const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const webhookPayload = {
          to: foundDelivery.resident.phone,
          message: `🏢 *${condominioNome || 'Condomínio'}*

✅ *Encomenda Retirada*

Olá *${foundDelivery.resident.name}*, sua encomenda foi retirada com sucesso!

📅 Data: ${data}
⏰ Hora: ${hora}
🔑 Código: ${foundDelivery.withdrawalCode}${withdrawalDescription.trim() ? `
📝 ${withdrawalDescription}` : ''}

Não responda esta mensagem, este é um atendimento automático.`,
          type: 'withdrawal',
          withdrawalData: {
            codigo: foundDelivery.withdrawalCode,
            morador: foundDelivery.resident.name,
            apartamento: foundDelivery.apartmentInfo.apartamento,
            bloco: foundDelivery.apartmentInfo.bloco,
            descricao: withdrawalDescription,
            foto_url: foundDelivery.photo, // ✅ URL da imagem incluída
            data: data,
            hora: hora,
            condominio: condominioNome || 'Condomínio'
          }
        };

        console.log('=== ENVIANDO WHATSAPP RETIRADA ===')
        console.log('📞 Telefone:', foundDelivery.resident.phone);
        console.log('📝 Payload:', JSON.stringify(webhookPayload, null, 2));
        
        // 🚀 TENTAR WEBHOOK DIRETO PRIMEIRO (já que sabemos que funciona)
        console.log('🔗 Tentando webhook direto primeiro...');

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
            body: JSON.stringify(webhookPayload)
          });
          
          console.log('🚑 Status webhook direto:', directResponse.status);
          
          if (directResponse.ok) {
            const directResult = await directResponse.json();
            console.log('✅ Webhook direto de retirada funcionou!', directResult);
          } else {
            const directErrorText = await directResponse.text();
            console.error('❌ Webhook direto falhou:', directResponse.status, directErrorText);
            throw new Error(`Webhook direto falhou: ${directResponse.status}`);
          }
        } catch (directError) {
          console.error('❌ Erro no webhook direto, tentando Supabase function como fallback...', directError);
          
          // 🚑 FALLBACK: Tentar Supabase function
          const response = await fetch('https://ofaifvyowixzktwvxrps.supabase.co/functions/v1/send-whatsapp-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });

          if (response.ok) {
            console.log('✅ WhatsApp withdrawal notification sent successfully via Supabase');
          } else {
            console.error('❌ Failed to send WhatsApp withdrawal notification via Supabase');
            const errorText = await response.text();
            console.error('❌ Detalhes do erro Supabase:', errorText);
            throw new Error(`Ambos os métodos falharam. Supabase: ${response.status} - ${errorText}`);
          }
        }
      } catch (error) {
        console.error('❌ Error sending WhatsApp withdrawal notification:', error);
      }

      toast({
        title: "Retirada confirmada!",
        description: `Encomenda entregue para ${foundDelivery.resident.name}. WhatsApp enviado.`,
      });

      // Reset form
      setWithdrawalCode("");
      setFoundDelivery(null);
      setWithdrawalDescription("");
      loadPendingDeliveries();
      onChange?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao confirmar retirada.",
      });
    }
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
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Retirada de Encomendas
              </h1>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search Section */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Search className="h-5 w-5 text-primary" />
            Buscar Encomenda
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Digite o código de retirada da encomenda ou selecione uma da lista abaixo
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Digite o código de 5 dígitos"
                value={withdrawalCode}
                onChange={(e) => setWithdrawalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="h-12 text-lg sm:text-xl text-center font-mono tracking-wider flex-1"
                maxLength={5}
              />
              <Button
                onClick={searchByCode}
                size="lg"
                disabled={isSearching || withdrawalCode.length !== 5}
                className="w-full sm:w-auto px-6 h-12"
              >
                {isSearching ? (
                  <>
                    <Search className="h-5 w-5 mr-2 animate-spin" />
                    <span className="text-base">Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    <span className="text-base">Buscar</span>
                  </>
                )}
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Dica:</strong> O código de retirada é composto por 5 dígitos e foi enviado ao morador via WhatsApp.
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Found Delivery */}
      {foundDelivery && (
        <Card className="shadow-elevated bg-gradient-card border-2 border-success/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-success">
              <Package className="h-6 w-6" />
              Encomenda Encontrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg sm:text-xl">
                  {getInitials(foundDelivery.resident.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground break-words">
                  {foundDelivery.resident.name}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground mt-1">
                  <span className="text-base break-all">{foundDelivery.resident.phone}</span>
                  <Badge variant="secondary" className="text-base py-1">
                    {foundDelivery.apartmentInfo.bloco ? 
                      `${foundDelivery.apartmentInfo.bloco}-${foundDelivery.apartmentInfo.apartamento}` :
                      foundDelivery.apartmentInfo.apartamento
                    }
                  </Badge>
                </div>
                {foundDelivery.resident.role && (
                  <Badge variant="outline" className="mt-2 text-base py-1">
                    {foundDelivery.resident.role}
                  </Badge>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-medium text-muted-foreground">
                  Código de Retirada
                </Label>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-primary break-all mt-1">
                  {foundDelivery.withdrawalCode}
                </p>
              </div>
              
              <div>
                <Label className="text-base font-medium text-muted-foreground">
                  Data/Hora Chegada
                </Label>
                <p className="text-base text-foreground mt-1">
                  {new Date(foundDelivery.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Photo */}
            {foundDelivery.photo && (
              <div>
                <Label className="text-base font-medium text-muted-foreground">
                  Foto da Encomenda
                </Label>
                <div className="mt-2 bg-gray-50 rounded-lg p-3">
                  <img
                    src={foundDelivery.photo}
                    alt="Encomenda"
                    className="w-full h-56 sm:h-72 object-contain rounded-lg shadow-md"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              </div>
            )}

            {/* Observations */}
            {foundDelivery.observations && (
              <div>
                <Label className="text-base font-medium text-muted-foreground">
                  Observações
                </Label>
                <p className="text-base text-foreground bg-muted p-4 rounded-lg mt-1">
                  {foundDelivery.observations}
                </p>
              </div>
            )}

            {/* Withdrawal Description */}
            <div>
              <Label className="text-base font-medium text-muted-foreground">
                Descrição da Retirada (opcional)
              </Label>
              <Textarea
                placeholder="Ex: Retirado pelo filho, Esposa retirou, etc... (opcional)"
                value={withdrawalDescription}
                onChange={(e) => setWithdrawalDescription(e.target.value)}
                className="mt-2 text-base"
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-2">
                💡 Campo opcional - use apenas se necessário especificar quem retirou
              </p>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={confirmWithdrawal}
              size="lg"
              variant="success"
              className="w-full h-14 text-lg sm:text-xl"
            >
              <CheckCircle className="h-6 w-6 mr-2" />
              Confirmar Retirada
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Deliveries List */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-warning" />
            Encomendas Pendentes ({deliveries.length})
          </CardTitle>
          <p className="text-base text-muted-foreground mt-2">
            💡 Clique em qualquer encomenda abaixo para selecioná-la automaticamente, ou digite o código manualmente acima.
          </p>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma encomenda pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div 
                  key={delivery.id} 
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors duration-200 border-2 border-transparent hover:border-primary/30 overflow-hidden"
                  onClick={() => {
                    // Auto-fill the withdrawal code and search directly
                    setWithdrawalCode(delivery.withdrawalCode);
                    // Search directly with the code to avoid timing issues
                    searchByCodeDirect(delivery.withdrawalCode);
                  }}
                  title="Clique para selecionar esta encomenda"
                >
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-base">
                      {getInitials(delivery.resident.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="font-medium text-foreground text-base sm:text-lg truncate">
                      {delivery.resident.name}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground truncate mt-1">
                      {delivery.apartmentInfo.bloco ? 
                        `${delivery.apartmentInfo.bloco}-${delivery.apartmentInfo.apartamento}` :
                        delivery.apartmentInfo.apartamento
                      }
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0 min-w-0">
                    <p className="text-lg sm:text-xl font-mono font-bold text-primary">
                      {delivery.withdrawalCode}
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {new Date(delivery.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <Badge variant="warning" className="shrink-0 text-base px-3 py-1">
                      Pendente
                    </Badge>
                    <span className="text-sm text-muted-foreground hidden md:block text-center">
                      Toque
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};