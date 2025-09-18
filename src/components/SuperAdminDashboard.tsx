import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Building2, Users, Package, Plus, Edit, Trash2, Globe, CheckCircle, XCircle, Clock, Trash, Image, Monitor, Smartphone, Upload } from 'lucide-react';
import { AdminReports } from './AdminReports';
import { getGlobalWebhookUrl, setGlobalWebhookUrl, resetGlobalWebhookUrl } from '@/config/webhook';

type Condominio = Tables<'condominios'>;
type Funcionario = Tables<'funcionarios'>;
type Entrega = Tables<'entregas'>;

interface SuperAdminDashboardProps {
  onBack: () => void;
}

export const SuperAdminDashboard = ({ onBack }: SuperAdminDashboardProps) => {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'overview' | 'condominios' | 'funcionarios' | 'entregas' | 'relatorios' | 'webhooks' | 'branding'>('overview');

  // Estados para branding
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCondominio, setEditingCondominio] = useState<Condominio | null>(null);
  const [condominioFormData, setCondominioFormData] = useState({
    nome: '',
    endereco: '',
    cidade: '',
    cep: '',
    telefone: '',
    webhook_url: '',
    estado: '',
    email: '',
    cnpj: '',
    sindico_nome: '',
    sindico_cpf: '',
    sindico_senha: '',
    sindico_telefone: ''
  });
  const [isSubmittingCondominio, setIsSubmittingCondominio] = useState(false);
  const { toast } = useToast();
  const [webhookDraft, setWebhookDraft] = useState<string>('');

  // Estados para gerenciamento de webhooks
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
    responseTime?: number;
  } | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<Array<{
    id: string;
    timestamp: Date;
    type: 'test' | 'delivery' | 'withdrawal' | 'reminder';
    url: string;
    success: boolean;
    message: string;
    responseTime?: number;
  }>>([]);

  const [formData, setFormData] = useState({
    id: '',
    nome: '',
    endereco: '',
    cep: '',
    cidade: '',
    telefone: '',
    sindico_nome: '',
    sindico_cpf: '',
    sindico_senha: '',
    sindico_telefone: ''
  });

  useEffect(() => {
    loadData();
    // Inicializa rascunho com valor atual
    try {
      setWebhookDraft(getGlobalWebhookUrl());
    } catch {}
    // Carrega logs de webhooks do localStorage
    loadWebhookLogs();
  }, []);

  const loadWebhookLogs = () => {
    try {
      const stored = localStorage.getItem('webhook_logs');
      if (stored) {
        const logs = JSON.parse(stored).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setWebhookLogs(logs.slice(0, 50)); // Limita a 50 logs
      }
    } catch (error) {
      console.error('Erro ao carregar logs de webhook:', error);
    }
  };

  const saveWebhookLog = (log: Omit<typeof webhookLogs[0], 'id'>) => {
    const newLog = {
      ...log,
      id: Date.now().toString()
    };

    const updatedLogs = [newLog, ...webhookLogs].slice(0, 50);
    setWebhookLogs(updatedLogs);

    try {
      localStorage.setItem('webhook_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Erro ao salvar logs de webhook:', error);
    }
  };

  const validateWebhookUrl = (url: string): { valid: boolean; error?: string } => {
    if (!url.trim()) {
      return { valid: false, error: 'URL não pode estar vazia' };
    }

    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL deve usar protocolo HTTP ou HTTPS' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'URL inválida' };
    }
  };

  const testWebhook = async (testUrl?: string) => {
    const urlToTest = testUrl || webhookDraft.trim();

    const validation = validateWebhookUrl(urlToTest);
    if (!validation.valid) {
      setWebhookTestResult({
        success: false,
        message: validation.error || 'URL inválida',
        timestamp: new Date()
      });
      return;
    }

    setIsTestingWebhook(true);
    const startTime = Date.now();

    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Teste de conectividade do webhook',
        system: 'Portaria Express Smart - Super Admin',
        data: {
          type: 'test',
          webhook_version: '1.0'
        }
      };

      const response = await fetch(urlToTest, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      const success = response.ok;
      const message = success
        ? `Teste bem-sucedido! Status: ${response.status} - ${responseData.message || 'Webhook respondeu corretamente'}`
        : `Falha no teste. Status: ${response.status} - ${responseData.message || responseText || 'Erro desconhecido'}`;

      setWebhookTestResult({
        success,
        message,
        timestamp: new Date(),
        responseTime
      });

      // Salva no log
      saveWebhookLog({
        timestamp: new Date(),
        type: 'test',
        url: urlToTest,
        success,
        message: `Status ${response.status}: ${responseData.message || responseText}`,
        responseTime
      });

      if (success) {
        toast({
          title: 'Teste de Webhook',
          description: 'Webhook testado com sucesso!',
        });
      } else {
        toast({
          title: 'Erro no Teste',
          description: 'Webhook falhou no teste. Verifique os logs.',
          variant: 'destructive'
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const message = `Erro de conexão: ${error.message || 'Não foi possível conectar ao webhook'}`;

      setWebhookTestResult({
        success: false,
        message,
        timestamp: new Date(),
        responseTime
      });

      // Salva no log
      saveWebhookLog({
        timestamp: new Date(),
        type: 'test',
        url: urlToTest,
        success: false,
        message,
        responseTime
      });

      toast({
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar ao webhook.',
        variant: 'destructive'
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveWebhook = () => {
    const validation = validateWebhookUrl(webhookDraft);
    if (!validation.valid) {
      toast({
        title: 'Erro',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    setGlobalWebhookUrl(webhookDraft.trim());
    toast({
      title: 'Salvo',
      description: 'Webhook atualizado com sucesso!'
    });

    // Salva no log
    saveWebhookLog({
      timestamp: new Date(),
      type: 'test',
      url: webhookDraft.trim(),
      success: true,
      message: 'Webhook URL atualizada pelo Super Admin'
    });
  };

  const clearWebhookLogs = () => {
    setWebhookLogs([]);
    localStorage.removeItem('webhook_logs');
    toast({
      title: 'Logs Limpos',
      description: 'Histórico de logs do webhook foi limpo.'
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [condominiosRes, funcionariosRes, entregasRes] = await Promise.all([
        supabase.from('condominios').select('*').order('nome'),
        supabase.from('funcionarios').select('*').order('nome'),
        supabase.from('entregas').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      if (condominiosRes.data) setCondominios(condominiosRes.data);
      if (funcionariosRes.data) setFuncionarios(funcionariosRes.data);
      if (entregasRes.data) setEntregas(entregasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do sistema',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCondominio = async () => {
    try {
      // Validação de campos obrigatórios
      if (!formData.nome.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome do condomínio é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.endereco.trim()) {
        toast({
          title: 'Erro',
          description: 'Endereço é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cep.trim()) {
        toast({
          title: 'Erro',
          description: 'CEP é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cidade.trim()) {
        toast({
          title: 'Erro',
          description: 'Cidade é obrigatória',
          variant: 'destructive'
        });
        return;
      }

      const condominioData = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim(),
        cep: formData.cep.trim(),
        cidade: formData.cidade.trim(),
        telefone: formData.telefone.trim() || null,
        sindico_nome: formData.sindico_nome.trim() || null,
        sindico_cpf: formData.sindico_cpf.replace(/\D/g, '') || null,
        sindico_senha: formData.sindico_senha.trim() || null,
        sindico_telefone: formData.sindico_telefone.trim() || null
      };

      console.log('Criando condomínio com dados:', condominioData);

      // Inserção direta (RLS pode estar desabilitado para super admin)
      const { data, error } = await supabase
        .from('condominios')
        .insert(condominioData)
        .select();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('Condomínio criado com sucesso:', data);

      toast({
        title: 'Sucesso',
        description: 'Condomínio criado com sucesso!'
      });

      setShowCreateDialog(false);
      setFormData({
        id: '',
        nome: '',
        endereco: '',
        cep: '',
        cidade: '',
        telefone: '',
        sindico_nome: '',
        sindico_cpf: '',
        sindico_senha: '',
        sindico_telefone: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Erro ao criar condomínio:', error);
      
      let errorMessage = 'Falha ao criar condomínio';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      }
      
      if (error?.hint) {
        errorMessage += ` (Dica: ${error.hint})`;
      }
      
      // Erro específico de políticas RLS
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Erro de permissão: O super admin pode não ter permissão para criar condomínios. Verifique as políticas RLS.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCondominio = async (id: string) => {
    // Validar que o ID não está vazio
    if (!id || id === '') {
      toast({
        title: 'Erro',
        description: 'ID do condomínio inválido',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este condomínio? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      console.log('Excluindo condomínio:', id);
      
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir condomínio:', error);
        throw error;
      }
      
      console.log('Condomínio excluído com sucesso');

      toast({
        title: 'Sucesso',
        description: 'Condomínio excluído com sucesso!'
      });
      
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir condomínio:', error);
      
      let errorMessage = 'Falha ao excluir condomínio';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      }
      
      // Erro específico de políticas RLS
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Erro de permissão: O super admin pode não ter permissão para excluir condomínios. Verifique as políticas RLS.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEditCondominio = (condominio: Condominio) => {
    console.log('🔧 EDIT CONDOMINIO CLICKED:', condominio);
    setEditingCondominio(condominio);
    setCondominioFormData({
      nome: condominio.nome || '',
      endereco: condominio.endereco || '',
      cidade: condominio.cidade || '',
      cep: condominio.cep || '',
      telefone: condominio.telefone || '',
      webhook_url: condominio.webhook_url || '',
      estado: condominio.estado || '',
      email: condominio.email || '',
      cnpj: condominio.cnpj || '',
      sindico_nome: condominio.sindico_nome || '',
      sindico_cpf: condominio.sindico_cpf || '',
      sindico_senha: condominio.sindico_senha || '',
      sindico_telefone: condominio.sindico_telefone || ''
    });
    setShowCreateDialog(true);
  };

  const handleUpdateCondominio = async () => {
    try {
      // Validar que o ID não está vazio
      if (!formData.id || formData.id === '') {
        toast({
          title: 'Erro',
          description: 'ID do condomínio inválido',
          variant: 'destructive'
        });
        return;
      }

      // Validação de campos obrigatórios
      if (!formData.nome.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome do condomínio é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.endereco.trim()) {
        toast({
          title: 'Erro',
          description: 'Endereço é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cep.trim()) {
        toast({
          title: 'Erro',
          description: 'CEP é obrigatório',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.cidade.trim()) {
        toast({
          title: 'Erro',
          description: 'Cidade é obrigatória',
          variant: 'destructive'
        });
        return;
      }

      const condominioData = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim(),
        cep: formData.cep.trim(),
        cidade: formData.cidade.trim(),
        telefone: formData.telefone.trim() || null,
        sindico_nome: formData.sindico_nome.trim() || null,
        sindico_cpf: formData.sindico_cpf.replace(/\D/g, '') || null,
        sindico_senha: formData.sindico_senha.trim() || null,
        sindico_telefone: formData.sindico_telefone.trim() || null
      };

      console.log('Atualizando condomínio:', formData.id, condominioData);

      // Atualização direta
      const { error } = await supabase
        .from('condominios')
        .update(condominioData)
        .eq('id', formData.id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('Condomínio atualizado com sucesso');

      toast({
        title: 'Sucesso',
        description: 'Condomínio atualizado com sucesso!'
      });

      setShowEditDialog(false);
      setEditingCondominio(null);
      setFormData({
        id: '',
        nome: '',
        endereco: '',
        cep: '',
        cidade: '',
        telefone: '',
        sindico_nome: '',
        sindico_cpf: '',
        sindico_senha: '',
        sindico_telefone: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Erro ao atualizar condomínio:', error);
      
      let errorMessage = 'Falha ao atualizar condomínio';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.details) {
        errorMessage += `: ${error.details}`;
      }
      
      if (error?.hint) {
        errorMessage += ` (Dica: ${error.hint})`;
      }
      
      // Erro específico de políticas RLS
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        errorMessage = 'Erro de permissão: O super admin pode não ter permissão para atualizar condomínios. Verifique as políticas RLS.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Condomínios</CardTitle>
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{condominios.length}</div>
          <p className="text-sm text-muted-foreground">
            Condomínios registrados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Funcionários</CardTitle>
          <Users className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{funcionarios.length}</div>
          <p className="text-sm text-muted-foreground">
            Funcionários ativos
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Total Entregas</CardTitle>
          <Package className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{entregas.length}</div>
          <p className="text-sm text-muted-foreground">
            Entregas registradas
          </p>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Condomínios Recentes</CardTitle>
          <CardDescription>
            Lista dos condomínios mais recentes cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Nome</TableHead>
                <TableHead className="text-sm">Cidade</TableHead>
                <TableHead className="text-sm">Telefone</TableHead>
                <TableHead className="text-sm">Síndico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.slice(0, 5).map((condominio) => (
                <TableRow key={condominio.id}>
                  <TableCell className="font-medium text-sm">{condominio.nome}</TableCell>
                  <TableCell className="text-sm">{condominio.cidade}</TableCell>
                  <TableCell className="text-sm">{condominio.telefone || '-'}</TableCell>
                  <TableCell className="text-sm">{condominio.sindico_nome || '-'}</TableCell>
                </TableRow>
              ))}
              {condominios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum condomínio cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderCondominios = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold">Gerenciamento de Condomínios</h2>
        <Button onClick={() => {
          console.log('🏢 SUPER ADMIN - Clicou em Adicionar Condomínio!');
          setShowCreateDialog(true);
        }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Adicionar Condomínio
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Nome</TableHead>
                <TableHead className="text-sm">Endereço</TableHead>
                <TableHead className="text-sm">Cidade</TableHead>
                <TableHead className="text-sm">Telefone</TableHead>
                <TableHead className="text-sm">Síndico</TableHead>
                <TableHead className="text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {condominios.map((condominio) => {
                // Encontrar funcionários associados a este condomínio
                const funcs = funcionarios.filter(f => f.condominio_id === condominio.id);
                const sindico = funcs.find(f => f.cargo === 'sindico');
                
                return (
                  <TableRow key={condominio.id}>
                    <TableCell className="font-medium text-sm">{condominio.nome}</TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[150px] truncate" title={condominio.endereco}>
                        {condominio.endereco}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{condominio.cidade}</TableCell>
                    <TableCell className="text-sm">{condominio.telefone || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {sindico ? (
                        <div>
                          <p>{sindico.nome}</p>
                          <p className="text-xs text-muted-foreground">{sindico.telefone || '-'}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCondominio(condominio)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCondominio(condominio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {condominios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum condomínio cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const handleCondominioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('💾 Salvando condomínio:', condominioFormData, 'Editing:', editingCondominio);

    if (isSubmittingCondominio) return;
    setIsSubmittingCondominio(true);

    try {
      const formDataToSave = {
        nome: condominioFormData.nome,
        endereco: condominioFormData.endereco,
        cidade: condominioFormData.cidade,
        cep: condominioFormData.cep,
        telefone: condominioFormData.telefone || null,
        webhook_url: condominioFormData.webhook_url || null,
        estado: condominioFormData.estado || null,
        email: condominioFormData.email || null,
        cnpj: condominioFormData.cnpj || null,
        sindico_nome: condominioFormData.sindico_nome || null,
        sindico_cpf: condominioFormData.sindico_cpf || null,
        sindico_senha: condominioFormData.sindico_senha || null,
        sindico_telefone: condominioFormData.sindico_telefone || null,
        ativo: true
      };

      let result;
      if (editingCondominio) {
        // Atualizar condomínio existente
        console.log('🔄 Atualizando condomínio ID:', editingCondominio.id);
        result = await supabase
          .from('condominios')
          .update(formDataToSave)
          .eq('id', editingCondominio.id)
          .select();
      } else {
        // Criar novo condomínio
        console.log('➕ Criando novo condomínio');
        result = await supabase
          .from('condominios')
          .insert(formDataToSave)
          .select();
      }

      const { data, error } = result;
      if (error) {
        console.error('❌ Erro ao salvar:', error);
        throw error;
      }

      console.log('✅ Condomínio salvo:', data);
      toast({
        title: "Sucesso",
        description: editingCondominio ? "Condomínio atualizado com sucesso!" : "Condomínio cadastrado com sucesso!"
      });

      setShowCreateDialog(false);
      setEditingCondominio(null);
      setCondominioFormData({
        nome: '',
        endereco: '',
        cidade: '',
        cep: '',
        telefone: '',
        webhook_url: '',
        estado: '',
        email: '',
        cnpj: '',
        sindico_nome: '',
        sindico_cpf: '',
        sindico_senha: '',
        sindico_telefone: ''
      });

      // Recarregar dados
      loadData();

    } catch (error: unknown) {
      console.error('❌ Erro completo:', error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar condomínio";
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage
      });
    } finally {
      setIsSubmittingCondominio(false);
    }
  };

  const renderFuncionarios = () => (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Gerenciamento de Funcionários</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Nome</TableHead>
                <TableHead className="text-sm">CPF</TableHead>
                <TableHead className="text-sm">Cargo</TableHead>
                <TableHead className="text-sm">Condomínio</TableHead>
                <TableHead className="text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((func) => {
                const condo = condominios.find(c => c.id === func.condominio_id);
                return (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium text-sm">{func.nome}</TableCell>
                    <TableCell className="text-sm">{func.cpf}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-sm">{func.cargo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{condo?.nome || 'Não encontrado'}</TableCell>
                    <TableCell>
                      <Badge variant={func.ativo ? "default" : "destructive"} className="text-sm">
                        {func.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {funcionarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderEntregas = () => (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Entregas Recentes</h2>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Data</TableHead>
                <TableHead className="text-sm">Código</TableHead>
                <TableHead className="text-sm">Status</TableHead>
                <TableHead className="text-sm hidden md:table-cell">Condomínio</TableHead>
                <TableHead className="text-sm hidden md:table-cell">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((entrega) => {
                const condo = condominios.find(c => c.id === entrega.condominio_id);
                return (
                  <TableRow key={entrega.id}>
                    <TableCell className="text-sm">{new Date(entrega.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">
                      <div>
                        <p className="text-sm">{entrega.codigo_retirada}</p>
                        <p className="text-xs text-muted-foreground md:hidden truncate max-w-[100px]">{condo?.nome || 'Não encontrado'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entrega.status === 'entregue' ? "default" : "outline"} className="text-sm">
                        {entrega.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{condo?.nome || 'Não encontrado'}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm hidden md:table-cell">{entrega.observacoes || 'Nenhuma'}</TableCell>
                  </TableRow>
                );
              })}
              {entregas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrega registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  // Componente de relatórios específico para super admin
  // Movendo o estado para fora da função de renderização para evitar problemas de reinicialização
  const [selectedCondominioId, setSelectedCondominioId] = useState<string>('todos');
  
  const renderRelatorios = () => {
    return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold">Relatórios Administrativos</h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-card p-3 rounded-md border shadow-sm w-full sm:w-auto">
          <Label htmlFor="condominio-filter" className="whitespace-nowrap font-semibold">Filtrar por Condomínio:</Label>
          <Select 
            value={selectedCondominioId} 
            onValueChange={setSelectedCondominioId}
          >
            <SelectTrigger className="w-full sm:w-[300px]" id="condominio-filter">
              <SelectValue placeholder="Selecione um condomínio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Condomínios</SelectItem>
              {condominios.map((condo) => (
                <SelectItem key={condo.id} value={condo.id}>
                  {condo.nome} - {condo.cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="bg-sky-50 p-3 rounded-md border border-sky-200 text-sky-800 text-sm">
        <p className="flex items-center">
          <Building2 className="h-5 w-5 mr-2 text-sky-600 flex-shrink-0" />
          <span className="truncate">
            {selectedCondominioId === 'todos' 
              ? `Exibindo relatórios de todos os ${condominios.length} condomínios cadastrados.` 
              : `Exibindo relatórios detalhados do condomínio selecionado.`
            }
          </span>
        </p>
      </div>
      
      {condominios.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {selectedCondominioId === 'todos' ? (
            // Exibir todos os condomínios (modo compacto)
            condominios.map((condominio) => (
              <Card key={condominio.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <CardTitle>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="truncate">{condominio.nome}</span>
                      <Badge variant="outline">{condominio.cidade}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-3">
                    <AdminReports superAdminMode={true} condominioId={condominio.id} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Exibir apenas o condomínio selecionado (modo detalhado)
            (() => {
              const condominio = condominios.find(c => c.id === selectedCondominioId);
              if (condominio) {
                return (
                  <Card>
                    <CardHeader className="bg-gray-50">
                      <CardTitle>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <span className="truncate">{condominio.nome}</span>
                          <Badge variant="outline">{condominio.cidade}</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <AdminReports superAdminMode={true} condominioId={selectedCondominioId} />
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p>Condomínio não encontrado</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCondominioId('todos')} 
                      className="mt-4"
                    >
                      Voltar para todos os condomínios
                    </Button>
                  </CardContent>
                </Card>
              );
            })()
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p>Nenhum condomínio cadastrado</p>
          </CardContent>
        </Card>
      )}
    </div>
    );
  };

  // Função para lidar com upload de arquivos
  const handleFileUpload = (file: File, type: 'logo' | 'icon') => {
    if (type === 'logo') {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setIconFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setIconPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleSaveBranding = async () => {
    setIsUploadingLogo(true);
    try {
      if (logoFile) {
        const logoBase64 = await convertFileToBase64(logoFile);
        localStorage.setItem('internal_logo_url', logoBase64);
        console.log('💾 Logo interno salvo no localStorage');
      }

      if (iconFile) {
        const iconBase64 = await convertFileToBase64(iconFile);
        localStorage.setItem('pwa_icon_url', iconBase64);
        console.log('💾 Ícone PWA salvo no localStorage');
      }

      toast({
        title: "Sucesso",
        description: "Logos atualizados com sucesso! Recarregue a página para ver as mudanças."
      });

      // Reset forms
      setLogoFile(null);
      setIconFile(null);
      setLogoPreview(null);
      setIconPreview(null);

    } catch (error: any) {
      console.error('Erro ao processar arquivos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao processar os arquivos"
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const renderBranding = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6" />
            Personalização da Marca
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure o logo interno do sistema e o ícone PWA para dispositivos móveis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Interno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Logo Interno do Sistema
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Logo que aparece no cabeçalho do sistema (recomendado: 200x60px)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {logoPreview ? (
                <div className="space-y-4">
                  <img src={logoPreview} alt="Preview" className="mx-auto max-h-20 object-contain" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar o logo interno
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logo');
                    }}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="logo-upload">Escolher Arquivo</label>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ícone PWA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Ícone PWA/Mobile
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ícone que aparece na tela inicial do celular (recomendado: 512x512px)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {iconPreview ? (
                <div className="space-y-4">
                  <img src={iconPreview} alt="Preview" className="mx-auto max-h-20 object-contain" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIconFile(null);
                      setIconPreview(null);
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar o ícone PWA
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'icon');
                    }}
                    className="hidden"
                    id="icon-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="icon-upload">Escolher Arquivo</label>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de salvar */}
      {(logoFile || iconFile) && (
        <div className="flex justify-end">
          <Button onClick={handleSaveBranding} disabled={isUploadingLogo}>
            {isUploadingLogo ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      )}

      {/* Informações atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Logo Interno:</Label>
              <p className="text-sm text-muted-foreground">
                {localStorage.getItem('internal_logo_url') ? 'Personalizado' : 'Padrão'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Ícone PWA:</Label>
              <p className="text-sm text-muted-foreground">
                {localStorage.getItem('pwa_icon_url') ? 'Personalizado' : 'Padrão'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Gerenciamento de Webhooks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e teste webhooks para notificações do sistema
          </p>
        </div>
      </div>

      {/* Configuração Principal do Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuração do Webhook
          </CardTitle>
          <CardDescription>
            Configure a URL principal do webhook que será usada para todas as notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="webhook-url"
                  value={webhookDraft}
                  onChange={(e) => setWebhookDraft(e.target.value)}
                  placeholder="https://webhook.fbzia.com.br/webhook/portariainteligente"
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveWebhook}
                  disabled={!webhookDraft.trim()}
                >
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Esta URL será usada para entregas, retiradas e lembretes
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => testWebhook()}
                disabled={isTestingWebhook || !webhookDraft.trim()}
                variant="outline"
              >
                {isTestingWebhook ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Testar Webhook
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  resetGlobalWebhookUrl();
                  const current = getGlobalWebhookUrl();
                  setWebhookDraft(current);
                  toast({ title: 'Restaurado', description: 'Webhook padrão restaurado.' });
                }}
              >
                Restaurar Padrão
              </Button>
            </div>
          </div>

          {/* Resultado do Teste */}
          {webhookTestResult && (
            <div className={`p-4 rounded-md border ${
              webhookTestResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {webhookTestResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {webhookTestResult.success ? 'Teste Bem-sucedido' : 'Teste Falhou'}
                  </p>
                  <p className="text-sm mt-1">{webhookTestResult.message}</p>
                  <div className="flex gap-4 text-xs mt-2">
                    <span>Testado em: {webhookTestResult.timestamp.toLocaleString()}</span>
                    {webhookTestResult.responseTime && (
                      <span>Tempo de resposta: {webhookTestResult.responseTime}ms</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Logs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Logs
              </CardTitle>
              <CardDescription>
                Histórico dos últimos testes e eventos de webhook
              </CardDescription>
            </div>
            {webhookLogs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearWebhookLogs}
              >
                <Trash className="mr-2 h-4 w-4" />
                Limpar Logs
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {webhookLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log de webhook encontrado</p>
              <p className="text-sm">Teste o webhook para ver os resultados aqui</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-md border-l-4 ${
                    log.success
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {log.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {log.timestamp.toLocaleString()}
                          </span>
                          {log.responseTime && (
                            <span className="text-muted-foreground text-xs">
                              {log.responseTime}ms
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1 break-all">{log.message}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          URL: {log.url}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentação e Dicas */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas e Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Como funciona</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• O webhook é chamado para cada entrega registrada</li>
                <li>• Também é usado para confirmações de retirada</li>
                <li>• Lembretes automáticos também usam este webhook</li>
                <li>• O sistema tenta o webhook direto primeiro</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Solução de Problemas</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Verifique se a URL está acessível publicamente</li>
                <li>• Teste a conectividade usando o botão "Testar"</li>
                <li>• Webhook deve responder com status 200</li>
                <li>• Consulte os logs para detalhes de erros</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">URL Atual Ativa</h4>
            <p className="text-sm text-blue-800 break-all font-mono">
              {getGlobalWebhookUrl()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Super Admin</h1>
          <p className="text-sm md:text-base text-muted-foreground">Controle total do sistema EntregasZap</p>
        </div>
        <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={onBack}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Fixed navigation without horizontal scrolling - responsive grid layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pb-2 mb-2">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'condominios', label: 'Condomínios' },
          { key: 'funcionarios', label: 'Funcionários' },
          { key: 'entregas', label: 'Entregas' },
          { key: 'webhooks', label: 'Webhooks' },
          { key: 'branding', label: 'Marca' },
          { key: 'relatorios', label: 'Relatórios' },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={currentView === tab.key ? "default" : "outline"}
            onClick={() => {
              console.log('🎯 SUPER ADMIN BUTTON CLICKED:', tab.key);
              setCurrentView(tab.key as any);
            }}
            className="text-sm md:text-base py-2 h-auto whitespace-normal break-words text-center"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 md:mt-6">
        {currentView === 'overview' && renderOverview()}
        {currentView === 'condominios' && renderCondominios()}
        {currentView === 'funcionarios' && renderFuncionarios()}
        {currentView === 'entregas' && renderEntregas()}
        {currentView === 'webhooks' && renderWebhooks()}
        {currentView === 'branding' && renderBranding()}
        {currentView === 'relatorios' && renderRelatorios()}
      </div>

      {/* Dialog para criar/editar condomínio */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setEditingCondominio(null);
          setCondominioFormData({
            nome: '',
            endereco: '',
            cidade: '',
            cep: '',
            telefone: '',
            webhook_url: '',
            estado: '',
            email: '',
            cnpj: '',
            sindico_nome: '',
            sindico_cpf: '',
            sindico_senha: '',
            sindico_telefone: ''
          });
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCondominio ? 'Editar Condomínio' : 'Novo Condomínio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCondominioSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={condominioFormData.nome}
                onChange={(e) => setCondominioFormData({ ...condominioFormData, nome: e.target.value })}
                placeholder="Nome do Condomínio"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={condominioFormData.endereco}
                onChange={(e) => setCondominioFormData({ ...condominioFormData, endereco: e.target.value })}
                placeholder="Rua, número, bairro"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={condominioFormData.cidade}
                  onChange={(e) => setCondominioFormData({ ...condominioFormData, cidade: e.target.value })}
                  placeholder="Cidade"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={condominioFormData.estado}
                  onChange={(e) => setCondominioFormData({ ...condominioFormData, estado: e.target.value.toUpperCase() })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={condominioFormData.cep}
                  onChange={(e) => setCondominioFormData({ ...condominioFormData, cep: e.target.value })}
                  placeholder="00000-000"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={condominioFormData.telefone}
                  onChange={(e) => setCondominioFormData({ ...condominioFormData, telefone: e.target.value })}
                  placeholder="(DD) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={condominioFormData.email}
                  onChange={(e) => setCondominioFormData({ ...condominioFormData, email: e.target.value })}
                  placeholder="contato@condominio.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
              <Input
                id="cnpj"
                value={condominioFormData.cnpj}
                onChange={(e) => setCondominioFormData({ ...condominioFormData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook_url">WhatsApp Webhook (Opcional)</Label>
              <Input
                id="webhook_url"
                value={condominioFormData.webhook_url}
                onChange={(e) => setCondominioFormData({ ...condominioFormData, webhook_url: e.target.value })}
                placeholder="https://webhook.exemplo.com/whatsapp"
              />
              <p className="text-sm text-gray-500">
                Se preenchido, este webhook será usado para WhatsApp deste condomínio.
                Caso contrário, será usado o webhook global.
              </p>
            </div>

            {/* Seção do Síndico */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Dados do Síndico (Administrador)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sindico_nome">Nome do Síndico</Label>
                  <Input
                    id="sindico_nome"
                    value={condominioFormData.sindico_nome}
                    onChange={(e) => setCondominioFormData({ ...condominioFormData, sindico_nome: e.target.value })}
                    placeholder="Nome completo do síndico"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sindico_telefone">Telefone do Síndico</Label>
                  <Input
                    id="sindico_telefone"
                    value={condominioFormData.sindico_telefone}
                    onChange={(e) => setCondominioFormData({ ...condominioFormData, sindico_telefone: e.target.value })}
                    placeholder="(DD) 99999-9999"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="sindico_cpf">CPF do Síndico</Label>
                  <Input
                    id="sindico_cpf"
                    value={condominioFormData.sindico_cpf}
                    onChange={(e) => setCondominioFormData({ ...condominioFormData, sindico_cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sindico_senha">Senha do Síndico</Label>
                  <Input
                    id="sindico_senha"
                    type="password"
                    value={condominioFormData.sindico_senha}
                    onChange={(e) => setCondominioFormData({ ...condominioFormData, sindico_senha: e.target.value })}
                    placeholder="Senha para acesso ao sistema"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                O síndico poderá fazer login no sistema usando CPF e senha para gerenciar seu condomínio.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setEditingCondominio(null);
                setCondominioFormData({
                  nome: '',
                  endereco: '',
                  cidade: '',
                  cep: '',
                  telefone: '',
                  webhook_url: '',
                  estado: '',
                  email: '',
                  cnpj: '',
                  sindico_nome: '',
                  sindico_cpf: '',
                  sindico_senha: '',
                  sindico_telefone: ''
                });
              }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingCondominio}>
                {isSubmittingCondominio ? 'Salvando...' : (editingCondominio ? 'Atualizar' : 'Cadastrar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};