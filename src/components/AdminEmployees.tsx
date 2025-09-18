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
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth'; // Importar useAuth

interface Funcionario {
  id: string;
  cpf: string;
  nome: string;
  senha: string;
  cargo: string;
  ativo: boolean;
  condominio_id: string;
  created_at: string;
}

interface Condominio {
  id: string;
  nome: string;
}

export const AdminEmployees = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const { toast } = useToast();
  const { user } = useAuth(); // Obter usuário logado
  const [userCondominioId, setUserCondominioId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    senha: '',
    cargo: 'porteiro',
    condominio_id: '',
    ativo: true
  });

  useEffect(() => {
    const condoId = user?.funcionario?.condominio_id;
    if (condoId) {
      setUserCondominioId(condoId);
      loadData(condoId);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async (condominioId: string) => {
    try {
      setIsLoading(true);

      // Carregar funcionários do condomínio
      const { data: funcionariosData, error: funcError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('condominio_id', condominioId) // Filtrar por condominioId
        .order('nome');

      if (funcError) throw funcError;

      // Carregar condomínios (apenas o do usuário logado)
      const { data: condominiosData, error: condError } = await supabase
        .from('condominios')
        .select('id, nome')
        .eq('id', condominioId) // Filtrar por condominioId
        .order('nome');

      if (condError) throw condError;

      setFuncionarios(funcionariosData || []);
      setCondominios(condominiosData || []);

      // Preencher condominio_id no formulário se for um novo funcionário
      if (!editingFuncionario) {
        setFormData(prev => ({ ...prev, condominio_id: condominioId }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar funcionários."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Garantir que o condominio_id está preenchido corretamente
    const finalCondominioId = formData.condominio_id || userCondominioId;
    if (!finalCondominioId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Condomínio não especificado para o funcionário."
      });
      return;
    }

    try {
      if (editingFuncionario) {
        // Atualizar funcionário existente
        const { error } = await supabase
          .from('funcionarios')
          .update({
            cpf: formData.cpf,
            nome: formData.nome,
            senha: formData.senha,
            cargo: formData.cargo,
            condominio_id: finalCondominioId, // Usar o ID final
            ativo: formData.ativo
          })
          .eq('id', editingFuncionario.id)
          .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Funcionário atualizado com sucesso."
        });
      } else {
        // Criar novo funcionário
        const { error } = await supabase
          .from('funcionarios')
          .insert([{
            cpf: formData.cpf,
            nome: formData.nome,
            senha: formData.senha,
            cargo: formData.cargo,
            condominio_id: finalCondominioId, // Usar o ID final
            ativo: formData.ativo
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Funcionário cadastrado com sucesso."
        });
      }

      setIsDialogOpen(false);
      resetForm();
      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao salvar funcionário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao salvar funcionário."
      });
    }
  };

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setFormData({
      cpf: funcionario.cpf,
      nome: funcionario.nome,
      senha: funcionario.senha,
      cargo: funcionario.cargo,
      condominio_id: funcionario.condominio_id,
      ativo: funcionario.ativo
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id)
        .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Funcionário excluído com sucesso."
      });

      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao excluir funcionário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao excluir funcionário."
      });
    }
  };

  const handleToggleStatus = async (funcionario: Funcionario) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: !funcionario.ativo })
        .eq('id', funcionario.id)
        .eq('condominio_id', userCondominioId); // Adicionar filtro de segurança

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Funcionário ${funcionario.ativo ? 'desativado' : 'ativado'} com sucesso.`
      });

      if (userCondominioId) {
        loadData(userCondominioId); // Recarregar dados após a operação
      }

    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao alterar status."
      });
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      cpf: '',
      nome: '',
      senha: '',
      cargo: 'porteiro',
      condominio_id: userCondominioId || '', // Definir para o ID do condomínio do usuário logado
      ativo: true
    }));
    setEditingFuncionario(null);
  };

  const filteredFuncionarios = funcionarios.filter(funcionario =>
    funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    funcionario.cpf.includes(searchTerm) ||
    funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCondominioNome = (condominioId: string) => {
    return condominios.find(c => c.id === condominioId)?.nome || 'N/A';
  };

  if (isLoading || !userCondominioId) {
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciamento de Funcionários</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Cadastre e gerencie os funcionários do condomínio
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setEditingFuncionario(null);
          setIsDialogOpen(true);
        }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="text-sm sm:text-base">Novo Funcionário</span>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar funcionários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm h-10 text-base"
        />
      </div>

      {/* Instruction */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-base text-blue-700">
          💡 Clique em qualquer funcionário para editar suas informações diretamente.
        </p>
      </div>

      {/* Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg sm:text-xl">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
            Funcionários ({filteredFuncionarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Mobile View - Cards */}
          <div className="block md:hidden space-y-3">
            {filteredFuncionarios.map((funcionario) => (
              <div 
                key={funcionario.id}
                className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-primary/30"
                onClick={() => handleEdit(funcionario)}
                title="Clique para editar este funcionário"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900">{funcionario.nome}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-sm">
                        {funcionario.cargo}
                      </Badge>
                      <Badge variant={funcionario.ativo ? "default" : "secondary"} className="text-sm">
                        {funcionario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">Toque para editar</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-600 font-mono">
                    {funcionario.cpf}
                  </div>
                  
                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(funcionario);
                      }}
                    >
                      {funcionario.ativo ? (
                        <UserX className="h-4 w-4 text-red-600" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(funcionario.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Nome</TableHead>
                  <TableHead className="text-base">CPF</TableHead>
                  <TableHead className="text-base">Cargo</TableHead>
                  <TableHead className="text-base">Condomínio</TableHead>
                  <TableHead className="text-base">Status</TableHead>
                  <TableHead className="text-base">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.map((funcionario) => (
                  <TableRow 
                    key={funcionario.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleEdit(funcionario)}
                    title="Clique para editar este funcionário"
                  >
                    <TableCell className="font-medium text-base">{funcionario.nome}</TableCell>
                    <TableCell className="font-mono text-base">{funcionario.cpf}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-base">
                        {funcionario.cargo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-base">{getCondominioNome(funcionario.condominio_id)}</TableCell>
                    <TableCell>
                      <Badge variant={funcionario.ativo ? "default" : "secondary"} className="text-base">
                        {funcionario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(funcionario);
                          }}
                        >
                          {funcionario.ativo ? (
                            <UserX className="h-4 w-4 text-red-600" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(funcionario);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(funcionario.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredFuncionarios.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-base text-gray-500">Nenhum funcionário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-base">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
                className="text-base h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome" className="text-base">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo do funcionário"
                required
                className="text-base h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-base">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="Senha de acesso"
                required
                className="text-base h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo" className="text-base">Cargo</Label>
              <Select value={formData.cargo} onValueChange={(value) => setFormData({ ...formData, cargo: value })}>
                <SelectTrigger id="cargo" className="text-base h-10">
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="porteiro">Porteiro</SelectItem>
                  <SelectItem value="zelador">Zelador</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="sindico">Síndico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condominio_id" className="text-base">Condomínio</Label>
              <Select 
                value={formData.condominio_id} 
                onValueChange={(value) => setFormData({ ...formData, condominio_id: value })}
                disabled={!!userCondominioId} // Desabilitar se usuário já tem condomínio
              >
                <SelectTrigger id="condominio_id" className="text-base h-10">
                  <SelectValue placeholder="Selecione um condomínio" />
                </SelectTrigger>
                <SelectContent>
                  {condominios.map((condominio) => (
                    <SelectItem key={condominio.id} value={condominio.id}>
                      {condominio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="rounded h-5 w-5"
              />
              <Label htmlFor="ativo" className="text-base">Funcionário Ativo</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-base h-10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="text-base h-10">
                {editingFuncionario ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

