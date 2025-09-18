import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Users, 
  Home, 
  Package, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Building,
  Phone
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth para obter o usuário logado

interface DashboardStats {
  totalFuncionarios: number;
  totalMoradores: number;
  entregasHoje: number;
  entregasPendentes: number;
  entregasRetiradas: number;
  condominioInfo: {
    id: string; // Adicionar id do condomínio
    nome: string;
    endereco: string;
    telefone: string;
  } | null;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalFuncionarios: 0,
    totalMoradores: 0,
    entregasHoje: 0,
    entregasPendentes: 0,
    entregasRetiradas: 0,
    condominioInfo: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth(); // Obter usuário logado

  useEffect(() => {
    const condoId = user?.funcionario?.condominio_id;
    if (condoId) {
      loadDashboardStats(condoId);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadDashboardStats = async (condominioId: string) => {
    try {
      setIsLoading(true);

      // Buscar informações do condomínio
      const { data: condominio } = await supabase
        .from('condominios')
        .select('*')
        .eq('id', condominioId) // Filtrar por condominioId
        .limit(1)
        .single();

      // Contar funcionários ativos do condomínio
      const { count: funcionariosCount } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', condominioId) // Filtrar por condominioId
        .eq('ativo', true);

      // Contar moradores ativos do condomínio
      const { count: moradoresCount } = await supabase
        .from('moradores')
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', condominioId) // Filtrar por condominioId
        .eq('ativo', true);

      // Buscar entregas do dia do condomínio
      const hoje = new Date();
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

      const { data: entregasHoje } = await supabase
        .from('entregas')
        .select('*')
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      // Buscar entregas pendentes do condomínio
      const { data: entregasPendentes } = await supabase
        .from('entregas')
        .select('*')
        .eq('status', 'pendente');

      // Buscar entregas retiradas do condomínio
      const { data: entregasRetiradas } = await supabase
        .from('entregas')
        .select('*')
        .eq('status', 'retirada');

      setStats({
        totalFuncionarios: funcionariosCount || 0,
        totalMoradores: moradoresCount || 0,
        entregasHoje: entregasHoje?.length || 0,
        entregasPendentes: entregasPendentes?.length || 0,
        entregasRetiradas: entregasRetiradas?.length || 0,
        condominioInfo: condominio
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Administrativo</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Visão geral do condomínio {stats.condominioInfo?.nome}
          </p>
        </div>
        <Badge variant="outline" className="text-sm w-fit px-3 py-1">
          <Building className="h-4 w-4 mr-1" />
          Administração
        </Badge>
      </div>

      {/* Informações do Condomínio */}
      {stats.condominioInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Building className="h-5 w-5 mr-2" />
              Informações do Condomínio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Nome</p>
                <p className="text-base sm:text-lg font-semibold">{stats.condominioInfo.nome}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Endereço</p>
                <p className="text-base sm:text-lg">{stats.condominioInfo.endereco}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Telefone</p>
                <p className="text-base sm:text-lg flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {stats.condominioInfo.telefone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalFuncionarios}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Funcionários ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moradores</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalMoradores}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Moradores cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Hoje</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.entregasHoje}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Entregas registradas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Retirada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.entregasRetiradas + stats.entregasPendentes > 0 
                ? Math.round((stats.entregasRetiradas / (stats.entregasRetiradas + stats.entregasPendentes)) * 100)
                : 0}%
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {stats.entregasRetiradas} de {stats.entregasRetiradas + stats.entregasPendentes} entregas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status das Entregas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              Entregas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.entregasPendentes}</div>
            <p className="text-sm text-muted-foreground">
              Aguardando retirada pelos moradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Entregas Retiradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.entregasRetiradas}</div>
            <p className="text-sm text-muted-foreground">
              Entregas já retiradas pelos moradores
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

