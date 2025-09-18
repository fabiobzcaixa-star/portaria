import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Package, 
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
  Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReportsPanelProps {
  onBack: () => void;
  condominioId?: string;
}

interface ReportItem {
  id: string;
  residentName: string;
  apartment: string;
  phone: string;
  timestamp: string;
  status: string;
  photo?: string | null;
  ultimo_lembrete_enviado?: string | null;
  data_entrega?: string | null;
  data_retirada?: string | null;
  codigo_retirada?: string | null;
}

export const ReportsPanel = ({ onBack, condominioId }: ReportsPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "retirada">("todos");
  const [lembretesFilter, setLembretesFilter] = useState<"todos" | "enviado" | "nao_enviado">("todos");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('📊 Carregando relatórios do Supabase...');
        console.log('🏢 Filtrando por condomínio:', condominioId);
        
        let baseQuery;
        try {
          // Tenta incluir o campo ultimo_lembrete_enviado
          baseQuery = supabase
            .from('entregas')
            .select(`id, codigo_retirada, created_at, data_entrega, data_retirada, descricao_retirada, observacoes, status, foto_url, morador_id, ultimo_lembrete_enviado`)
            .eq('condominio_id', condominioId)
            .order('created_at', { ascending: false })
            .limit(100);
        } catch (columnError) {
          console.warn('❌ Erro ao incluir coluna ultimo_lembrete_enviado:', columnError);
          // Fallback sem o campo ultimo_lembrete_enviado
          baseQuery = supabase
            .from('entregas')
            .select(`id, codigo_retirada, created_at, data_entrega, data_retirada, descricao_retirada, observacoes, status, foto_url, morador_id`)
            .eq('condominio_id', condominioId)
            .order('created_at', { ascending: false })
            .limit(100);
        }

        const { data, error } = await baseQuery;

        if (error) {
          console.error('❌ Erro ao buscar entregas:', error);
          throw error;
        }

        console.log('✅ Entregas carregadas:', data?.length || 0);

        // Buscar dados dos moradores para exibir nome/telefone/apto
        const moradorIds = (data || []).map((r: any) => r.morador_id);
        const { data: moradores, error: moradoresError } = await supabase
          .from('moradores')
          .select('id, nome, telefone, apartamento, bloco')
          .in('id', moradorIds);

        if (moradoresError) {
          console.error('❌ Erro ao buscar moradores:', moradoresError);
        }

        const moradorById = new Map((moradores || []).map(m => [m.id, m]));

        const mapped: ReportItem[] = (data || []).map((r: any) => {
          const m = moradorById.get(r.morador_id);
          
          // Verifica se o campo ultimo_lembrete_enviado existe no objeto
          let lembreteValue = null;
          try {
            lembreteValue = r.ultimo_lembrete_enviado;
          } catch (err) {
            // Campo não existe ou é undefined
            console.warn('Campo ultimo_lembrete_enviado não disponível');
          }
          
          return {
            id: r.id,
            residentName: m?.nome || 'Morador',
            apartment: m?.bloco ? `${m.bloco}-${m.apartamento}` : (m?.apartamento || ''),
            phone: m?.telefone || '',
            timestamp: new Date(r.data_entrega || r.created_at).toLocaleString('pt-BR'),
            status: r.status,
            photo: r.foto_url,
            ultimo_lembrete_enviado: lembreteValue,
            data_entrega: r.data_entrega,
            data_retirada: r.data_retirada,
            codigo_retirada: r.codigo_retirada
          };
        });

        console.log('📊 Relatórios processados:', mapped.length);
        setItems(mapped);
      } catch (e: any) {
        console.error('❌ Erro ao carregar relatórios:', e);
        setError(e.message || 'Erro ao carregar relatórios');
      } finally {
        setIsLoading(false);
      }
    };
    
    load();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(load, 30000);
    
    return () => clearInterval(interval);
  }, [condominioId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusVariant = (status: string) => {
    return status === "retirada" ? "success" : "warning";
  };

  const getStatusIcon = (status: string) => {
    return status === "retirada" ? CheckCircle : Clock;
  };

  const getReminderStatus = (delivery: ReportItem) => {
    if (delivery.status !== 'pendente') {
      return 'N/A'; // Não aplicável para entregas retiradas
    }
    return delivery.ultimo_lembrete_enviado ? 'Enviado' : 'Pendente';
  };

  const getReminderStatusVariant = (delivery: ReportItem) => {
    if (delivery.status !== 'pendente') {
      return 'secondary'; // Não aplicável
    }
    return delivery.ultimo_lembrete_enviado ? 'success' : 'warning';
  };

  const filteredDeliveries = items.filter(delivery => {
    const matchesSearch = delivery.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.apartment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || delivery.status === statusFilter;
    
    // Filtro de lembretes
    let matchesLembretes = true;
    if (lembretesFilter === "enviado") {
      matchesLembretes = delivery.ultimo_lembrete_enviado !== null && delivery.ultimo_lembrete_enviado !== undefined;
    } else if (lembretesFilter === "nao_enviado") {
      matchesLembretes = (delivery.ultimo_lembrete_enviado === null || delivery.ultimo_lembrete_enviado === undefined) && delivery.status === "pendente";
    }
    
    return matchesSearch && matchesStatus && matchesLembretes;
  });

  const totalDeliveries = filteredDeliveries.length;
  const pendingDeliveries = filteredDeliveries.filter(d => d.status === "pendente").length;
  const completedDeliveries = filteredDeliveries.filter(d => d.status === "retirada").length;
  const remindersSent = filteredDeliveries.filter(d => d.ultimo_lembrete_enviado !== null && d.ultimo_lembrete_enviado !== undefined).length;

  // Function to truncate text for better mobile display
  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4 lg:space-y-6 w-full max-w-none">
      {/* Header */}
      <Card className="shadow-card bg-gradient-card">
        <CardHeader className="py-2 pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="flex gap-1 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsLoading(true);
                  const load = async () => {
                    try {
                      let baseQuery;
                      try {
                        baseQuery = supabase
                          .from('entregas')
                          .select(`id, codigo_retirada, created_at, data_entrega, data_retirada, descricao_retirada, observacoes, status, foto_url, morador_id, ultimo_lembrete_enviado`)
                          .eq('condominio_id', condominioId)
                          .order('created_at', { ascending: false })
                          .limit(100);
                      } catch (columnError) {
                        console.warn('❌ Erro ao incluir coluna ultimo_lembrete_enviado:', columnError);
                        baseQuery = supabase
                          .from('entregas')
                          .select(`id, codigo_retirada, created_at, data_entrega, data_retirada, descricao_retirada, observacoes, status, foto_url, morador_id`)
                          .eq('condominio_id', condominioId)
                          .order('created_at', { ascending: false })
                          .limit(100);
                      }

                      const { data, error } = await baseQuery;

                      if (error) throw error;

                      const moradorIds = (data || []).map((r: any) => r.morador_id);
                      const { data: moradores } = await supabase
                        .from('moradores')
                        .select('id, nome, telefone, apartamento, bloco')
                        .in('id', moradorIds);

                      const moradorById = new Map((moradores || []).map(m => [m.id, m]));

                      const mapped: ReportItem[] = (data || []).map((r: any) => {
                        const m = moradorById.get(r.morador_id);
                        
                        // Verifica se o campo ultimo_lembrete_enviado existe no objeto
                        let lembreteValue = null;
                        try {
                          lembreteValue = r.ultimo_lembrete_enviado;
                        } catch (err) {
                          console.warn('Campo ultimo_lembrete_enviado não disponível');
                        }
                        
                        return {
                          id: r.id,
                          residentName: m?.nome || 'Morador',
                          apartment: m?.bloco ? `${m.bloco}-${m.apartamento}` : (m?.apartamento || ''),
                          phone: m?.telefone || '',
                          timestamp: new Date(r.data_entrega || r.created_at).toLocaleString('pt-BR'),
                          status: r.status,
                          photo: r.foto_url,
                          ultimo_lembrete_enviado: lembreteValue,
                          data_entrega: r.data_entrega,
                          data_retirada: r.data_retirada,
                          codigo_retirada: r.codigo_retirada
                        };
                      });

                      setItems(mapped);
                    } catch (e: any) {
                      setError(e.message || 'Erro ao atualizar');
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  load();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Atualizar</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2 text-sm">
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl mt-0">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Relatório de Entregas
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4">
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total de Entregas
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{totalDeliveries}</p>
              </div>
              <Package className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card hover:shadow-lg transition-shadow">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pendentes
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-warning">{pendingDeliveries}</p>
              </div>
              <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card hover:shadow-lg transition-shadow">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Concluídas
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-success">{completedDeliveries}</p>
              </div>
              <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-card hover:shadow-lg transition-shadow">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Lembretes
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-500">{remindersSent}</p>
              </div>
              <Bell className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar morador ou apartamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 w-full sm:w-auto sm:flex">
              <Button
                variant={statusFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("todos")}
                className="h-9 px-2 text-sm whitespace-nowrap"
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === "pendente" ? "warning" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pendente")}
                className="h-9 px-2 text-sm whitespace-nowrap"
              >
                Pendentes
              </Button>
              <Button
                variant={statusFilter === "retirada" ? "success" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("retirada")}
                className="h-9 px-2 text-sm whitespace-nowrap"
              >
                Entregues
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lembretes Filter */}
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="text-sm font-medium text-muted-foreground flex items-center">
              <Bell className="h-4 w-4 mr-2 text-orange-500" />
              Filtrar por Lembretes:
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={lembretesFilter === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setLembretesFilter("todos")}
                className="text-sm"
              >
                Todos
              </Button>
              <Button
                variant={lembretesFilter === "enviado" ? "default" : "outline"}
                size="sm"
                onClick={() => setLembretesFilter("enviado")}
                className="text-green-600 text-sm"
              >
                Lembretes Enviados
              </Button>
              <Button
                variant={lembretesFilter === "nao_enviado" ? "default" : "outline"}
                size="sm"
                onClick={() => setLembretesFilter("nao_enviado")}
                className="text-orange-500 text-sm"
              >
                Sem Lembrete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <div className="space-y-3">
        {isLoading && (
          <Card className="shadow-card bg-gradient-card">
            <CardContent className="p-6">Carregando...</CardContent>
          </Card>
        )}
        {error && (
          <Card className="shadow-card bg-gradient-card">
            <CardContent className="p-6 text-destructive">{error}</CardContent>
          </Card>
        )}
        
        {/* Desktop Grid Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {filteredDeliveries.map((delivery) => {
              const StatusIcon = getStatusIcon(delivery.status);
              return (
                <Card key={delivery.id} className="shadow-card bg-gradient-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                          {getInitials(delivery.residentName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-foreground text-base truncate">
                            {delivery.residentName}
                          </h3>
                          <Badge 
                            variant={getStatusVariant(delivery.status)}
                            className="flex items-center gap-1 text-sm py-1 px-2 flex-shrink-0"
                          >
                            <StatusIcon className="h-4 w-4" />
                            {delivery.status === "retirada" ? "Entregue" : "Pendente"}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-sm">
                              {delivery.apartment}
                            </Badge>
                            {delivery.status === "pendente" && (
                              <Badge 
                                variant={getReminderStatusVariant(delivery)}
                                className="text-sm flex items-center gap-1"
                              >
                                <Bell className="h-4 w-4" />
                                {getReminderStatus(delivery)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            📱 {delivery.phone}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {delivery.status === 'retirada' ? '🔄 Retirado em: ' : '📥 Registrado em: '}
                            {delivery.status === 'retirada' && delivery.data_retirada
                              ? new Date(delivery.data_retirada).toLocaleString('pt-BR')
                              : delivery.timestamp
                            }
                          </p>
                          {delivery.codigo_retirada && (
                            <p className="text-sm text-muted-foreground truncate">
                              🔑 Código: {delivery.codigo_retirada}
                            </p>
                          )}
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full h-9 text-sm">
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-lg">Detalhes da Entrega</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-base">
                              <div><strong>Morador:</strong> {delivery.residentName}</div>
                              <div><strong>Apartamento:</strong> {delivery.apartment}</div>
                              <div><strong>Telefone:</strong> {delivery.phone}</div>
                              <div><strong>Código:</strong> {delivery.codigo_retirada || '-'}</div>
                              <div><strong>Data de Registro:</strong> {delivery.data_entrega ? new Date(delivery.data_entrega).toLocaleString('pt-BR') : '-'}</div>
                              {delivery.status === 'retirada' && (
                                <div><strong>Data de Retirada:</strong> {delivery.data_retirada ? new Date(delivery.data_retirada).toLocaleString('pt-BR') : '-'}</div>
                              )}
                              <div><strong>Status:</strong> {delivery.status === 'retirada' ? 'Entregue' : 'Pendente'}</div>
                              <div><strong>Lembrete:</strong> {delivery.ultimo_lembrete_enviado ? 
                                new Date(delivery.ultimo_lembrete_enviado).toLocaleString('pt-BR') : 'Não enviado'}</div>
                              {delivery.photo && (
                                <div>
                                  <strong>Foto:</strong>
                                  <img src={delivery.photo} alt="Foto da entrega" className="w-full h-48 object-cover rounded mt-2" />
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        
        {/* Mobile/Tablet List Layout */}
        <div className="lg:hidden space-y-3">
          {filteredDeliveries.map((delivery) => {
            const StatusIcon = getStatusIcon(delivery.status);
            return (
              <Card key={delivery.id} className="shadow-card bg-gradient-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {getInitials(delivery.residentName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                          {truncateText(delivery.residentName, 25)}
                        </h3>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {delivery.apartment}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1 truncate">
                        {delivery.phone}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {delivery.status === 'retirada' ? 'Retirado em: ' : 'Registrado em: '}
                        {delivery.status === 'retirada' && delivery.data_retirada
                          ? new Date(delivery.data_retirada).toLocaleString('pt-BR')
                          : delivery.timestamp
                        }
                      </p>
                      {delivery.codigo_retirada && (
                        <p className="text-sm text-muted-foreground truncate">
                          Código: {delivery.codigo_retirada}
                        </p>
                      )}
                      {delivery.status === "pendente" && (
                        <Badge 
                          variant={getReminderStatusVariant(delivery)}
                          className="text-xs flex items-center gap-1 mt-1"
                        >
                          <Bell className="h-3 w-3" />
                          {getReminderStatus(delivery)}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant={getStatusVariant(delivery.status)}
                          className="flex items-center gap-1 text-xs py-1 px-2"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {delivery.status === "retirada" ? "Entregue" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-8 mt-3 text-sm">
                        Ver Detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-lg">Detalhes da Entrega</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-base">
                        <div><strong>Morador:</strong> {delivery.residentName}</div>
                        <div><strong>Apartamento:</strong> {delivery.apartment}</div>
                        <div><strong>Telefone:</strong> {delivery.phone}</div>
                        <div><strong>Código:</strong> {delivery.codigo_retirada || '-'}</div>
                        <div><strong>Data de Registro:</strong> {delivery.data_entrega ? new Date(delivery.data_entrega).toLocaleString('pt-BR') : '-'}</div>
                        {delivery.status === 'retirada' && (
                          <div><strong>Data de Retirada:</strong> {delivery.data_retirada ? new Date(delivery.data_retirada).toLocaleString('pt-BR') : '-'}</div>
                        )}
                        <div><strong>Status:</strong> {delivery.status === 'retirada' ? 'Entregue' : 'Pendente'}</div>
                        <div><strong>Lembrete:</strong> {delivery.ultimo_lembrete_enviado ? 
                          new Date(delivery.ultimo_lembrete_enviado).toLocaleString('pt-BR') : 'Não enviado'}</div>
                        {delivery.photo && (
                          <div>
                            <strong>Foto:</strong>
                            <img src={delivery.photo} alt="Foto da entrega" className="w-full h-48 object-cover rounded mt-2" />
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredDeliveries.length === 0 && !isLoading && !error && (
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma entrega encontrada
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou termo de busca.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};