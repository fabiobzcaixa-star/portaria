// Script de teste para verificar o webhook
const testWebhook = async () => {
  console.log('🔄 Testando webhook...');
  
  const testPayload = {
    to: '5511999999999',
    message: '🏢 *Condomínio Teste*\n\n📦 *Nova Encomenda Chegou!*\n\nTeste de webhook...',
    type: 'delivery',
    deliveryData: {
      codigo: '12345',
      morador: 'João Teste',
      apartamento: '1905',
      bloco: 'A',
      observacoes: 'Teste de webhook',
      foto_url: 'https://via.placeholder.com/400x300/4f46e5/ffffff?text=Teste',
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      condominio: 'Condomínio Teste'
    }
  };
  
  console.log('📤 Payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const response = await fetch('https://webhook.fbzia.com.br/webhook/portariainteligente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sucesso! Resposta:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Erro:', errorText);
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
  }
};

// Se está sendo executado no browser
if (typeof window !== 'undefined') {
  window.testWebhook = testWebhook;
  console.log('🌐 Execute: testWebhook() no console do browser');
} else {
  // Se está sendo executado no Node.js
  testWebhook();
}
