import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Search,
  User
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import type { Tables } from '../integrations/supabase/types';

type Condominio = Tables<'condominios'>;

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
}

export const AdminCondominiums = () => {
  console.log('🔥🔥🔥 AdminCondominiums COMPONENT RENDERED 🔥🔥🔥');
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [administradores, setAdministradores] = useState<Funcionario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondominio, setEditingCondominio] = useState<Condominio | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [userCondominioId, setUserCondominioId] = useState<string | null>(null);

  console.log('AdminCondominiums: Início. User:', user, 'User Condominio ID:', userCondominioId);

  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    cidade: '',
    cep: '',
    telefone: '',
    sindico_id: '',
    webhook_url: ''
  });

  useEffect(() => {
    const dataCargo = user?.funcionario?.cargo;
    const dataCondoId = user?.funcionario?.condominio_id || null;
    setUserCondominioId(dataCondoId);
    if ((dataCargo === 'administrador' || dataCargo === 'sindico') && dataCondoId) {
      loadData(dataCondoId, dataCargo);
    } else if (dataCargo === 'super_administrador') {
      loadData(null, dataCargo);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async (condominioId: string | null, userRole: string) => {
    console.log('loadData: Iniciando carregamento de dados para condominioId:', condominioId, 'userRole:', userRole);
    try {
      setIsLoading(true);

      let query = supabase.from('condominios').select('*').order('nome');
      // Só aplica filtro se for administrador E tiver um ID válido
      if (userRole === 'administrador' && condominioId && condominioId !== 'undefined') {
        query = query.eq('id', condominioId);
      }
      console.log('loadData: Executando consulta de condomínios.');
      const { data: condominiosData, error: condError } = await query;
      console.log('loadData: Resultado consulta condomínios:', { condominiosData, condError });
      if (condError) throw condError;

      console.log('loadData: Executando consulta de administradores.');
      const { data: administradoresData, error: adminError } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo')
        .eq('cargo', 'administrador')
        .order('nome');
      console.log('loadData: Resultado consulta administradores:', { administradoresData, adminError });
      if (adminError) throw adminError;

      setCondominios((condominiosData || []).map(c => ({ ...c, sindico_id: null })));
      setAdministradores(administradoresData || []);

    } catch (error) {
      console.error('Erro ao carregar dados em loadData:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar condomínios."
      });
    } finally {
      setIsLoading(false);
      console.log('loadData: setIsLoading(false) executado.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔥🔥🔥 handleSubmit DEFINITIVAMENTE CALLED 🔥🔥🔥');
    console.log('🔥 Event:', e);
    console.log('🔥 Event type:', e.type);
    console.log('🔥 FormData:', formData);
    e.preventDefault();
    console.log('🔥 preventDefault called');

    if (isSubmitting) {
      console.log('🔴 Already submitting, exiting');
      return;
    }

    console.log('🟡 Setting isSubmitting to true');
    setIsSubmitting(true);

    try {
      console.log('🟡 Inside try block');
      if (editingCondominio) {
        console.log('🟡 Editing existing condominio:', editingCondominio.id);
        const updateData = {
          nome: formData.nome,
          endereco: formData.endereco,
          cidade: formData.cidade,
          cep: formData.cep,
          telefone: formData.telefone || null,
          webhook_url: formData.webhook_url || null
        };
        const { error } = await supabase
          .from('condominios')
          .update(updateData)
          .eq('id', editingCondominio.id);
        if (error) {
          console.log('🔴 Update error:', error);
          throw error;
        }
        console.log('🟢 Update successful');
        toast({ title: "Sucesso", description: "Condomínio atualizado com sucesso." });
      } else {
        console.log('🟡 Creating new condominio');
        // Criar condomínio diretamente na tabela (mais simples que RPC)
        const insertData = {
          nome: formData.nome,
          endereco: formData.endereco,
          cidade: formData.cidade,
          cep: formData.cep,
          telefone: formData.telefone || null,
          webhook_url: formData.webhook_url || null
        };

        const { data, error } = await supabase
          .from('condominios')
          .insert(insertData)
          .select();

        if (error) {
          console.log('🔴 Insert error:', error);
          throw error;
        }

        console.log('🟢 Insert successful:', data);
        toast({ title: "Sucesso", description: "Condomínio cadastrado com sucesso." });
      }
      
      setIsDialogOpen(false);
      resetForm();

      const dataCargo = user?.funcionario?.cargo || 'administrador';
      const dataCondoId = user?.funcionario?.condominio_id || userCondominioId;

      // Só chama loadData se tiver um ID válido ou for super admin
      if (dataCargo === 'super_administrador' || dataCondoId) {
        loadData(dataCondoId, dataCargo);
      }
      
    } catch (error: unknown) {
      console.error('Erro ao salvar condomínio:', error);
      const errorMessage = error instanceof Error ? error.message : "Falha ao salvar condomínio.";
      toast({
        variant: "destructive",
        title: "Erro",
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (condominio: Condominio) => {
    console.log('✏️ Clicou em Editar condomínio:', condominio.nome);
    setEditingCondominio(condominio);
    setFormData({
      nome: condominio.nome,
      endereco: condominio.endereco,
      cidade: condominio.cidade,
      cep: condominio.cep,
      telefone: condominio.telefone || '',
      sindico_id: condominio.sindico_id || '',
      webhook_url: condominio.webhook_url || ''
    });
    console.log('🔵 Abrindo dialog para edição');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este condomínio?')) return;
    try {
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Condomínio excluído com sucesso." });

      const dataCargo = user?.funcionario?.cargo || 'administrador';
      const dataCondoId = user?.funcionario?.condominio_id || userCondominioId;

      // Só chama loadData se tiver um ID válido ou for super admin
      if (dataCargo === 'super_administrador' || dataCondoId) {
        loadData(dataCondoId, dataCargo);
      }
    } catch (error: unknown) {
      console.error('Erro ao excluir condomínio:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao excluir condomínio."
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      cidade: '',
      cep: '',
      telefone: '',
      sindico_id: '',
      webhook_url: ''
    });
    setEditingCondominio(null);
    setIsSubmitting(false);
  };

  const filteredCondominios = condominios.filter(condominio =>
    condominio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    condominio.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    condominio.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSindicoNome = (sindicoId: string | null) => {
    return administradores.find(admin => admin.id === sindicoId)?.nome || 'Não Atribuído';
  };

  if (isLoading || !user?.funcionario?.id) {
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Condomínios</h2>
          <p className="text-gray-600">
            Gerencie os condomínios na plataforma
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              console.log('➕ Clicou em Novo Condomínio!');
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Condomínio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingCondominio ? 'Editar Condomínio' : 'Novo Condomínio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              console.log('🔥 FORM onSubmit triggered');
              handleSubmit(e);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do Condomínio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(DD) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_url">WhatsApp Webhook (Opcional)</Label>
                <Input
                  id="webhook_url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://webhook.exemplo.com/whatsapp (deixe vazio para usar o global)"
                />
                <p className="text-sm text-gray-500">
                  Se preenchido, este webhook será usado para envios do WhatsApp deste condomínio.
                  Caso contrário, será usado o webhook global configurado pelo Super Admin.
                </p>
              </div>
              {user && user.funcionario.cargo === 'super_administrador' && (
                <div className="space-y-2">
                  <Label htmlFor="sindico">Síndico (Administrador)</Label>
                  <Select
                    value={formData.sindico_id}
                    onValueChange={(value) => setFormData({ ...formData, sindico_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar Síndico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não Atribuído</SelectItem>
                      {administradores.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    console.log('🧪 TEST BUTTON CLICKED - FormData:', formData);
                    handleSubmit(new Event('submit') as any);
                  }}
                  className="mr-2"
                >
                  🧪 TESTE
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => console.log('🟡 Submit button clicked')}
                >
                  {isSubmitting ? 'Salvando...' : editingCondominio ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar condomínios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Condomínios ({filteredCondominios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Síndico</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCondominios.map((condominio) => (
                <TableRow key={condominio.id}>
                  <TableCell className="font-medium">{condominio.nome}</TableCell>
                  <TableCell>{condominio.endereco}, {condominio.cidade} - {condominio.cep}</TableCell>
                  <TableCell>{condominio.telefone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <User className="h-3 w-3 mr-1" />
                      {getSindicoNome(condominio.sindico_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(condominio)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(condominio.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
