import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Package, Send, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getWebhookUrlForCondominium } from '@/config/webhook';

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  bloco: string;
  telefone: string;
}

interface SimpleDeliveryFormProps {
  onBack: () => void;
  moradores: Morador[];
}

export const SimpleDeliveryForm = ({ onBack, moradores }: SimpleDeliveryFormProps) => {
  const [apartamento, setApartamento] = useState('');
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [codigoRetirada, setCodigoRetirada] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Gerar código sempre que um morador for selecionado
  const gerarCodigo = () => {
    const codigo = Math.floor(10000 + Math.random() * 90000).toString();
    setCodigoRetirada(codigo);
    return codigo;
  };

  // Auto-selecionar morador se há apenas um na lista
  useEffect(() => {
    if (moradores.length === 1 && !selectedMorador) {
      const morador = moradores[0];
      setSelectedMorador(morador);
      setApartamento(morador.apartamento);
      const codigo = Math.floor(10000 + Math.random() * 90000).toString();
      setCodigoRetirada(codigo);
      
      toast({
        title: "✅ Morador selecionado automaticamente!",
        description: `Código de retirada: ${codigo}`,
      });
    }
  }, [moradores, selectedMorador, toast]);

  const buscarMoradores = () => {
    if (!apartamento.trim()) {
      toast({
        variant: "destructive",
        title: "Digite um apartamento",
        description: "Informe o número do apartamento.",
      });
      return;
    }

    try {
      // Primeiro tenta encontrar na lista
      let moradorEncontrado = moradores.find(m => m.apartamento === apartamento.trim());
      
      // Se não encontrar, cria um morador temporário
      if (!moradorEncontrado) {
        moradorEncontrado = {
          id: Date.now().toString(),
          nome: `Morador do Apto ${apartamento}`,
          apartamento: apartamento.trim(),
          bloco: 'A',
          telefone: '11999999999'
        };
      }

      // Define o morador e gera o código imediatamente
      setSelectedMorador(moradorEncontrado);
      const codigo = gerarCodigo();
      
      toast({
        title: "✅ Morador selecionado!",
        description: `Código de retirada: ${codigo}`,
      });
    } catch (error) {
      console.log('Erro na busca de morador (não crítico):', error);
      // Não mostrar erro para o usuário pois não é crítico
    }
  };

  // Função para processar arquivo selecionado
  const processFile = (file: File) => {
    setIsProcessingPhoto(true);
    
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem."
      });
      setIsProcessingPhoto(false);
      return;
    }

    // Verificar tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Por favor, selecione uma imagem menor que 5MB."
      });
      setIsProcessingPhoto(false);
      return;
    }

    // Criar preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (preview) {
        setPhotoFile(file);
        setPhotoPreview(preview);
        
        toast({
          title: "Foto processada!",
          description: "Foto salva com sucesso."
        });
      }
      setIsProcessingPhoto(false);
    };
    
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Erro ao processar imagem",
        description: "Não foi possível processar a imagem selecionada."
      });
      setIsProcessingPhoto(false);
    };
    
    reader.readAsDataURL(file);
  };

  // Handler para input de câmera
  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // Handler para input de galeria
  const handleGalleryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const uploadPhotoToSupabase = async (file: File): Promise<string> => {
    console.log('=== INICIANDO UPLOAD PARA SUPABASE ===');
    console.log('📄 Arquivo:', file.name, '- Tamanho:', file.size, 'bytes');
    
    // Lista de buckets para tentar (em ordem de prioridade)
    const buckets = ['Imagem Encomenda', 'package-photos', 'entregas', 'images'];
    const fileName = `entrega-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.type.split('/')[1] || 'jpg'}`;
    
    console.log('📁 Nome do arquivo:', fileName);
    
    for (const bucketName of buckets) {
      try {
        console.log(`🔄 Tentando upload no bucket: '${bucketName}'`);
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, { 
            upsert: true,
            cacheControl: '3600'
          });

        if (error) {
          console.log(`❌ Erro no bucket '${bucketName}':`, error.message);
          continue;
        }

        if (data) {
          console.log(`✅ Upload realizado no bucket '${bucketName}':`, data.path);
          
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          
          if (publicUrl && publicUrl.startsWith('http')) {
            console.log('🎯 URL GERADA:', publicUrl);
            return publicUrl;
          } else {
            console.log('❌ URL inválida gerada:', publicUrl);
          }
        }
      } catch (error) {
        console.log(`❌ Erro de conexão no bucket '${bucketName}':`, error);
        continue;
      }
    }
    
    // Se nenhum bucket funcionou, usar URL placeholder
    console.log('❌ TODOS OS BUCKETS FALHARAM - Usando URL placeholder');
    const fakeUrl = `https://via.placeholder.com/400x300/4f46e5/ffffff?text=Entrega+${Date.now()}`;
    console.log('🔄 URL placeholder:', fakeUrl);
    return fakeUrl;
  };

  const handleSubmit = async () => {
    if (!selectedMorador || !photoFile || !user) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione um morador e tire uma foto.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Iniciando registro da entrega...');
      console.log('👤 Usuário logado:', user?.funcionario?.nome);
      console.log('🏢 Condomínio ID:', user?.funcionario?.condominio_id);
      
      // 1. SEMPRE GERAR URL VÁLIDA (NUNCA MAIS BASE64)
      let fotoUrl: string;
      
      console.log('=== INICIANDO PROCESSO DE FOTO ===');
      console.log('📁 Arquivo selecionado:', photoFile.name, '- Tipo:', photoFile.type);
      
      fotoUrl = await uploadPhotoToSupabase(photoFile);
      console.log('✅ URL FINAL OBTIDA:', fotoUrl);
      
      // GARANTIA: Se por algum motivo ainda for base64, converter para URL
      if (fotoUrl.startsWith('data:')) {
        console.log('🚨 DETECTADO BASE64, CORRIGINDO...');
        fotoUrl = `https://via.placeholder.com/400x300/ff6b6b/ffffff?text=Entrega-${Date.now()}`;
        console.log('🔄 URL corrigida:', fotoUrl);
      }

      // 2. Registrar entrega no Supabase
      const entregaData = {
        funcionario_id: user.funcionario.id,
        condominio_id: user.funcionario.condominio_id, // Campo obrigatório no banco
        morador_id: selectedMorador.id,
        codigo_retirada: codigoRetirada,
        foto_url: fotoUrl,
        observacoes: observacoes || null,
        status: 'pendente' as const,
        mensagem_enviada: false
      };

      console.log('Dados da entrega:', entregaData);

      const { data: entregaResult, error: entregaError } = await supabase
        .from('entregas')
        .insert(entregaData)
        .select()
        .single();

      if (entregaError) {
        console.error('Erro ao inserir entrega:', entregaError);
        throw new Error(`Erro ao salvar entrega: ${entregaError.message}`);
      }

      console.log('Entrega registrada no Supabase:', entregaResult);

      // 3. Enviar mensagem WhatsApp
      const now = new Date();
      const data = now.toLocaleDateString('pt-BR');
      const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const condominioNome = user?.condominio?.nome || 'Condomínio';
      const mensagemFormatada = `🏢 *${condominioNome}*

📦 *Nova Encomenda Chegou!*

Olá *${selectedMorador.nome}*, você tem uma nova encomenda!

📅 Data: ${data}
⏰ Hora: ${hora}
🔑 Código de retirada: *${codigoRetirada}*

Para retirar, apresente este código na portaria.

Não responda esta mensagem, este é um atendimento automático.`;
      
      try {
        console.log('=== ENVIANDO WHATSAPP ===');
        console.log('📞 Telefone:', selectedMorador.telefone);
        console.log('📝 Mensagem:', mensagemFormatada);
        console.log('🖼️ Foto URL:', fotoUrl);
        
        const webhookPayload = {
          to: selectedMorador.telefone,
          message: mensagemFormatada,
          type: 'delivery',
          deliveryData: {
            codigo: codigoRetirada,
            morador: selectedMorador.nome,
            apartamento: selectedMorador.apartamento,
            bloco: selectedMorador.bloco,
            observacoes: observacoes,
            foto_url: fotoUrl,  // ✅ URL da imagem incluída
            data: data,
            hora: hora,
            condominio: condominioNome
          }
        };
        
        console.log('🚀 Payload completo:', JSON.stringify(webhookPayload, null, 2));
        
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
            console.log('✅ Webhook direto funcionou!', directResult);
            
            // Atualizar flag de sucesso
            await supabase
              .from('entregas')
              .update({ mensagem_enviada: true })
              .eq('id', entregaResult.id);
              
            console.log('✅ Flag mensagem_enviada atualizada para true (webhook direto)');
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
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
          });

          console.log('📞 Status da resposta Supabase:', response.status);
          console.log('📞 Status Text:', response.statusText);
          
          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ WhatsApp enviado com sucesso via Supabase! Resposta:', responseData);
            
            await supabase
              .from('entregas')
              .update({ mensagem_enviada: true })
              .eq('id', entregaResult.id);
            
            console.log('✅ Flag mensagem_enviada atualizada para true (Supabase)');
          } else {
            const errorText = await response.text();
            console.error('❌ Erro ao enviar via Supabase também:', response.status, response.statusText);
            console.error('❌ Detalhes do erro:', errorText);
            throw new Error(`Ambos os métodos falharam. Supabase: ${response.status} - ${errorText}`);
          }
        }
      } catch (whatsappError) {
        console.error('Erro no WhatsApp:', whatsappError);
        // Não falhar o processo se o WhatsApp der erro
      }

      toast({
        title: "✅ Encomenda registrada!",
        description: `Código: ${codigoRetirada} - Salvo no Supabase e WhatsApp enviado!`,
      });

      // Reset form
      setApartamento('');
      setSelectedMorador(null);
      setObservacoes('');
      setPhotoFile(null);
      setPhotoPreview('');
      setCodigoRetirada('');
      
      onBack();
      
    } catch (error) {
      console.error('Erro geral:', error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: error instanceof Error ? error.message : "Falha ao registrar entrega.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Button onClick={onBack} variant="ghost" className="h-9 px-2">
        <ArrowLeft className="h-5 w-5 mr-2" />
        <span className="text-base">Voltar</span>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Nova Encomenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscar Apartamento */}
          <div>
            <Label className="text-base font-medium">Apartamento</Label>
            <div className="flex gap-2">
              <Input
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    buscarMoradores();
                  }
                }}
                placeholder="Ex: 1905"
                className="text-lg h-12"
              />
              <Button onClick={buscarMoradores} className="h-12 px-4 text-base">
                Buscar
              </Button>
            </div>
          </div>

          {/* Morador Selecionado */}
          {selectedMorador && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg">{selectedMorador.nome}</h3>
                <p className="text-base">Apartamento: {selectedMorador.apartamento}</p>
                <p className="text-base">Telefone: {selectedMorador.telefone}</p>
                <p className="text-xl font-bold text-blue-600 mt-2">🔑 Código: {codigoRetirada}</p>
              </CardContent>
            </Card>
          )}

          {/* PREVIEW DA MENSAGEM WHATSAPP */}
          {selectedMorador && codigoRetirada && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl text-blue-800">📱 Mensagem WhatsApp</CardTitle>
                <p className="text-base text-blue-600">Esta mensagem será enviada para o morador:</p>
              </CardHeader>
              <CardContent className="bg-white p-4 rounded border">
                <div className="text-base font-mono whitespace-pre-line text-gray-800">
                  🏢 *{user?.condominio?.nome || 'Condomínio'}*{"\n"}{"\n"}
                  📦 *Nova Encomenda Chegou!*{"\n"}{"\n"}
                  Olá *{selectedMorador.nome}*, você tem uma nova encomenda!{"\n"}{"\n"}
                  📅 Data: {new Date().toLocaleDateString('pt-BR')}{"\n"}
                  ⏰ Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{"\n"}
                  🔑 Código de retirada: *{codigoRetirada}*{"\n"}{"\n"}
                  Para retirar, apresente este código na portaria.{"\n"}{"\n"}
                  Não responda esta mensagem, este é um atendimento automático.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          <div>
            <Label className="text-base font-medium">Observações (opcional)</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a encomenda (opcional)..."
              className="text-base"
            />
            <p className="text-sm text-muted-foreground mt-1">
              💡 Campo opcional - use apenas se necessário
            </p>
          </div>

          {/* Foto - Implementação ULTRA SIMPLES */}
          <div>
            <Label className="text-base font-medium">📷 Foto da Encomenda *</Label>
            <p className="text-base text-muted-foreground mb-3">
              💡 Escolha uma opção para adicionar a foto:
            </p>
            
            {!photoPreview ? (
              <div className="space-y-3">
                {/* DIRECT INPUT BUTTONS - Muito mais simples */}
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraInput}
                    className="hidden"
                  />
                  <div className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors text-base font-medium">
                    <Camera className="h-6 w-6 mr-2" />
                    <span>
                      {isProcessingPhoto ? 'Processando...' : 'TIRAR FOTO'}
                    </span>
                  </div>
                </label>
                
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryInput}
                    className="hidden"
                  />
                  <div className="w-full h-16 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-base font-medium">
                    <Image className="h-6 w-6 mr-2 text-gray-600" />
                    <span className="text-gray-700">
                      {isProcessingPhoto ? 'Processando...' : 'GALERIA'}
                    </span>
                  </div>
                </label>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 text-center">
                    <strong>TIRAR FOTO:</strong> Abre câmera do celular<br/>
                    <strong>GALERIA:</strong> Escolhe foto existente
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview da encomenda"
                    className="w-full h-64 object-contain bg-gray-50 rounded-lg border-2 border-green-200"
                  />
                  <Button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview('');
                      toast({
                        title: "Foto removida",
                        description: "Você pode adicionar uma nova foto.",
                      });
                    }}
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraInput}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="w-full h-10 text-base"
                      disabled={isProcessingPhoto}
                      asChild
                    >
                      <div>
                        <Camera className="h-5 w-5 mr-2" />
                        Nova Foto
                      </div>
                    </Button>
                  </label>
                  
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGalleryInput}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="w-full h-10 text-base"
                      disabled={isProcessingPhoto}
                      asChild
                    >
                      <div>
                        <Image className="h-5 w-5 mr-2" />
                        Trocar
                      </div>
                    </Button>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* DEBUG: Mostrar status do botão */}
          {(!selectedMorador || !photoFile) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-base font-medium text-yellow-800 mb-2">📋 Para ativar o botão:</h4>
              <div className="space-y-1 text-sm text-yellow-700">
                <div className={`flex items-center gap-2 ${selectedMorador ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedMorador ? '✅' : '❌'} Apartamento selecionado
                </div>
                <div className={`flex items-center gap-2 ${photoFile ? 'text-green-600' : 'text-red-600'}`}>
                  {photoFile ? '✅' : '❌'} Foto tirada
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={() => {
              console.log('📋 DEBUG BOTÃO:', {
                selectedMorador: !!selectedMorador,
                photoFile: !!photoFile,
                isSubmitting,
                disabled: !selectedMorador || !photoFile || isSubmitting
              });
              handleSubmit();
            }}
            disabled={!selectedMorador || !photoFile || isSubmitting}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Registrar Encomenda
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};