import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

interface MoradorImport {
  nome: string;
  apartamento: string;
  bloco?: string;
  telefone: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

interface BulkResidentUploadProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const BulkResidentUpload = ({ onBack, onSuccess }: BulkResidentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<MoradorImport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Gerar e baixar modelo Excel/CSV
  const downloadTemplate = () => {
    const headers = ['nome', 'apartamento', 'bloco', 'telefone'];
    const csvContent = [
      headers.join(';'),
      'João Silva;101;A;(11) 99999-1111',
      'Maria Santos;102;A;(11) 99999-2222',
      'Pedro Oliveira;201;B;(11) 99999-3333'
    ].join('\r\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_moradores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Modelo baixado!",
      description: "Preencha o arquivo CSV e faça o upload",
    });
  };

  // Processar arquivo CSV/Excel
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Arquivo deve ter pelo menos 1 linha de dados além do cabeçalho');
      }

      // Processar cabeçalho
      const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
      console.log('📋 Cabeçalhos encontrados:', headers);

      // Validar cabeçalhos obrigatórios
      const requiredFields = ['nome', 'apartamento', 'telefone'];
      const missingFields = requiredFields.filter(field => 
        !headers.some(header => header.toLowerCase().includes(field.toLowerCase()))
      );

      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      }

      // Processar dados
      const data: MoradorImport[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(';').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length < 3) {
          console.warn(`Linha ${i + 1} ignorada - poucos campos:`, line);
          continue;
        }

        const morador: MoradorImport = {
          nome: values[0] || '',
          apartamento: values[1] || '',
          bloco: values[2] || '',
          telefone: values[3] || '',
          status: 'pending'
        };

        // Validações básicas
        if (!morador.nome.trim()) {
          morador.status = 'error';
          morador.error = 'Nome é obrigatório';
        } else if (!morador.apartamento.trim()) {
          morador.status = 'error';
          morador.error = 'Apartamento é obrigatório';
        } else if (!morador.telefone.trim()) {
          morador.status = 'error';
          morador.error = 'Telefone é obrigatório';
        }

        data.push(morador);
      }

      setPreviewData(data);
      console.log('📦 Dados processados:', data.length, 'moradores');

    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      toast({
        variant: "destructive",
        title: "Erro no arquivo",
        description: error instanceof Error ? error.message : "Erro ao processar arquivo"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload para Supabase
  const handleUpload = async () => {
    if (!user?.funcionario?.condominio_id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado"
      });
      return;
    }

    const validMoradores = previewData.filter(m => m.status !== 'error');
    if (validMoradores.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum dado válido",
        description: "Corrija os erros antes de continuar"
      });
      return;
    }

    setIsUploading(true);
    try {
      console.log('📤 Iniciando upload de', validMoradores.length, 'moradores');

      const moradoresParaInserir = validMoradores.map(m => ({
        nome: m.nome.trim(),
        apartamento: m.apartamento.trim(),
        bloco: m.bloco?.trim() || null,
        telefone: m.telefone.trim(),
        condominio_id: user.funcionario.condominio_id,
        ativo: true
      }));

      const { data, error } = await supabase
        .from('moradores')
        .insert(moradoresParaInserir)
        .select();

      if (error) throw error;

      console.log('✅ Upload concluído:', data?.length, 'moradores inseridos');
      
      toast({
        title: "Upload concluído!",
        description: `${data?.length || 0} moradores cadastrados com sucesso`,
      });

      // Atualizar status
      setPreviewData(prev => prev.map(m => 
        m.status !== 'error' ? { ...m, status: 'success' as const } : m
      ));

      // Aguardar um pouco e voltar
      setTimeout(() => {
        onSuccess();
        onBack();
      }, 2000);

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro ao salvar dados"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const clearData = () => {
    setFile(null);
    setPreviewData([]);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-2 sm:mb-0 w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Cadastro em Lote - Moradores
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Importe vários moradores de uma vez usando Excel/CSV
          </p>
        </div>
      </div>

      {/* Instruções e Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Passo 1: Baixar Modelo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Baixe o modelo CSV, preencha com os dados dos moradores e faça o upload
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo CSV
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Campos obrigatórios:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>nome</strong>: Nome completo do morador</li>
              <li>• <strong>apartamento</strong>: Número do apartamento (ex: 101, 1905)</li>
              <li>• <strong>telefone</strong>: Telefone com DDD (ex: (11) 99999-1111)</li>
              <li>• <strong>bloco</strong>: Bloco/Torre (opcional, ex: A, B, Torre 1)</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">🤖 Automação N8N:</h4>
            <p className="text-sm text-green-800">
              Para automação via N8N, use a API do Supabase diretamente na tabela <code>moradores</code> 
              com o <code>condominio_id</code>: <strong>{user?.funcionario?.condominio_id}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Passo 2: Upload do Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Selecionar arquivo CSV</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="mt-1"
              />
            </div>
            
            {isProcessing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Processando arquivo...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview dos Dados */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Passo 3: Revisar e Confirmar ({previewData.length} registros)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearData} size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || previewData.every(m => m.status === 'error')}
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Confirmar Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Apartamento</TableHead>
                    <TableHead>Bloco</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((morador, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={getStatusVariant(morador.status || 'pending')}>
                          {getStatusIcon(morador.status || 'pending')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{morador.nome}</TableCell>
                      <TableCell>{morador.apartamento}</TableCell>
                      <TableCell>{morador.bloco || '-'}</TableCell>
                      <TableCell>{morador.telefone}</TableCell>
                      <TableCell className="text-sm">
                        {morador.error ? (
                          <span className="text-red-600">{morador.error}</span>
                        ) : morador.status === 'success' ? (
                          <span className="text-green-600">Salvo com sucesso</span>
                        ) : (
                          <span className="text-gray-500">Pronto para salvar</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};